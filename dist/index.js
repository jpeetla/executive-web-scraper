"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const crawler_1 = require("./services/crawler"); // Adjust the path as needed
const logger_1 = require("./utils/logger");
// Set up an async function to run the crawler
async function main() {
    try {
        const crawler = new crawler_1.Crawler({
            maxDepth: 2,
            timeout: 10000,
            maxConcurrentRequests: 5,
        });
        const companyName = "Accompany Health"; // Replace this with the company name you want to scrape
        const result = await crawler.scrape(companyName);
        // Log the result
        console.log("Scraping result:", result);
    }
    catch (error) {
        logger_1.Logger.error("Error in main execution", error);
    }
}
// Execute the main function
main();
