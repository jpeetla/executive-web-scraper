import { HttpClient } from './http-client';
import { Logger } from '../utils/logger';
import { CrawlerOptions, Executive } from '../types';
import { MAX_DEPTH, MAX_CONCURRENT_REQUESTS } from '../config/constants';
import * as cheerio from 'cheerio';
import { querySerpApi, queryChat } from './query_api';

export class Crawler {
  private httpClient: HttpClient;
  private processedDomains: Set<string> = new Set();
  private options: Required<CrawlerOptions>;

  constructor(options?: CrawlerOptions) {
    this.httpClient = new HttpClient({ timeout: options?.timeout });
    this.options = {
      maxDepth: options?.maxDepth ?? MAX_DEPTH,
      timeout: options?.timeout ?? 10000,
      maxConcurrentRequests: options?.maxConcurrentRequests ?? MAX_CONCURRENT_REQUESTS
    };
  }

  async scrape(company_name: string): Promise<Executive[]> {
    try {
      //STEP #1: Query SERP API + Extract top 3 URLs + Use GPT LLM to check if the page contains executive info
      // const normalizedUrl = UrlUtils.normalizeUrl(url);
      const executivesData: Executive[] = [];
      const urls = await querySerpApi(`${company_name} leadership team OR board of directors OR executive profiles`);
      console.log('Top 3 URLs:', urls);

      for (const url of urls) {
        Logger.info(`Scraping URL: ${url}`);

        const isAllowed = await this.httpClient.checkRobotsTxt(url);
        if (!isAllowed) {
          Logger.warn(`Scraping not allowed for ${url}, skipping...`);
          continue;
        }

        try {
          const jobPageHtml = await this.httpClient.get(url);
          if (jobPageHtml.status >= 400 || jobPageHtml.data === null) {
            Logger.warn(`Skipping URL ${url} due to failed request`);
            continue; 
          }

          const jobPage$ = cheerio.load(jobPageHtml.data);

          const domain = new URL(url).hostname;
          if (!this.processedDomains.has(domain)) {
            this.processedDomains.add(domain);
            const pageContent = jobPage$('body').text().toLowerCase();
            Logger.info(`SUCCESS: Page content for ${url} fetched`);
            const chatResponse = await queryChat(pageContent, url);

            if (chatResponse) {
              for(const executive of chatResponse.executives) {
                console.log(`Name: ${executive.name}, Title: ${executive.title}`);
                const linkedin_serp_results = await querySerpApi(`${executive.name} ${executive.title} LinkedIn`);
                const linkedinUrl = linkedin_serp_results.length > 0 ? linkedin_serp_results[0] : "";

                const executiveObject: Executive = {
                  name: executive.name,
                  title: executive.title,
                  linkedin: linkedinUrl
                };
                const isDuplicate = executivesData.some((existingExecutive) => existingExecutive.linkedin === executiveObject.linkedin);
                if (!isDuplicate) {
                  executivesData.push(executiveObject);
                } else {
                  Logger.warn(`Skipping duplicate executive: ${executive.name}`);
                }
                
              }
            }
          }
        } catch (error) {
          Logger.warn(`Error fetching job page for ${url}:`);
          continue;  
        }
      }

      //STEP #2: Directly query SERP API for executive linkedln info
      if (executivesData.length === 0) {
        const linkedin_urls = await querySerpApi(`${company_name} CEO, CTO, COO, and/or executive team LinkedIn`);
        for (const linkedin_url of linkedin_urls) {
          if (linkedin_url.includes('www.linkedin.com/in/')) {
            const executiveObject: Executive = {
              name: "",
              title: "",
              linkedin: linkedin_url
            };

            const isDuplicate = executivesData.some((existingExecutive) => existingExecutive.linkedin === executiveObject.linkedin);
            if (!isDuplicate) {
              executivesData.push(executiveObject);
            } 
          }
        }
      }

      //STEP #3: Query Apollo API
      if (executivesData.length === 0) {
        
      }
      return executivesData;
    } catch (error) {
      Logger.warn('Error during scraping');
      return [];
    }
  }
} 