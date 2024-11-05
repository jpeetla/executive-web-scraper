import { ScrapingResult, CrawlerOptions } from '../types';
export declare class Crawler {
    private httpClient;
    private visitedUrls;
    private processedDomains;
    private options;
    constructor(options?: CrawlerOptions);
    scrape(url: string): Promise<ScrapingResult>;
    private crawl;
    private findPrimaryCareerLink;
    private findJobListingLinks;
    private extractJobContent;
    private findCareerLinks;
    private crawlConcurrently;
    private waitForContent;
}
