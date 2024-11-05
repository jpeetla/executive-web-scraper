import { HttpClient } from './http-client';
import { Parser } from './parser';
import { Logger } from '../utils/logger';
import { UrlUtils } from '../utils/url-utils';
import { ScrapingResult, CrawlerOptions, JobPosting } from '../types';
import { MAX_DEPTH, MAX_CONCURRENT_REQUESTS } from '../config/constants';
import * as cheerio from 'cheerio';
import MetricsLogger from '../utils/metrics-logger';
import { CheerioAPI } from 'cheerio';

export class Crawler {
  private httpClient: HttpClient;
  private visitedUrls: Set<string> = new Set();
  private processedDomains: Set<string> = new Set();
  private options: Required<CrawlerOptions>;

  constructor(options?: CrawlerOptions) {
    this.httpClient = new HttpClient({ timeout: options?.timeout });
    this.options = {
      maxDepth: options?.maxDepth ?? MAX_DEPTH,
      timeout: options?.timeout ?? 10000,
      maxConcurrentRequests: options?.maxConcurrentRequests ?? MAX_CONCURRENT_REQUESTS
    };
  }

  async scrape(url: string): Promise<ScrapingResult> {
    try {
      const normalizedUrl = UrlUtils.normalizeUrl(url);
      
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
          Logger.info(`Found direct careers path: ${careersUrl}`);
          return {
            website: url,
            hasJobs: true,
            jobPostings: await this.crawl(careersUrl, 1)
          };
        }
      } catch (error) {
        Logger.debug(`No direct /careers path found for ${normalizedUrl}`);
      }

      // If no direct careers path, try to find careers link on homepage
      const jobPostings = await this.crawl(normalizedUrl, 0);
      
      return {
        website: url,
        hasJobs: jobPostings.length > 0,
        jobPostings
      };
    } catch (error) {
      Logger.error('Error during scraping', error as Error);
      return {
        website: url,
        hasJobs: false,
        jobPostings: [],
        error: (error as Error).message
      };
    }
  }

  private async crawl(url: string, depth: number): Promise<JobPosting[]> {
    if (this.visitedUrls.has(url)) {
      return [];
    }

    this.visitedUrls.add(url);
    Logger.info(`Crawling ${url}`);

    try {
      const html = await this.httpClient.get(url);
      const $ = cheerio.load(html.data);

      // If this is the initial page, ONLY look for primary career link
      if (depth === 0) {
        const primaryCareerLink = this.findPrimaryCareerLink($, url);
        if (primaryCareerLink) {
          Logger.info(`Found primary career link: ${primaryCareerLink}`);
          return await this.crawl(primaryCareerLink, 1);
        }
        
        // ONLY if no primary career link found, fall back to broader search
        Logger.info('No primary career link found, searching for alternative career links');
        const careerLinks = this.findCareerLinks($, url);
        Logger.info(`Found ${careerLinks.length} career-related links on ${url}`);
        
        const results = await this.crawlConcurrently(careerLinks);
        return results.flat();
      }

      // Check for job listing page links
      const jobListingLinks = this.findJobListingLinks($, url);
      if (jobListingLinks.length > 0) {
        Logger.info(`Found ${jobListingLinks.length} job listing links on ${url}`);
        
        // Follow the first valid job listing link
        for (const link of jobListingLinks) {
          try {
            Logger.info(`Following job listing link: ${link}`);
            const jobPageHtml = await this.httpClient.get(link);
            const jobPage$ = cheerio.load(jobPageHtml.data);
            
            const domain = new URL(url).hostname;
            if (!this.processedDomains.has(domain)) {
              this.processedDomains.add(domain);
              const pageContent = jobPage$('body').text();
              return await Parser.extractJobsWithLLM(pageContent, link);
            }
          } catch (error) {
            Logger.error(`Error following job listing link ${link}:`, error as Error);
            continue;
          }
        }
      }

      return [];
    } catch (error) {
      Logger.error(`Error crawling ${url}`, error as Error);
      return [];
    }
  }

  // New helper method to find primary career link
  private findPrimaryCareerLink($: CheerioAPI, url: string): string | null {
    const PRIMARY_KEYWORDS = ['careers', 'jobs', 'join us', 'work with us'];
    
    for (const keyword of PRIMARY_KEYWORDS) {
      const $link = $(`a:contains("${keyword}")`).first();
      const href = $link.attr('href');
      
      if (href) {
        try {
          return new URL(href, url).toString();
        } catch (error) {
          Logger.warn(`Invalid primary career link URL: ${href}`);
        }
      }
    }
    
    return null;
  }

  private findJobListingLinks($: cheerio.CheerioAPI, baseUrl: string): string[] {
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

    const links = new Set<string>();

    // Find links containing job listing indicators
    $('a').each((_, element) => {
      const $link = $(element);
      const href = $link.attr('href');
      const text = $link.text().toLowerCase().trim();
      
      if (!href) return;

      // Case insensitive check for any of the indicators
      const hasIndicator = jobListingIndicators.some(indicator => 
        text.includes(indicator.toLowerCase())
      );

      if (hasIndicator) {
        try {
          const fullUrl = new URL(href, baseUrl).toString();
          Logger.info(`Found job listing link: "${text}" -> ${fullUrl}`);
          links.add(fullUrl);
        } catch (error) {
          Logger.warn(`Invalid URL: ${href}`);
        }
      }
    });

    return Array.from(links);
  }

  private extractJobContent($: cheerio.CheerioAPI): string | null {
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
              } catch (err) {
                Logger.warn(`Error extracting text from element: ${err}`);
              }
            });
            break;
          }
        } catch (err) {
          Logger.warn(`Error with selector ${selector}: ${err}`);
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
          } catch (err) {
            Logger.warn(`Error with job section selector ${selector}: ${err}`);
            continue;
          }
        }
      }

      if (!content) return null;

      return content
        .replace(/\s+/g, ' ')
        .replace(/\n\s*\n/g, '\n')
        .replace(/[^\w\s-.,()]/g, '')
        .trim();
    } catch (error) {
      Logger.error('Error extracting relevant sections', error as Error);
      return null;
    }
  }

  private findCareerLinks($: cheerio.CheerioAPI, url: string): string[] {
    const careerLinks = new Set<string>();
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
        
        if (!href) return;
        
        // Check both the URL and the link text for career-related keywords
        if (CAREER_KEYWORDS.some(keyword => 
            href.toLowerCase().includes(keyword) || 
            text.includes(keyword)
        )) {
            try {
                const fullUrl = new URL(href, url).toString();
                careerLinks.add(fullUrl);
            } catch (error) {
                Logger.warn(`Invalid career link URL: ${href}`);
            }
        }
    });

    return Array.from(careerLinks);
  }

  private async crawlConcurrently(urls: string[]): Promise<JobPosting[][]> {
    const chunks: string[][] = [];
    for (let i = 0; i < urls.length; i += this.options.maxConcurrentRequests) {
        chunks.push(urls.slice(i, i + this.options.maxConcurrentRequests));
    }

    const results: JobPosting[][] = [];
    for (const chunk of chunks) {
        const chunkResults = await Promise.all(
            chunk.map(url => this.crawl(url, 1))  // depth = 1 for career pages
        );
        results.push(...chunkResults);
    }

    return results;
  }

  private async waitForContent($: CheerioAPI, maxAttempts = 3): Promise<boolean> {
    for (let i = 0; i < maxAttempts; i++) {
      const hasContent = $('body').text().toLowerCase().includes('current openings');
      if (hasContent) {
        return true;
      }
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
      Logger.info(`Retry attempt ${i + 1} for content loading`);
    }
    return false;
  }
} 