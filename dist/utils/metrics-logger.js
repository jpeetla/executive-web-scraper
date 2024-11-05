"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
class MetricsLogger {
    constructor() {
        this.resetMetrics();
    }
    static getInstance() {
        if (!MetricsLogger.instance) {
            MetricsLogger.instance = new MetricsLogger();
        }
        return MetricsLogger.instance;
    }
    resetMetrics() {
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
    startScraping() {
        this.resetMetrics();
    }
    incrementSuccessfulScrape(jobCount) {
        this.metrics.successfulScrapes++;
        this.metrics.totalJobsFound += jobCount;
        this.metrics.urlsWithJobs += jobCount > 0 ? 1 : 0;
        this.metrics.urlsWithoutJobs += jobCount === 0 ? 1 : 0;
    }
    incrementFailedScrape() {
        this.metrics.failedScrapes++;
    }
    finishScraping() {
        this.metrics.endTime = Date.now();
        this.metrics.totalDuration = this.metrics.endTime - this.metrics.startTime;
        this.metrics.totalUrlsProcessed = this.metrics.successfulScrapes + this.metrics.failedScrapes;
        this.metrics.averageTimePerUrl = this.metrics.totalDuration / this.metrics.totalUrlsProcessed;
        this.saveMetrics();
    }
    saveMetrics() {
        const metricsPath = path_1.default.join(process.cwd(), MetricsLogger.METRICS_FILE);
        let existingMetrics = [];
        // Load existing metrics if file exists
        if (fs_1.default.existsSync(metricsPath)) {
            try {
                existingMetrics = JSON.parse(fs_1.default.readFileSync(metricsPath, 'utf8'));
            }
            catch (error) {
                console.error('Error reading existing metrics:', error);
            }
        }
        // Add new metrics to the array
        existingMetrics.push(this.metrics);
        // Save updated metrics
        try {
            fs_1.default.writeFileSync(metricsPath, JSON.stringify(existingMetrics, null, 2));
        }
        catch (error) {
            console.error('Error saving metrics:', error);
        }
    }
    getCurrentMetrics() {
        return { ...this.metrics };
    }
}
MetricsLogger.METRICS_FILE = 'scraping_metrics.json';
exports.default = MetricsLogger;
