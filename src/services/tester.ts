import { createObjectCsvWriter } from "csv-writer";
import { Crawler } from "./crawler";
import { Logger } from "../utils/logger";
import { testing_domains } from "../config/constants";

const csvWriter = createObjectCsvWriter({
  path: "leads.csv",
  header: [
    { id: "company_name", title: "Company_Name" },
    { id: "domain", title: "Domain" },
    { id: "executive_name", title: "Executive_Name" },
    { id: "role_title", title: "Role_Title" },
    { id: "linkedin_url", title: "Linkedin" },
    { id: "source", title: "Source" },
    { id: "investor_reference", title: "Investor_Reference" },
    { id: "company_reference", title: "Company_Reference" },
  ],
  append: true,
});

export async function main() {
  let allResults = [];
  const crawler = new Crawler();
  let filePath = "../../input.csv";

  for (const domain of testing_domains) {
    try {
      Logger.info(`Scraping data for company: ${domain}`);
      const executivesData = await crawler.scrape(domain);

      const formattedData = executivesData.map((executive) => ({
        company_name: "",
        domain: domain,
        executive_name: executive.name,
        role_title: executive.title,
        linkedin_url: executive.linkedin,
        source: executive.source,
        investor_reference: "",
        company_reference: "",
      }));

      allResults.push(...formattedData);
    } catch (error) {
      Logger.error(`Error scraping data for ${domain}:`, error as Error);
      continue;
    }
  }

  allResults = allResults.map((result) => {
    const [first_name, last_name] = result.executive_name.split(" ");
    return {
      ...result,
      first_name,
      last_name,
    };
  });

  try {
    await csvWriter.writeRecords(allResults);
    Logger.info("Data written to executives_data.csv successfully");
  } catch (error) {
    Logger.error("Error writing data to CSV:", error as Error);
  }
}
