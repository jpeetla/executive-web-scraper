"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HttpClient = void 0;
const axios_1 = __importStar(require("axios"));
const logger_1 = require("../utils/logger");
const constants_1 = require("../config/constants");
class HttpClient {
    constructor(config = {}) {
        this.lastRequestTime = 0;
        this.defaultHeaders = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Connection': 'keep-alive',
        };
        this.config = {
            timeout: config.timeout ?? constants_1.DEFAULT_TIMEOUT,
            userAgent: config.userAgent ?? constants_1.USER_AGENT,
            retries: config.retries ?? 3,
            retryDelay: config.retryDelay ?? 1000,
            followRedirects: config.followRedirects ?? true,
            maxRedirects: config.maxRedirects ?? 5
        };
        this.client = axios_1.default.create({
            timeout: this.config.timeout,
            maxRedirects: this.config.maxRedirects,
            validateStatus: status => status < 400,
            headers: {
                'User-Agent': this.config.userAgent
            }
        });
    }
    async delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    async enforceRateLimit() {
        const now = Date.now();
        const timeSinceLastRequest = now - this.lastRequestTime;
        if (timeSinceLastRequest < HttpClient.MIN_REQUEST_INTERVAL) {
            await this.delay(HttpClient.MIN_REQUEST_INTERVAL - timeSinceLastRequest);
        }
        this.lastRequestTime = Date.now();
    }
    async executeWithRetry(operation) {
        let lastError = null;
        for (let attempt = 0; attempt <= this.config.retries; attempt++) {
            try {
                await this.enforceRateLimit();
                const response = await operation();
                return {
                    data: response.data,
                    status: response.status,
                    headers: response.headers,
                    url: response.config.url
                };
            }
            catch (error) {
                lastError = error;
                if (error instanceof axios_1.AxiosError) {
                    // Don't retry on client errors (4xx)
                    if (error.response?.status && error.response.status >= 400 && error.response.status < 500) {
                        logger_1.Logger.warn(`Client error (status ${error.response.status}) for URL ${error.config?.url}. Not retrying.`);
                        return {
                            data: null,
                            status: 401,
                            headers: {},
                            url: error.config?.url || "",
                        };
                    }
                }
                if (attempt < this.config.retries) {
                    const delay = this.config.retryDelay * Math.pow(2, attempt);
                    logger_1.Logger.warn(`Request failed, retrying in ${delay}ms (attempt ${attempt + 1}/${this.config.retries}): ${error.message}`);
                    await this.delay(delay);
                }
            }
        }
        logger_1.Logger.warn(`Request failed after ${this.config.retries + 1} attempts: ${lastError?.message}`);
        return {
            data: null,
            status: 500,
            headers: {},
            url: "", // Optionally, set this to the last attempted URL
        };
    }
    async get(url) {
        logger_1.Logger.debug(`Fetching URL: ${url}`);
        const response = await this.executeWithRetry(() => this.client.get(url, {
            timeout: this.config.timeout,
            headers: this.defaultHeaders
        }));
        if (response.status >= 400) {
            logger_1.Logger.warn(`Failed to fetch URL: ${url} with status code ${response.status}`);
        }
        return response;
    }
    async checkRobotsTxt(baseUrl) {
        try {
            const robotsUrl = new URL('/robots.txt', baseUrl).toString();
            const response = await this.get(robotsUrl);
            // Parse robots.txt content
            const lines = response.data?.toLowerCase().split('\n') || [];
            const userAgentSection = lines.findIndex(line => line.startsWith('user-agent: *') ||
                line.startsWith(`user-agent: ${this.config.userAgent.toLowerCase()}`));
            if (userAgentSection === -1)
                return true;
            // Check for disallow rules in the relevant section
            for (let i = userAgentSection + 1; i < lines.length; i++) {
                const line = lines[i].trim();
                if (line.startsWith('user-agent:'))
                    break;
                if (line.startsWith('disallow:')) {
                    const path = line.split(':')[1].trim();
                    if (path === '/' || path === '*')
                        return false;
                }
            }
            return true;
        }
        catch (error) {
            logger_1.Logger.warn(`Failed to fetch robots.txt from ${baseUrl}: ${error.message}`);
            // If robots.txt doesn't exist or can't be fetched, assume scraping is allowed
            return true;
        }
    }
}
exports.HttpClient = HttpClient;
HttpClient.MIN_REQUEST_INTERVAL = 1000; // 1 second between requests
