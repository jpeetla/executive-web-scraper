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
const parser_1 = require("./parser");
const logger_1 = require("../utils/logger");
const url_utils_1 = require("../utils/url-utils");
const constants_1 = require("../config/constants");
const cheerio = __importStar(require("cheerio"));
class Crawler {
    constructor(options) {
        this.visitedUrls = new Set();
        this.processedDomains = new Set();
        this.httpClient = new http_client_1.HttpClient({ timeout: options?.timeout });
        this.options = {
            maxDepth: options?.maxDepth ?? constants_1.MAX_DEPTH,
            timeout: options?.timeout ?? 10000,
            maxConcurrentRequests: options?.maxConcurrentRequests ?? constants_1.MAX_CONCURRENT_REQUESTS
        };
    }
    async scrape(url) {
        try {
            const normalizedUrl = url_utils_1.UrlUtils.normalizeUrl(url);
            // Check robots.txt
            const isAllowed = await this.httpClient.checkRobotsTxt(normalizedUrl);
            if (!isAllowed) {
                return {
                    website: url,
                    hasJobs: false,
                    jobPostings: [],
                    error: 'Scraping not allowed by robots.txt'
                };
            }
            // First try direct /careers path
            try {
                const careersUrl = new URL('/careers', normalizedUrl).toString();
                const response = await this.httpClient.get(careersUrl);
                if (response.status === 200) {
                    logger_1.Logger.info(`Found direct careers path: ${careersUrl}`);
                    return {
                        website: url,
                        hasJobs: true,
                        jobPostings: await this.crawl(careersUrl, 1)
                    };
                }
            }
            catch (error) {
                logger_1.Logger.debug(`No direct /careers path found for ${normalizedUrl}`);
            }
            // If no direct careers path, try to find careers link on homepage
            const jobPostings = await this.crawl(normalizedUrl, 0);
            return {
                website: url,
                hasJobs: jobPostings.length > 0,
                jobPostings
            };
        }
        catch (error) {
            logger_1.Logger.error('Error during scraping', error);
            return {
                website: url,
                hasJobs: false,
                jobPostings: [],
                error: error.message
            };
        }
    }
    async crawl(url, depth) {
        if (this.visitedUrls.has(url)) {
            return [];
        }
        this.visitedUrls.add(url);
        logger_1.Logger.info(`Crawling ${url}`);
        try {
            const html = await this.httpClient.get(url);
            const $ = cheerio.load(html.data);
            // If this is the initial page, ONLY look for primary career link
            if (depth === 0) {
                const primaryCareerLink = this.findPrimaryCareerLink($, url);
                if (primaryCareerLink) {
                    logger_1.Logger.info(`Found primary career link: ${primaryCareerLink}`);
                    return await this.crawl(primaryCareerLink, 1);
                }
                // ONLY if no primary career link found, fall back to broader search
                logger_1.Logger.info('No primary career link found, searching for alternative career links');
                const careerLinks = this.findCareerLinks($, url);
                logger_1.Logger.info(`Found ${careerLinks.length} career-related links on ${url}`);
                const results = await this.crawlConcurrently(careerLinks);
                return results.flat();
            }
            // Check for job listing page links
            const jobListingLinks = this.findJobListingLinks($, url);
            if (jobListingLinks.length > 0) {
                logger_1.Logger.info(`Found ${jobListingLinks.length} job listing links on ${url}`);
                // Follow the first valid job listing link
                for (const link of jobListingLinks) {
                    try {
                        logger_1.Logger.info(`Following job listing link: ${link}`);
                        const jobPageHtml = await this.httpClient.get(link);
                        const jobPage$ = cheerio.load(jobPageHtml.data);
                        const domain = new URL(url).hostname;
                        if (!this.processedDomains.has(domain)) {
                            this.processedDomains.add(domain);
                            const pageContent = jobPage$('body').text();
                            return await parser_1.Parser.extractJobsWithLLM(pageContent, link);
                        }
                    }
                    catch (error) {
                        logger_1.Logger.error(`Error following job listing link ${link}:`, error);
                        continue;
                    }
                }
            }
            return [];
        }
        catch (error) {
            logger_1.Logger.error(`Error crawling ${url}`, error);
            return [];
        }
    }
    // New helper method to find primary career link
    findPrimaryCareerLink($, url) {
        const PRIMARY_KEYWORDS = ['careers', 'jobs', 'join us', 'work with us'];
        for (const keyword of PRIMARY_KEYWORDS) {
            const $link = $(`a:contains("${keyword}")`).first();
            const href = $link.attr('href');
            if (href) {
                try {
                    return new URL(href, url).toString();
                }
                catch (error) {
                    logger_1.Logger.warn(`Invalid primary career link URL: ${href}`);
                }
            }
        }
        return null;
    }
    findJobListingLinks($, baseUrl) {
        const jobListingIndicators = [
            'view openings',
            'view open positions',
            'view positions',
            'view jobs',
            'see jobs',
            'browse jobs',
            'view all jobs',
            'view opportunities',
            'see open positions',
            'current openings',
            'open positions',
            'job openings'
        ];
        const links = new Set();
        // Find links containing job listing indicators
        $('a').each((_, element) => {
            const $link = $(element);
            const href = $link.attr('href');
            const text = $link.text().toLowerCase().trim();
            if (!href)
                return;
            // Case insensitive check for any of the indicators
            const hasIndicator = jobListingIndicators.some(indicator => text.includes(indicator.toLowerCase()));
            if (hasIndicator) {
                try {
                    const fullUrl = new URL(href, baseUrl).toString();
                    logger_1.Logger.info(`Found job listing link: "${text}" -> ${fullUrl}`);
                    links.add(fullUrl);
                }
                catch (error) {
                    logger_1.Logger.warn(`Invalid URL: ${href}`);
                }
            }
        });
        return Array.from(links);
    }
    extractJobContent($) {
        try {
            // First try to find structured job data
            const structuredJobContainers = [
                '[itemtype="http://schema.org/JobPosting"]',
                '[typeof="JobPosting"]',
                '[class*="job-posting"]',
                '[id*="job-posting"]',
                '.greenhouse-job-board',
                '.lever-jobs-list'
            ];
            let content = '';
            // Try structured containers first
            for (const selector of structuredJobContainers) {
                try {
                    const elements = $(selector);
                    if (elements.length > 0) {
                        elements.each((_, el) => {
                            try {
                                content += $(el).text().trim() + '\n\n';
                            }
                            catch (err) {
                                logger_1.Logger.warn(`Error extracting text from element: ${err}`);
                            }
                        });
                        break;
                    }
                }
                catch (err) {
                    logger_1.Logger.warn(`Error with selector ${selector}: ${err}`);
                    continue;
                }
            }
            if (!content) {
                const jobSectionSelectors = [
                    'section:contains("Current Openings")',
                    'div:contains("Open Positions")',
                    'section:contains("Job Listings")'
                ].map(selector => `${selector}, ${selector.toLowerCase()}`);
                for (const selector of jobSectionSelectors) {
                    try {
                        const section = $(selector).first();
                        if (section.length) {
                            content = section.text().trim();
                            break;
                        }
                    }
                    catch (err) {
                        logger_1.Logger.warn(`Error with job section selector ${selector}: ${err}`);
                        continue;
                    }
                }
            }
            if (!content)
                return null;
            return content
                .replace(/\s+/g, ' ')
                .replace(/\n\s*\n/g, '\n')
                .replace(/[^\w\s-.,()]/g, '')
                .trim();
        }
        catch (error) {
            logger_1.Logger.error('Error extracting relevant sections', error);
            return null;
        }
    }
    findCareerLinks($, url) {
        const careerLinks = new Set();
        const CAREER_KEYWORDS = [
            'careers', 'career', 'jobs', 'job', 'join-us', 'join us',
            'work-with-us', 'work with us', 'positions', 'opportunities',
            'employment', 'vacancies', 'recruiting', 'recruitment',
            'apply', 'applications', 'job-openings', 'job openings',
            'current-openings', 'current openings', 'open-positions',
            'careers/open-positions', 'job-opportunities', 'hiring',
            'bamboohr', 'lever.co', 'greenhouse.io', 'workday',
            'jobs.lever.co', 'boards.greenhouse.io', 'jobs.greenhouse',
            'careers-page', 'careers.page', 'join-the-team', 'join the team'
        ];
        // Find links containing career-related keywords
        $('a').each((_, element) => {
            const $link = $(element);
            const href = $link.attr('href');
            const text = $link.text().toLowerCase();
            if (!href)
                return;
            // Check both the URL and the link text for career-related keywords
            if (CAREER_KEYWORDS.some(keyword => href.toLowerCase().includes(keyword) ||
                text.includes(keyword))) {
                try {
                    const fullUrl = new URL(href, url).toString();
                    careerLinks.add(fullUrl);
                }
                catch (error) {
                    logger_1.Logger.warn(`Invalid career link URL: ${href}`);
                }
            }
        });
        return Array.from(careerLinks);
    }
    async crawlConcurrently(urls) {
        const chunks = [];
        for (let i = 0; i < urls.length; i += this.options.maxConcurrentRequests) {
            chunks.push(urls.slice(i, i + this.options.maxConcurrentRequests));
        }
        const results = [];
        for (const chunk of chunks) {
            const chunkResults = await Promise.all(chunk.map(url => this.crawl(url, 1)) // depth = 1 for career pages
            );
            results.push(...chunkResults);
        }
        return results;
    }
    async waitForContent($, maxAttempts = 3) {
        for (let i = 0; i < maxAttempts; i++) {
            const hasContent = $('body').text().toLowerCase().includes('current openings');
            if (hasContent) {
                return true;
            }
            await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
            logger_1.Logger.info(`Retry attempt ${i + 1} for content loading`);
        }
        return false;
    }
}
exports.Crawler = Crawler;
