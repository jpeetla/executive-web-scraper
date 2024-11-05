interface ScrapingMetrics {
    startTime: number;
    endTime: number;
    totalDuration: number;
    totalUrlsProcessed: number;
    successfulScrapes: number;
    failedScrapes: number;
    averageTimePerUrl: number;
    totalJobsFound: number;
    urlsWithJobs: number;
    urlsWithoutJobs: number;
    timestamp: string;
}
declare class MetricsLogger {
    private static readonly METRICS_FILE;
    private static instance;
    private metrics;
    private constructor();
    static getInstance(): MetricsLogger;
    private resetMetrics;
    startScraping(): void;
    incrementSuccessfulScrape(jobCount: number): void;
    incrementFailedScrape(): void;
    finishScraping(): void;
    private saveMetrics;
    getCurrentMetrics(): ScrapingMetrics;
}
export default MetricsLogger;
