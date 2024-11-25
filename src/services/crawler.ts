import { HttpClient } from "./http-client";
import { Logger } from "../utils/logger";
import { CrawlerOptions, Executive } from "../types";
import { MAX_DEPTH, MAX_CONCURRENT_REQUESTS } from "../config/constants";
import {
  serp_query_one,
  serp_query_two,
  serp_query_three,
  serp_query_four,
} from "../config/constants";
import { querySerpApi, queryCrustAPI } from "./query_api";
import { scrapeURLs } from "./extract_webpage";
import { queryChat } from "./query_chat";

export class Crawler {
  private httpClient: HttpClient;
  private options: Required<CrawlerOptions>;

  constructor(options?: CrawlerOptions) {
    this.httpClient = new HttpClient({ timeout: options?.timeout });
    this.options = {
      maxDepth: options?.maxDepth ?? MAX_DEPTH,
      timeout: options?.timeout ?? 500,
      maxConcurrentRequests:
        options?.maxConcurrentRequests ?? MAX_CONCURRENT_REQUESTS,
    };
  }

  extractDomain(url: string): string {
    const cleanedUrl = url.replace(/^https?:\/\//, "").replace(/^www\./, "");
    return cleanedUrl.split("/")[0];
  }

  async filterUrlsByCompany(
    resulting_urls: string[],
    company_name: string,
    scrapedURLs: string[]
  ): Promise<string[]> {
    const allowed_domains = [
      company_name,
      "cbinsights.com",
      "theorg.com",
      "crunchbase.com",
      "globenewswire.com",
    ];
    return resulting_urls.filter((url) => {
      const domain = this.extractDomain(url);
      return allowed_domains.includes(domain) && !scrapedURLs.includes(url);
    });
  }

  async checkAndScrapeURLS(
    company_name: string,
    query: string,
    scrapedURLs: string[]
  ): Promise<string[]> {
    const resulting_urls = await querySerpApi(`${company_name} ${query}`, 3);
    let newURLs = await this.filterUrlsByCompany(
      resulting_urls,
      company_name,
      scrapedURLs
    );
    return newURLs;
  }

  async deDupeAPI(
    company_name: string,
    apiLeads: Executive[],
    existingLeads: Executive[]
  ): Promise<Executive[]> {
    const deDupedLeads: Executive[] = [];

    apiLeads.forEach((lead) => {
      const isDuplicate = existingLeads.some(
        (executive) => executive.name === lead.name
      );
      if (!isDuplicate) {
        deDupedLeads.push({
          domain: company_name,
          name: lead.name,
          title: lead.title,
          linkedin: lead.linkedin,
          source: lead.source,
        });
      }
    });

    return deDupedLeads;
  }

  async scrape(company_name: string): Promise<Executive[]> {
    try {
      company_name = this.extractDomain(company_name);
      let scrapedURLs: string[] = [];
      const executivesData: Executive[] = [];

      // STEP #1: Test various SERP API queries to find relevant URLs
      const urlsOne = await this.checkAndScrapeURLS(
        company_name,
        serp_query_one,
        scrapedURLs
      );
      scrapedURLs.push(...urlsOne);
      const urlsTwo = await this.checkAndScrapeURLS(
        company_name,
        serp_query_two,
        scrapedURLs
      );
      scrapedURLs.push(...urlsTwo);
      const urlsThree = await this.checkAndScrapeURLS(
        company_name,
        serp_query_three,
        scrapedURLs
      );
      scrapedURLs.push(...urlsThree);
      const urlsFour = await this.checkAndScrapeURLS(
        company_name,
        serp_query_four,
        scrapedURLs
      );
      scrapedURLs.push(...urlsFour);

      const executivesFound = await scrapeURLs(
        company_name,
        scrapedURLs,
        this.httpClient
      );
      executivesData.push(...executivesFound);
      Logger.info(`Scraped ${executivesData.length} leads from the web...`);

      // STEP #2: Hit CRUST API in case not enough executives are found
      if (executivesData.length < 5) {
        const rawLeads = await queryCrustAPI(company_name);
        let rawLeadsFound = await this.deDupeAPI(
          company_name,
          rawLeads,
          executivesData
        );
        const leadsString = rawLeadsFound
          .map(
            (lead) =>
              `Name: ${lead.name}\nTitle: ${lead.title}\nLinkedIn: ${lead.linkedin}\n`
          )
          .join("\n");
        const filteredRawParaformLeads = await queryChat(leadsString, "crust");
        Logger.info(
          `Pushing ${filteredRawParaformLeads.length} leads from Paraform...`
        );
        executivesData.push(...filteredRawParaformLeads);
      }

      return executivesData;
    } catch (error) {
      Logger.error("Error scraping company:", error as Error);
      return [];
    }
  }
}
