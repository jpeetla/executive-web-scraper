"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.main = void 0;
const csv_writer_1 = require("csv-writer");
const crawler_1 = require("./crawler");
const constants_1 = require("../config/constants");
const logger_1 = require("../utils/logger");
const csvWriter = (0, csv_writer_1.createObjectCsvWriter)({
    path: 'executives.csv',
    header: [
        { id: 'name', title: 'Name' },
        { id: 'title', title: 'Title' },
        { id: 'company', title: 'Company' }
    ],
    append: true
});
async function main() {
    const allResults = [];
    const crawler = new crawler_1.Crawler();
    for (const domain of constants_1.TESTING_DOMAINS) {
        try {
            logger_1.Logger.info(`Scraping data for company: ${domain}`);
            const executivesData = await crawler.scrape(domain);
            const formattedData = executivesData.map(executive => ({
                company_name: domain,
                executive_name: executive.name,
                role_title: executive.title,
                linkedin_url: executive.linkedin
            }));
            allResults.push(...formattedData);
        }
        catch (error) {
            logger_1.Logger.error(`Error scraping data for ${domain}:`, error);
            continue;
        }
    }
    try {
        await csvWriter.writeRecords(allResults);
        logger_1.Logger.info('Data written to executives_data.csv successfully');
    }
    catch (error) {
        logger_1.Logger.error('Error writing data to CSV:', error);
    }
}
exports.main = main;
