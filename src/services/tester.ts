import fs from 'fs';
import { createObjectCsvWriter } from 'csv-writer';
import { Crawler } from './crawler';
import { Logger } from '../utils/logger';
import { testing_domains } from '../config/constants';

const csvWriter = createObjectCsvWriter({
    path: 'sapphireportfolioresults.csv',
    header: [
      { id: 'company_name', title: 'Domain' },
      { id: 'executive_name', title: 'Executive_Name' },
      { id: 'role_title', title: 'Role_Title' },
      { id: 'linkedin_url', title: 'Linkedin' },
      { id: 'source', title: 'Source'}
    ],
    append: true // Append to file if it exists
  });

export async function main() {
    let allResults = [];
    const crawler = new Crawler();

    for (const domain of testing_domains) {
        try {
            Logger.info(`Scraping data for company: ${domain}`);
            const executivesData = await crawler.scrape(domain);
    
            const formattedData = executivesData.map(executive => ({
                company_name: domain,
                executive_name: executive.name,
                role_title: executive.title,
                linkedin_url: executive.linkedin,
                source: executive.source
            }));
    
            allResults.push(...formattedData);
        } catch (error) {
            Logger.error(`Error scraping data for ${domain}:`, error as Error);
            continue;
        }
        
    }

    console.log(allResults);

    // split first name and last name in allResults
    allResults = allResults.map(result => {
        const [first_name, last_name] = result.executive_name.split(' ');
        return {
            ...result,
            first_name,
            last_name
        };
    });
    
    console.log(allResults);
    
    try {
        await csvWriter.writeRecords(allResults);
        Logger.info('Data written to executives_data.csv successfully');
    } catch (error) {
        Logger.error('Error writing data to CSV:', error as Error);
    }
}

