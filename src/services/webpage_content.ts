import { COMMON_EXECUTIVE_KEYWORDS } from '../config/constants';
import puppeteer, { Browser, Page } from 'puppeteer';
import { Executive, LLMResponse } from '../types';
import { Logger } from '../utils/logger';
import natural from 'natural';
import { HttpClient } from './http-client';
import { queryChat, querySerpApi } from './query_api';
import * as cheerio from 'cheerio';

export async function cleanContentforLLM(content: string, url: string): Promise<string> {
    const MAX_TOKENS = 15000;
    const AVERAGE_CHARS_PER_TOKEN = 4; 
    const MAX_CHARS = MAX_TOKENS * AVERAGE_CHARS_PER_TOKEN;

    // If short enough, return content as is
    if (content.length <= MAX_CHARS) {
        return content;
    }

    // Split into chunks of 6000 CHARACTERS & Return top 2 sections
    if (content.length > MAX_CHARS) {
      Logger.info(`Extracting top 2 sections instead...`);
      content = extractTopTwoSections(content);
      content = removeStopWords(content);
    }

    return content;
  }

function extractTopTwoSections(content: string): string {
    const MAX_TOKENS = 15000;
    const AVERAGE_CHARS_PER_TOKEN = 4; 
    const MAX_CHARS = MAX_TOKENS * AVERAGE_CHARS_PER_TOKEN;

    // Split content into chunks of approximately CHUNK_SIZE characters
    const sections = [];
    for (let i = 0; i < content.length; i += MAX_CHARS) {
        sections.push(content.slice(i, i + MAX_CHARS));
    }

    // Score each chunk and keep track of the top two sections
    const scoredSections = sections.map(section => ({
        section,
        score: calculateJobContentScore(section)
    }));

    // Sort sections by score in descending order and select the top two
    scoredSections.sort((a, b) => b.score - a.score);
    const topSections = scoredSections.slice(0, 2).map(s => s.section);

    // Combine the top sections, ensuring total length doesn't exceed MAX_CHARS
    let combinedSections = topSections.join('\n\n');
    if (combinedSections.length > MAX_CHARS) {
        combinedSections = combinedSections.slice(0, MAX_CHARS);
        
        // Try to end at a complete sentence
        const lastPeriod = combinedSections.lastIndexOf('.');
        const lastNewline = combinedSections.lastIndexOf('\n');
        const cutoff = Math.max(lastPeriod, lastNewline);
        
        if (cutoff > MAX_CHARS * 0.8) { // Only truncate at sentence if we keep at least 80%
            combinedSections = combinedSections.slice(0, cutoff + 1);
        }
    }

    return combinedSections;
  }

function calculateJobContentScore(text: string): number {
    const MAX_TOKENS = 1500;
    const lowerText = text.toLowerCase();
    let score = 0;

    // Keywords that indicate job content
    const keywords = [
      'leadership', 'co-founder', 'team', 'executive', 'board', 'leaders', 'directors', 
      'position', 'role', 'ceo', 'president', 'cfo', 'coo', 'chief', 
      'vp', 'vice president', 'management', 'founder', 'partner', 
      'owner', 'officer', 'chair', 'principal', 'advisor', 
      'head', 'executive team', 'leadership team', 'senior management',
      'company officers', 'key personnel', 'corporate officers', 'governance',
      'administration', 'executive committee', 'managing director'
    ];
    

    // Job titles from constants
    const roleTitles = COMMON_EXECUTIVE_KEYWORDS;

    // Score based on keywords
    keywords.forEach(keyword => {
        if (lowerText.includes(keyword)) score += 2;
    });

    // Score based on job titles
    roleTitles.forEach(title => {
        if (title && lowerText.includes(title.toLowerCase())) score += 3;
    });

    // Bonus points for multiple job listings
    const jobCount = (lowerText.match(/position|role|job/g) || []).length;
    score += Math.min(jobCount, 5); // Cap at 5 bonus points

    return score;
  }

export function parseJobsFromResponse(response: string): LLMResponse {
    try {
      const parsed = JSON.parse(response.trim());
  
      // Map each executive to match the `Executive` interface
      const executives = (parsed.executives || []).map((executive: any) => ({
        name: executive.name || "",
        title: executive.title || ""
      }));
  
      return { executives };
    } catch (error) {
      Logger.error('Error parsing LLM response', error as Error);
      return { executives: [] };  // Return an empty array if parsing fails
    }
  }
  
export async function puppeteerWebpageExtraction(url: string): Promise<string> {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
  
    try {
      await page.goto(url, { waitUntil: 'networkidle2' });
  
      var allText = ''
      const textSnippet = await page.evaluate(() => {
        // Get all text from the document body
        allText = document.body.innerText.trim();
        return allText;

      });
  
      return textSnippet;
    } catch (error) {
      console.error(`Failed to get all text from ${url}:`, error);
      return '';
    } finally {
      await browser.close();
    }
  }

export function removeStopWords(text: string): string {
  const stopWords = natural.stopwords;
  const tokenizer = new natural.WordTokenizer();
  const tokens = tokenizer.tokenize(text);
  const filteredTokens = tokens.filter(word => !stopWords.includes(word.toLowerCase()));
  return filteredTokens.join(' ');
}

export async function scrapeURLs(urls: string[], httpClient: HttpClient): Promise<Executive[]> {
  var executivesData: Executive[] = [];
  for (const url of urls) {
    Logger.info(`Scraping URL: ${url}`);
    const isAllowed = await httpClient.checkRobotsTxt(url);
    if (!isAllowed) {
      Logger.warn(`Scraping not allowed for ${url}, skipping...`);
      continue;
    }

    try {
      const jobPageHtml = await httpClient.get(url);
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
        Logger.info(`No content extracted from ${url}, trying Puppeteer...`);
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
      return executivesData;
    } catch (error) {
      Logger.warn(`Error fetching job page for ${url} ${error}:`);
      return []; 
    }
  }

  return [];
}





