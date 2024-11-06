import { Crawler } from './services/crawler';
import { Logger } from './utils/logger';

export async function handler(event: any) {
  const companyName = event.queryStringParameters?.companyName || "Default Company";
  
  try {
    const crawler = new Crawler({
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
  } catch (error) {
    Logger.error("Error in main execution", error as Error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "An error occurred during scraping" }),
    };
  }
}
