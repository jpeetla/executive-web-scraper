"use strict";
// import express from 'express';
// import { Crawler } from '../services/crawler';
// const app = express();
// app.use(express.json());
// const crawler = new Crawler();
// // Health check endpoint
// app.get('/health', (req, res) => {
//   res.json({ status: 'ok' });
// });
// // Single website scraping endpoint
// app.post('/scrape', async (req, res) => {
//   try {
//     const { company_name } = req.body;
//     if (!company_name) {
//       return res.status(400).json({ error: 'URL is required' });
//     }
//     const result: ScrapingResult = await crawler.scrape(company_name);
//     res.json(result);
//   } catch (error) {
//     res.status(500).json({ error: (error as Error).message });
//   }
// });
// const PORT = process.env.PORT || 3000;
// app.listen(PORT, () => {
//   console.log(`Server running on port ${PORT}`);
// });
// export default app;
