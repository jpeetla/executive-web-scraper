import { HttpClient } from './http-client';
import { Logger } from '../utils/logger';
import { ScrapingResult, CrawlerOptions, JobPosting } from '../types';
import { MAX_DEPTH, MAX_CONCURRENT_REQUESTS } from '../config/constants';
import * as cheerio from 'cheerio';
import MetricsLogger from '../utils/metrics-logger';
import { CheerioAPI } from 'cheerio';
import { querySerpApi, queryChat } from './query_api';

export class Crawler {
  private httpClient: HttpClient;
  private visitedUrls: Set<string> = new Set();
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

  async scrape(company_name: string): Promise<ScrapingResult> {
    try {
      //WATERFALL STEP #1

      //Call SERP API to find list of urls
      // const normalizedUrl = UrlUtils.normalizeUrl(url);
      const urls = await querySerpApi(company_name);
      console.log('Top 3 URLs:', urls);

      for (const url of urls) {
        const isAllowed = await this.httpClient.checkRobotsTxt(url);
        if (!isAllowed) {
          console.log(`Scraping not allowed for ${url}, skipping...`);
          continue;
        }
        //extract content from url
        try {
          const jobPageHtml = await this.httpClient.get(url);
          const jobPage$ = cheerio.load(jobPageHtml.data);

          const domain = new URL(url).hostname;
          if (!this.processedDomains.has(domain)) {
            this.processedDomains.add(domain);
            const pageContent = jobPage$('body').text();
            //pass cleaned content to chat
            const hasExecutiveInfo = await queryChat(pageContent, url);

            if (hasExecutiveInfo) {
              //return executive info
              console.log('Found executive info:', hasExecutiveInfo);

              return {
                website: company_name,
                hasJobs: false,
                jobPostings: [],
              };
            }
          }
        } catch (error) {
          console.error(`Error fetching job page for ${url}:`, error);
          continue;  // Skip to the next iteration if an error occurs
        }
      }



      return {
        website: company_name,
        hasJobs: false,
        jobPostings: [],
      };
      
      //Call Apollo API

    } catch (error) {
      Logger.error('Error during scraping', error as Error);
      return {
        website: company_name,
        hasJobs: false,
        jobPostings: [],
        error: (error as Error).message
      };
    }
  }
} 