"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyzeResults = void 0;
const logger_1 = require("../utils/logger");
const metrics_logger_1 = __importDefault(require("../utils/metrics-logger"));
function analyzeResults(results) {
    const metricsLogger = metrics_logger_1.default.getInstance();
    const successfulScrapes = results.filter(result => result.hasJobs);
    const failedScrapes = results.filter(result => !result.hasJobs);
    // Log basic statistics
    logger_1.Logger.info(`Total websites processed: ${results.length}`);
    logger_1.Logger.info(`Successful scrapes: ${successfulScrapes.length}`);
    logger_1.Logger.info(`Failed scrapes: ${failedScrapes.length}`);
    // Update metrics
    results.forEach(result => {
        if (result.hasJobs) {
            metricsLogger.incrementSuccessfulScrape(result.jobPostings.length);
        }
        else {
            metricsLogger.incrementFailedScrape();
        }
    });
    // Log failed websites
    if (failedScrapes.length > 0) {
        logger_1.Logger.warn('Failed websites:');
        failedScrapes.forEach(result => {
            logger_1.Logger.warn(`- ${result.error}`);
        });
    }
    // Finish and save metrics
    metricsLogger.finishScraping();
}
exports.analyzeResults = analyzeResults;
