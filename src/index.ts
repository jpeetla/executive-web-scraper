import dotenv from 'dotenv';
import express from 'express';
import { Crawler } from './services/crawler';
import { main } from './services/tester';

dotenv.config();
const app = express();
app.use(express.json());

const crawler = new Crawler();

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Single website scraping endpoint
app.get('/scrape', async (req, res) => {
  try {
    const { company_name } = req.query;
    
    if (!company_name) {
      return res.status(400).json({ error: 'URL is required' });
    }

    const result = await crawler.scrape(company_name as string);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Testing 100 domains
app.get('/test', async (req, res) => {
  main().catch(error => {
    res.json('An error occurred in the main function:');
  }); 
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;
