import { HttpClient } from './http-client';
import { Logger } from '../utils/logger';
import { CrawlerOptions, Executive } from '../types';
import { MAX_DEPTH, MAX_CONCURRENT_REQUESTS } from '../config/constants';
import * as cheerio from 'cheerio';
import { querySerpApi, queryChat, findExecutiveLinkedIn, apolloPeopleSearch } from './query_api';

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

  async scrape(company_name: string): Promise<string> {
    try {
      //STEP #1: Query SERP API + Extract top 3 URLs + Use GPT LLM to check if the page contains executive info
      // const normalizedUrl = UrlUtils.normalizeUrl(url);
      const executivesData: Executive[] = [];
      const urls = await querySerpApi(company_name, 'leadership team OR board of directors OR executive profiles');
      console.log('Top 5 URLs:', urls);

      for (const url of urls) {
        const isAllowed = await this.httpClient.checkRobotsTxt(url);
        if (!isAllowed) {
          console.log(`Scraping not allowed for ${url}, skipping...`);
          continue;
        }

        try {
          const jobPageHtml = await this.httpClient.get(url);
          const jobPage$ = cheerio.load(jobPageHtml.data);

          const domain = new URL(url).hostname;
          if (!this.processedDomains.has(domain)) {
            this.processedDomains.add(domain);
            const pageContent = jobPage$('body').text();
            const chatResponse = await queryChat(pageContent, url);

            if (chatResponse) {
              chatResponse.executives.forEach((executive: any) => {
                console.log(`Name: ${executive.name}, Title: ${executive.title}`);
              });

              const executive_linkedin = findExecutiveLinkedIn("Tim Zheng", "Apollo")
              return "";
            }
          }
        } catch (error) {
          console.error(`Error fetching job page for ${url}:`, error);
          continue;  // Skip to the next iteration if an error occurs
        }
      }

      //STEP #2: Directly query SERP API for executive linkedln info
      const linkedin_urls = await querySerpApi(company_name, 'CEO, CTO, COO, and/or executive team LinkedIn');
      
      //STEP #3: Query Apollo API
      //find company domaion w/o www.
      const apollo_linkedin_data = await apolloPeopleSearch(company_name);

      return "";
      
    } catch (error) {
      Logger.error('Error during scraping', error as Error);
      return "";
    }
  }
} 