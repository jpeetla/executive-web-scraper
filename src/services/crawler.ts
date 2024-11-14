import { HttpClient } from './http-client';
import { Logger } from '../utils/logger';
import { CrawlerOptions, Executive } from '../types';
import { MAX_DEPTH, MAX_CONCURRENT_REQUESTS } from '../config/constants';
import { serp_query_one, serp_query_two, serp_query_three } from '../config/constants';
import { querySerpApi } from './query_api';
import { scrapeURLs } from './webpage_content';

export class Crawler {
  private httpClient: HttpClient;
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
      let scrapedURLs: string[] = [];
      const executivesData: Executive[] = [];

      const checkAndScrapeURLs = async (company_name: string, query: string) => {
        const resulting_urls = await querySerpApi(`${company_name} ${query}`, 3);
        const newURLs = resulting_urls.filter(url => !scrapedURLs.includes(url));
        scrapedURLs.push(...newURLs);
        const executivesFound = await scrapeURLs(newURLs, this.httpClient);
        executivesData.push(...executivesFound);
      };

      await checkAndScrapeURLs(company_name, serp_query_one);

      if (executivesData.length === 0) {
        Logger.info('No executives found in first query, trying second query...');
        await checkAndScrapeURLs(company_name, serp_query_two);
      }

      if (executivesData.length === 0) {
        Logger.info('No executives found in second query, trying third query...');
        await checkAndScrapeURLs(company_name, serp_query_three);
      }

      //STEP #2: Query Apollo API
      // if (executivesData.length === 0) {
      //   console.log("Should que")
      // }
      return executivesData;
    } catch (error) {
      Logger.error('Error scraping company:', error as Error);
      return [];
    }
  }
}