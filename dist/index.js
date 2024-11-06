"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const crawler_1 = require("./services/crawler");
const logger_1 = require("./utils/logger");
async function handler(event) {
    const companyName = event.queryStringParameters?.companyName || "Default Company";
    try {
        const crawler = new crawler_1.Crawler({
            maxDepth: 2,
            timeout: 10000,
            maxConcurrentRequests: 5,
        });
        const result = await crawler.scrape(companyName);
        console.log("Scraping result:", result);
        return {
            statusCode: 200,
            body: JSON.stringify(result),
        };
    }
    catch (error) {
        logger_1.Logger.error("Error in main execution", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "An error occurred during scraping" }),
        };
    }
}
exports.handler = handler;
