import { HttpClient } from './http-client';
import { Logger } from '../utils/logger';
import { CrawlerOptions, Executive } from '../types';
import { MAX_DEPTH, MAX_CONCURRENT_REQUESTS } from '../config/constants';
import { serp_query_one, serp_query_two, serp_query_three } from '../config/constants';
import { querySerpApi, queryParaformAPI, queryApolloAPI } from './query_api';
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
    const allowed_domains = [company_name, "cbinsights.com", "theorg.com", "crunchbase.com", "globenewswire.com"];
    return resulting_urls.filter(url => {
      const domain = this.extractDomain(url);
      return allowed_domains.includes(domain) && !scrapedURLs.includes(url)
    });
  }

  async checkAndScrapeURLS(company_name: string, query: string, scrapedURLs: string[]): Promise<string[]> {
    const resulting_urls = await querySerpApi(`${company_name} ${query}`, 4);
    let newURLs = await this.filterUrlsByCompany(resulting_urls, company_name, scrapedURLs);
    return newURLs;
  }

  async scrape(company_name: string): Promise<Executive[]> {
    try {
      company_name = this.extractDomain(company_name);
      let scrapedURLs: string[] = [];
      const executivesData: Executive[] = [];

      const queryA = `${company_name} ${serp_query_one}`;
      const urlsOne = await this.checkAndScrapeURLS(company_name, serp_query_one, scrapedURLs);
      scrapedURLs.push(...urlsOne);

      const queryB = `${serp_query_two} ${company_name}`;
      const urlsTwo = await this.checkAndScrapeURLS(company_name, serp_query_one, scrapedURLs);
      scrapedURLs.push(...urlsTwo);

      const queryC = `${company_name} ${serp_query_three}`;
      const urlsThree = await this.checkAndScrapeURLS(company_name, serp_query_one, scrapedURLs);
      scrapedURLs.push(...urlsThree);
      console.log(scrapeURLs);

      const executivesFound = await scrapeURLs(company_name, scrapedURLs, this.httpClient);
      executivesData.push(...executivesFound);

      const apolloExecutivesFound: Executive[] = [];
      if (executivesData.length < 10) {
        const apolloLeads = await queryApolloAPI(company_name);

      }
      
      const crustExecutivesFound: Executive[] = [];
      if (executivesData.length < 4) {
        const crustLeads = await queryParaformAPI(company_name);
        crustLeads.forEach((lead) => {
          const isDuplicate = executivesData.some((executive) => executive.name === lead.name);
    
          if (!isDuplicate) {
            crustExecutivesFound.push({
              domain: company_name,
              name: lead.name,
              title: lead.title,
              linkedin: lead.linkedin
            });
          }
        });
      }
      console.log(`Data scraped from Crust API: ${crustExecutivesFound}`);
      
      executivesData.push(...crustExecutivesFound);
      return executivesData;
    } catch (error) {
      Logger.error('Error scraping company:', error as Error);
      return [];
    }
  }
}