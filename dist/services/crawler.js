"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Crawler = void 0;
const http_client_1 = require("./http-client");
const logger_1 = require("../utils/logger");
const constants_1 = require("../config/constants");
const cheerio = __importStar(require("cheerio"));
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
            const executivesData = [];
            const urls = await (0, query_api_1.querySerpApi)(`${company_name} leadership team OR board of directors OR executive profiles`, 3);
            console.log('Top 3 URLs:', urls);
            for (const url of urls) {
                logger_1.Logger.info(`Scraping URL: ${url}`);
                const isAllowed = await this.httpClient.checkRobotsTxt(url);
                if (!isAllowed) {
                    logger_1.Logger.warn(`Scraping not allowed for ${url}, skipping...`);
                    continue;
                }
                try {
                    const jobPageHtml = await this.httpClient.get(url);
                    if (jobPageHtml.status >= 400 || jobPageHtml.data === null) {
                        logger_1.Logger.warn(`Skipping URL ${url} due to failed request`);
                        continue;
                    }
                    const jobPage$ = cheerio.load(jobPageHtml.data);
                    const domain = new URL(url).hostname;
                    if (!this.processedDomains.has(domain)) {
                        this.processedDomains.add(domain);
                        const pageContent = jobPage$('body').text().toLowerCase();
                        logger_1.Logger.info(`SUCCESS: Page content for ${url} fetched`);
                        const chatResponse = await (0, query_api_1.queryChat)(pageContent, url);
                        if (chatResponse) {
                            for (const executive of chatResponse.executives) {
                                console.log(`Name: ${executive.name}, Title: ${executive.title}`);
                                const linkedin_serp_results = await (0, query_api_1.querySerpApi)(`${executive.name} ${executive.title} LinkedIn`, 3);
                                const linkedinUrl = linkedin_serp_results.length > 0 ? linkedin_serp_results[0] : "";
                                const executiveObject = {
                                    name: executive.name,
                                    title: executive.title,
                                    linkedin: linkedinUrl
                                };
                                const isDuplicate = executivesData.some((existingExecutive) => existingExecutive.linkedin === executiveObject.linkedin);
                                if (!isDuplicate) {
                                    executivesData.push(executiveObject);
                                }
                                else {
                                    logger_1.Logger.warn(`Skipping duplicate executive: ${executive.name}`);
                                }
                            }
                        }
                    }
                }
                catch (error) {
                    logger_1.Logger.warn(`Error fetching job page for ${url}:`);
                    continue;
                }
            }
            //STEP #2: Directly query SERP API for executive linkedln info
            if (executivesData.length === 0) {
                const linkedin_urls = await (0, query_api_1.querySerpApi)(`${company_name} CEO, CTO, COO, talent acuisition, hiring team, and/or executive team LinkedIn`, 8);
                for (const linkedin_url of linkedin_urls) {
                    if (linkedin_url.includes('www.linkedin.com/in/')) {
                        const executiveObject = {
                            name: "",
                            title: "",
                            linkedin: linkedin_url
                        };
                        const isDuplicate = executivesData.some((existingExecutive) => existingExecutive.linkedin === executiveObject.linkedin);
                        if (!isDuplicate) {
                            executivesData.push(executiveObject);
                        }
                    }
                }
            }
            //STEP #3: Query Apollo API
            // if (executivesData.length === 0) {
            // INSUFFICIENT FUNDS IN APOLLO API ACCOUNT
            // }
            return executivesData;
        }
        catch (error) {
            logger_1.Logger.error('Error scraping company:', error);
            return [];
        }
    }
}
exports.Crawler = Crawler;
