import { Crawler } from './crawler';
import { Logger } from '../utils/logger';
import { ScrapingResult } from '../types';
import MetricsLogger from '../utils/metrics-logger';

export async function processWebsites(websites: string[]): Promise<ScrapingResult[]> {
    const results: ScrapingResult[] = [];
    const metricsLogger = MetricsLogger.getInstance();
    
    // Start metrics tracking
    metricsLogger.startScraping();

    for (const website of websites) {
        try {
            const crawler = new Crawler();
            const result = await crawler.scrape(website);
            results.push(result);
        } catch (error) {
            Logger.error(`Failed to process ${website}`, error as Error);
            results.push({
                website,
                hasJobs: false,
                jobPostings: [],
                error: (error as Error).message
            });
        }
    }

    return results;
} 