import { Crawler } from './services/crawler'; // Adjust the path as needed
import { Logger } from './utils/logger';

// Set up an async function to run the crawler
async function main() {
  try {
    const crawler = new Crawler({
      maxDepth: 2, // Set your desired options here or leave empty to use defaults
      timeout: 10000,
      maxConcurrentRequests: 5,
    });

    const companyName = process.argv[2]; // Replace this with the company name you want to scrape
    const result = await crawler.scrape(companyName);

    // Log the result
    console.log("Scraping result:", result);
  } catch (error) {
    Logger.error("Error in main execution", error as Error);
  }
}

// Execute the main function
main();
