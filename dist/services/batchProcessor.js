"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.processWebsites = void 0;
const crawler_1 = require("./crawler");
const logger_1 = require("../utils/logger");
const metrics_logger_1 = __importDefault(require("../utils/metrics-logger"));
async function processWebsites(websites) {
    const results = [];
    const metricsLogger = metrics_logger_1.default.getInstance();
    // Start metrics tracking
    metricsLogger.startScraping();
    for (const website of websites) {
        try {
            const crawler = new crawler_1.Crawler();
            const result = await crawler.scrape(website);
            results.push(result);
        }
        catch (error) {
            logger_1.Logger.error(`Failed to process ${website}`, error);
            results.push({
                website,
                hasJobs: false,
                jobPostings: [],
                error: error.message
            });
        }
    }
    return results;
}
exports.processWebsites = processWebsites;
