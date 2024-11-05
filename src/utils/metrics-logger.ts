import fs from 'fs';
import path from 'path';

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

class MetricsLogger {
    private static readonly METRICS_FILE = 'scraping_metrics.json';
    private static instance: MetricsLogger;
    private metrics!: ScrapingMetrics;
    
    private constructor() {
        this.resetMetrics();
    }

    public static getInstance(): MetricsLogger {
        if (!MetricsLogger.instance) {
            MetricsLogger.instance = new MetricsLogger();
        }
        return MetricsLogger.instance;
    }

    private resetMetrics(): void {
        this.metrics = {
            startTime: Date.now(),
            endTime: 0,
            totalDuration: 0,
            totalUrlsProcessed: 0,
            successfulScrapes: 0,
            failedScrapes: 0,
            averageTimePerUrl: 0,
            totalJobsFound: 0,
            urlsWithJobs: 0,
            urlsWithoutJobs: 0,
            timestamp: new Date().toISOString()
        };
    }

    public startScraping(): void {
        this.resetMetrics();
    }

    public incrementSuccessfulScrape(jobCount: number): void {
        this.metrics.successfulScrapes++;
        this.metrics.totalJobsFound += jobCount;
        this.metrics.urlsWithJobs += jobCount > 0 ? 1 : 0;
        this.metrics.urlsWithoutJobs += jobCount === 0 ? 1 : 0;
    }

    public incrementFailedScrape(): void {
        this.metrics.failedScrapes++;
    }

    public finishScraping(): void {
        this.metrics.endTime = Date.now();
        this.metrics.totalDuration = this.metrics.endTime - this.metrics.startTime;
        this.metrics.totalUrlsProcessed = this.metrics.successfulScrapes + this.metrics.failedScrapes;
        this.metrics.averageTimePerUrl = this.metrics.totalDuration / this.metrics.totalUrlsProcessed;
        
        this.saveMetrics();
    }

    private saveMetrics(): void {
        const metricsPath = path.join(process.cwd(), MetricsLogger.METRICS_FILE);
        let existingMetrics: ScrapingMetrics[] = [];

        // Load existing metrics if file exists
        if (fs.existsSync(metricsPath)) {
            try {
                existingMetrics = JSON.parse(fs.readFileSync(metricsPath, 'utf8'));
            } catch (error) {
                console.error('Error reading existing metrics:', error);
            }
        }

        // Add new metrics to the array
        existingMetrics.push(this.metrics);

        // Save updated metrics
        try {
            fs.writeFileSync(metricsPath, JSON.stringify(existingMetrics, null, 2));
        } catch (error) {
            console.error('Error saving metrics:', error);
        }
    }

    public getCurrentMetrics(): ScrapingMetrics {
        return { ...this.metrics };
    }
}

export default MetricsLogger; 