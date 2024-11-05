import { ScrapingResult, CrawlerOptions } from '../types';
export declare class Crawler {
    private httpClient;
    private visitedUrls;
    private processedDomains;
    private options;
    constructor(options?: CrawlerOptions);
    scrape(company_name: string): Promise<ScrapingResult>;
    private crawl;
}
