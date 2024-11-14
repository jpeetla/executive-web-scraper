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
      timeout: options?.timeout ?? 500,
      maxConcurrentRequests: options?.maxConcurrentRequests ?? MAX_CONCURRENT_REQUESTS
    };
  }

  extractDomain(url: string): string {
    const cleanedUrl = url.replace(/^https?:\/\//, '').replace(/^www\./, '');
    return cleanedUrl.split('/')[0];
  }

  async filterUrlsByCompany(resulting_urls: string[], company_name: string, scrapedURLs: string[]): Promise<string[]> {
    const allowed_domains = [company_name, "cbinsights.com", "theorg.com", "crunchbase.com"];
    return resulting_urls.filter(url => {
      const domain = this.extractDomain(url);
      return allowed_domains.includes(domain) && !scrapedURLs.includes(url)
    });
  }

  async scrape(company_name: string): Promise<Executive[]> {
    try {
      company_name = this.extractDomain(company_name);
      console.log("company_name", company_name);
      let scrapedURLs: string[] = [];
      const executivesData: Executive[] = [];

      const checkAndScrapeURLs = async (company_name: string, query: string) => {
        const resulting_urls = await querySerpApi(`${company_name} ${query}`, 4);
        console.log(resulting_urls);  
        let newURLs = await this.filterUrlsByCompany(resulting_urls, company_name, scrapedURLs);
        console.log(newURLs);
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