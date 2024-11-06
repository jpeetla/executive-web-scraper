"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Crawler = void 0;
const http_client_1 = require("./http-client");
const logger_1 = require("../utils/logger");
const constants_1 = require("../config/constants");
const query_api_1 = require("./query_api");
class Crawler {
    constructor(options) {
        this.processedDomains = new Set();
        this.httpClient = new http_client_1.HttpClient({ timeout: options?.timeout });
        this.options = {
            maxDepth: options?.maxDepth ?? constants_1.MAX_DEPTH,
            timeout: options?.timeout ?? 10000,
            maxConcurrentRequests: options?.maxConcurrentRequests ?? constants_1.MAX_CONCURRENT_REQUESTS
        };
    }
    async scrape(company_name) {
        try {
            //STEP #1: Query SERP API + Extract top 3 URLs + Use GPT LLM to check if the page contains executive info
            // const normalizedUrl = UrlUtils.normalizeUrl(url);
            const urls = await (0, query_api_1.querySerpApi)(company_name, 'leadership team OR board of directors OR executive profiles');
            console.log('Top 5 URLs:', urls);
            // for (const url of urls) {
            //   const isAllowed = await this.httpClient.checkRobotsTxt(url);
            //   if (!isAllowed) {
            //     console.log(`Scraping not allowed for ${url}, skipping...`);
            //     continue;
            //   }
            //   try {
            //     const jobPageHtml = await this.httpClient.get(url);
            //     const jobPage$ = cheerio.load(jobPageHtml.data);
            //     const domain = new URL(url).hostname;
            //     if (!this.processedDomains.has(domain)) {
            //       this.processedDomains.add(domain);
            //       const pageContent = jobPage$('body').text();
            //       const hasExecutiveInfo = await queryChat(pageContent, url);
            //       if (hasExecutiveInfo) {
            //         console.log('Found executive info:', hasExecutiveInfo);
            //         return hasExecutiveInfo;
            //       }
            //     }
            //   } catch (error) {
            //     console.error(`Error fetching job page for ${url}:`, error);
            //     continue;  // Skip to the next iteration if an error occurs
            //   }
            // }
            //STEP #2: Directly query SERP API for executive linkedln info
            // const linkedin_urls = await querySerpApi(company_name, 'CEO, CTO, COO, and/or executive team LinkedIn');
            //STEP #3: Query Apollo API
            const apollo_linkedin_data = await (0, query_api_1.findExecutives)(company_name);
            return "";
        }
        catch (error) {
            logger_1.Logger.error('Error during scraping', error);
            return "";
        }
    }
}
exports.Crawler = Crawler;
