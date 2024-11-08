import axios, { AxiosInstance, AxiosResponse, AxiosError } from 'axios';
import { Logger } from '../utils/logger';
import { DEFAULT_TIMEOUT, USER_AGENT } from '../config/constants';
import { HttpClientConfig, HttpResponse, HttpError } from '../types';

export class HttpClient {
  private client: AxiosInstance;
  private readonly config: Required<HttpClientConfig>;
  private lastRequestTime: number = 0;
  private static readonly MIN_REQUEST_INTERVAL = 1000; // 1 second between requests

  private readonly defaultHeaders = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5',
    'Connection': 'keep-alive',
  };

  constructor(config: HttpClientConfig = {}) {
    this.config = {
      timeout: config.timeout ?? DEFAULT_TIMEOUT,
      userAgent: config.userAgent ?? USER_AGENT,
      retries: config.retries ?? 3,
      retryDelay: config.retryDelay ?? 1000,
      followRedirects: config.followRedirects ?? true,
      maxRedirects: config.maxRedirects ?? 5
    };

    this.client = axios.create({
      timeout: this.config.timeout,
      maxRedirects: this.config.maxRedirects,
      validateStatus: status => status < 400,
      headers: {
        'User-Agent': this.config.userAgent
      }
    });
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async enforceRateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    if (timeSinceLastRequest < HttpClient.MIN_REQUEST_INTERVAL) {
      await this.delay(HttpClient.MIN_REQUEST_INTERVAL - timeSinceLastRequest);
    }
    this.lastRequestTime = Date.now();
  }

  private async executeWithRetry<T>(
    operation: () => Promise<AxiosResponse<T>>
  ): Promise<HttpResponse<T>> {
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt <= this.config.retries; attempt++) {
      try {
        await this.enforceRateLimit();
        const response = await operation();
        
        return {
          data: response.data,
          status: response.status,
          headers: response.headers as Record<string, string>,
          url: response.config.url!
        };
      } catch (error) {
        lastError = error as Error;
        
        if (error instanceof AxiosError) {
          // Don't retry on client errors (4xx)
          if (error.response?.status && error.response.status >= 400 && error.response.status < 500) {
            Logger.warn(
              `Client error (status ${error.response.status}) for URL ${error.config?.url}. Not retrying.`
            );
            return {
              data: null,
              status: 401, //error.response.status,
              headers: {},
              url: error.config?.url || "",
            };
          }
        }
        
        if (attempt < this.config.retries) {
          const delay = this.config.retryDelay * Math.pow(2, attempt);
          Logger.warn(
            `Request failed, retrying in ${delay}ms (attempt ${attempt + 1}/${this.config.retries}): ${(error as Error).message}`
          );
          await this.delay(delay);
        }
      }
    }
  
    Logger.warn(`Request failed after ${this.config.retries + 1} attempts: ${lastError?.message}`);
    return {
      data: null,
      status: 500,
      headers: {},
      url: "", // Optionally, set this to the last attempted URL
    };
  }

  async get<T = string>(url: string): Promise<HttpResponse<T>> {
    Logger.debug(`Fetching URL: ${url}`);
    const response = await this.executeWithRetry(() =>
      this.client.get<T>(url, {
        timeout: this.config.timeout,
        headers: this.defaultHeaders
      })
    );
  
    if (response.status >= 400) {
      Logger.warn(`Failed to fetch URL: ${url} with status code ${response.status}`);
    }
  
    return response;
  }
  
  

  async checkRobotsTxt(baseUrl: string): Promise<boolean> {
    try {
      const robotsUrl = new URL('/robots.txt', baseUrl).toString();
      const response = await this.get<string>(robotsUrl);
      
      // Parse robots.txt content
      const lines = response.data?.toLowerCase().split('\n') || [];
      const userAgentSection = lines.findIndex(line => 
        line.startsWith('user-agent: *') || 
        line.startsWith(`user-agent: ${this.config.userAgent.toLowerCase()}`)
      );
      
      if (userAgentSection === -1) return true;
      
      // Check for disallow rules in the relevant section
      for (let i = userAgentSection + 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line.startsWith('user-agent:')) break;
        if (line.startsWith('disallow:')) {
          const path = line.split(':')[1].trim();
          if (path === '/' || path === '*') return false;
        }
      }
      
      return true;
    } catch (error) {
      Logger.warn(`Failed to fetch robots.txt from ${baseUrl}: ${(error as Error).message}`);
      // If robots.txt doesn't exist or can't be fetched, assume scraping is allowed
      return true;
    }
  }
} 