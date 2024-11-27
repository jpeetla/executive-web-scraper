import dotenv from "dotenv";
import express from "express";
import { Crawler } from "./services/crawler";
import { main } from "./services/tester";
import axios from "axios";

dotenv.config();
const app = express();
app.use(express.json());

const crawler = new Crawler();

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// Single website scraping endpoint
app.post("/scrape", async (req, res) => {
  try {
    const {
      fileName,
      domain,
      companyName,
      investorReference,
      companyReference,
    } = req.body;
    console.log(domain);

    if (!domain) {
      return res.status(400).json({ error: "URL is required" });
    }

    const results = await crawler.scrape(domain);

    await axios.post(
      "https://paraform-smartleads-xi.vercel.app/api/receiveCompanyExecutiveWSData",
      {
        fileName,
        results,
        companyName,
        investorReference,
        companyReference,
      }
    );

    // await axios.post(
    //   "http://localhost:3000/api/receiveCompanyExecutiveWSData",
    //   {
    //     fileName,
    //     results,
    //     companyName,
    //     investorReference,
    //     companyReference,
    //   }
    // );

    // res.json(results);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Testing 100 domains
app.get("/test", async (req, res) => {
  main().catch((error) => {
    res.json("An error occurred in the main function:");
  });
});

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;
