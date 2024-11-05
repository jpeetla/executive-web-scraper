import { ScrapingResult } from '../types';
import { Logger } from '../utils/logger';
import MetricsLogger from '../utils/metrics-logger';

export function analyzeResults(results: ScrapingResult[]): void {
    const metricsLogger = MetricsLogger.getInstance();
    const successfulScrapes = results.filter(result => result.hasJobs);
    const failedScrapes = results.filter(result => !result.hasJobs);

    // Log basic statistics
    Logger.info(`Total websites processed: ${results.length}`);
    Logger.info(`Successful scrapes: ${successfulScrapes.length}`);
    Logger.info(`Failed scrapes: ${failedScrapes.length}`);

    // Update metrics
    results.forEach(result => {
        if (result.hasJobs) {
            metricsLogger.incrementSuccessfulScrape(result.jobPostings.length);
        } else {
            metricsLogger.incrementFailedScrape();
        }
    });

    // Log failed websites
    if (failedScrapes.length > 0) {
        Logger.warn('Failed websites:');
        failedScrapes.forEach(result => {
            Logger.warn(`- ${result.error}`);
        });
    }

    // Finish and save metrics
    metricsLogger.finishScraping();
} 