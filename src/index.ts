// import { Crawler } from './services/crawler';
// import { Logger } from './utils/logger';
// import express from 'express';

// const app = express();

// app.get('/', (req, res) => res.send('Home Page Route'));
// app.get('/about', (req, res) => res.send('About Page Route'));

// export async function handler(event: any) {
//   const companyName = event.queryStringParameters?.companyName || "Default Company";
  
//   try {
//     const crawler = new Crawler({
//       maxDepth: 2,
//       timeout: 10000,
//       maxConcurrentRequests: 5,
//     });

//     const result = await crawler.scrape(companyName);
//     console.log("Scraping result:", result);

//     return {
//       statusCode: 200,
//       body: JSON.stringify(result),
//     };
//   } catch (error) {
//     Logger.error("Error in main execution", error as Error);
//     return {
//       statusCode: 500,
//       body: JSON.stringify({ error: "An error occurred during scraping" }),
//     };
//   }
// }

// export default app; // This should work, but let's also ensure it’s a handler function below.

import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import { Crawler } from './services/crawler';
import { ScrapingResult } from './types';

const app = express();
app.use(express.json());

const crawler = new Crawler();

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Single website scraping endpoint
app.post('/scrape', async (req, res) => {
  try {
    const { company_name } = req.body;
    
    if (!company_name) {
      return res.status(400).json({ error: 'URL is required' });
    }

    const result: ScrapingResult = await crawler.scrape(company_name);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;
