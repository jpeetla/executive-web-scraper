import { COMMON_EXECUTIVE_KEYWORDS } from '../config/constants';
import puppeteer, { Browser, Page } from 'puppeteer';
import { LLMResponse } from '../types';
import { Logger } from '../utils/logger';
import * as cheerio from 'cheerio';

export async function cleanContentforLLM(content: string, url: string): Promise<string> {
    const MAX_TOKENS = 4000;
    const AVERAGE_CHARS_PER_TOKEN = 4; 
    const MAX_CHARS = MAX_TOKENS * AVERAGE_CHARS_PER_TOKEN;

    // If short enough, return content as is
    if (content.length <= MAX_CHARS) {
        return content;
    }
    
    // Find the most relevant section if content is too long
    if (content.length > MAX_CHARS) {
      Logger.info(`Extracting most relevant paragraph...`);
      content = extractMostRelevantParagraph(content);
    }

    // Split into chunks of 6000 CHARACTERS & Return top 2 sections
    if (content.length > MAX_CHARS) {
      Logger.info(`Extracting top 2 sections instead...`);
      content = extractTopTwoSections(content);
    }

    return content;
  }

function extractMostRelevantParagraph(content: string): string {
    const MAX_TOKENS = 1500;
    const AVERAGE_CHARS_PER_TOKEN = 4; 
    const MAX_CHARS = MAX_TOKENS * AVERAGE_CHARS_PER_TOKEN;
    
    // Split into paragraphs or sections
    const sections = content.split(/\n\s*\n/);
    let bestSection = '';
    let bestScore = 0;

    for (const section of sections) {
      const score = calculateJobContentScore(section);
      if (score > bestScore) {
        bestScore = score;
        bestSection = section;
      }
    }

    return bestSection || content.slice(0, MAX_CHARS);
  }

function extractTopTwoSections(content: string): string {
    const CHUNK_SIZE = 6000;
    const MAX_TOKENS = 1500;
    const AVERAGE_CHARS_PER_TOKEN = 4; 
    const MAX_CHARS = MAX_TOKENS * AVERAGE_CHARS_PER_TOKEN;

    // Split content into chunks of approximately CHUNK_SIZE characters
    const sections = [];
    for (let i = 0; i < content.length; i += CHUNK_SIZE) {
        sections.push(content.slice(i, i + CHUNK_SIZE));
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
  

  // export async function getAllTextFromPage(url: string): Promise<string> {
  //   const browser = await puppeteer.launch();
  //   const page = await browser.newPage();
  
  //   try {
  //     await page.goto(url, { waitUntil: 'networkidle2' });
  
  //     var allText = ''
  //     const textSnippet = await page.evaluate(() => {
  //       // Get all text from the document body
  //       allText = document.body.innerText.trim();
  //       return allText;

  //     });
  
  //     return textSnippet;
  //   } catch (error) {
  //     console.error(`Failed to get all text from ${url}:`, error);
  //     return '';
  //   } finally {
  //     await browser.close();
  //   }
  // }


  export async function getAllTextFromPage(url: string): Promise<string> {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
  
    try {
      await page.goto(url, { waitUntil: 'networkidle2' });
  
      const allText = await page.evaluate(() => {
        // Helper function to recursively get all text within an element
        function getTextFromElement(element: Element): string {
          let text = '';
          element.childNodes.forEach((node) => {
            if (node.nodeType === Node.TEXT_NODE) {
              text += node.textContent?.trim() + ' ';
            } else if (node.nodeType === Node.ELEMENT_NODE) {
              text += getTextFromElement(node as Element) + ' ';
            }
          });
          return text.trim();
        }
  
        // Get text from h2, h3, p, div, and span elements
        const elements = document.querySelectorAll('h2, h3, p, div, span');
        let collectedText = '';
  
        elements.forEach((element) => {
          const elementText = getTextFromElement(element);
          if (elementText.length > 20) { // Filter out very short texts
            collectedText += elementText + '\n\n';
          }
        });
        const cleanedText = allText.replace(/<[^>]*>/g, '').trim();

  
        // Trim collected text to ensure it stays within desired length
        return collectedText
      });
  
      return allText;
    } catch (error) {
      console.error(`Failed to get all text from ${url}:`, error);
      return '';
    } finally {
      await browser.close();
    }
  }

  
  