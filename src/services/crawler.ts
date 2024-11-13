import { HttpClient } from './http-client';
import { Logger } from '../utils/logger';
import { CrawlerOptions, Executive } from '../types';
import { MAX_DEPTH, MAX_CONCURRENT_REQUESTS } from '../config/constants';
import * as cheerio from 'cheerio';
import { querySerpApi, queryChat } from './query_api';
import { cleanContentforLLM, removeStopWords, puppeteerWebpageExtraction } from './webpage_content';
import { isFsReadStream } from 'openai/_shims';

export class Crawler {
  private httpClient: HttpClient;
  private options: Required<CrawlerOptions>;

  constructor(options?: CrawlerOptions) {
    this.httpClient = new HttpClient({ timeout: options?.timeout });
    this.options = {
      maxDepth: options?.maxDepth ?? MAX_DEPTH,
      timeout: options?.timeout ?? 10000,
      maxConcurrentRequests: options?.maxConcurrentRequests ?? MAX_CONCURRENT_REQUESTS
    };
  }

  async scrape(company_name: string): Promise<Executive[]> {
    try {
      //STEP #1: Query SERP API + Extract top 3 URLs + Use GPT LLM to check if the page contains executive info
      const executivesData: Executive[] = [];
      const urls = await querySerpApi(`${company_name} leadership team OR board of directors OR executive profiles`, 2);
      console.log('Top 3 URLs:', urls);

      for (const url of urls) {
        Logger.info(`Scraping URL: ${url}`);
        const isAllowed = await this.httpClient.checkRobotsTxt(url);
        if (!isAllowed) {
          Logger.warn(`Scraping not allowed for ${url}, skipping...`);
          continue;
        }

        try {
          const jobPageHtml = await this.httpClient.get(url);
          if (jobPageHtml.status >= 400 || jobPageHtml.data === null) {
            Logger.warn(`Skipping URL ${url} due to failed request`);
            continue;
          }
  
          const jobPage$ = cheerio.load(jobPageHtml.data);
          var pageContent = jobPage$('body').text().toLowerCase();
          pageContent = pageContent
            .replace(/[^\w\s-.,()]/g, '')
            .replace(/\s+/g, ' ')   
            .replace(/\b(class|id|style|div|span|width|height|margin|padding|color|font|text-align|href|src|alt|meta|css|html|doctype|javascript)\b/g, '')
            .trim();
            
          var cleanedContent = await cleanContentforLLM(pageContent, url);
          if (cleanedContent.length === 0) {
            cleanedContent = await puppeteerWebpageExtraction(url);
          }
          const chatResponse = await queryChat(cleanedContent, url);

          if (chatResponse) {
            for(const executive of chatResponse.executives) {
              console.log(`Name: ${executive.name}, Title: ${executive.title}`);
              const linkedin_serp_results = await querySerpApi(`${executive.name} ${executive.title} LinkedIn`, 3);
              const linkedinUrl = linkedin_serp_results.length > 0 ? linkedin_serp_results[0] : "";

              const executiveObject: Executive = {
                name: executive.name,
                title: executive.title,
                linkedin: linkedinUrl
              };
              const isDuplicate = executivesData.some((existingExecutive) => existingExecutive.linkedin === executiveObject.linkedin);
              if (!isDuplicate) {
                executivesData.push(executiveObject);
              } else {
                Logger.warn(`Skipping duplicate executive: ${executive.name}`);
              }          
            }
          }
        } catch (error) {
          Logger.warn(`Error fetching job page for ${url} ${error}:`);
          continue;  
        }
      }

      //STEP #2: Directly query SERP API for executive linkedln info
      if (executivesData.length === 0) {
        const linkedin_urls = await querySerpApi(`${company_name} CEO, CTO, COO, talent acuisition, hiring team, and/or executive team LinkedIn`, 8);
        for (const linkedin_url of linkedin_urls) {
          if (linkedin_url.includes('www.linkedin.com/in/')) {
            const executiveObject: Executive = {
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

      return executivesData;
    } catch (error) {
      Logger.error('Error scraping company:', error as Error);
      return [];
    }
  }

  // async function checkQueryForExecutives(query: string): Promise<Executive[]> {
  //   try {

  //   } catch(error) {
  //     Logger.error('Error checking query for executives:', error as Error);
  //     return [];
  //   }
  // }
} 