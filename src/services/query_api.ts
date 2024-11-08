import axios from 'axios';
import { Logger } from '../utils/logger';
import { COMMON_EXECUTIVE_KEYWORDS } from '../config/constants';
import { OpenAI } from 'openai';
import os from 'os';
import { LLMResponse } from '../types';

interface SerpApiResponse {
  organic_results: { link: string }[];
}

export async function querySerpApi(prompt: string, num_responses: number): Promise<string[]> {
  const apiKey = process.env.SERP_API_KEY;
  const params = {
    q: prompt,
    hl: "en",
    gl: "us",
    google_domain: "google.com",
    api_key: apiKey
  };

  try {
    const response = await axios.get<SerpApiResponse>('https://serpapi.com/search', { params });
    
    // Extract URLs from the organic results, limiting to the top 5
    const urls = response.data.organic_results
      .map(result => result.link)
      .slice(0, num_responses);

    return urls;
  } catch (error) {
    console.error("Failed to fetch data from SERP API:", error);
    return [];
  }
}

export async function queryChat(content: string, url: string): Promise<LLMResponse> {
  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY }); 

    const processedContent = prepareContentForLLM(content);
    Logger.info(`Sending ${processedContent.length} characters to LLM for ${url}`);

    const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{
          role: "system",
          content: "I will give you a chunk of text that contains information about the company's top executives. Please parse it and return a json of the top executive's names and their ."
        }, {
          role: "user",
          content: createFocusedPrompt(processedContent)
        }],
        response_format: { type: "json_object" },
        max_tokens: 1000, // Leave room for response
        temperature: 0,
        stop: ["\n\n"]
      });

      return parseJobsFromResponse(response.choices[0].message?.content ?? '', url);
  } catch (error) {
    Logger.error('Error extracting jobs with LLM', error as Error);
    return { executives: [] };
  }
}

function prepareContentForLLM(content: string): string {
    const MAX_TOKENS = 2000;
    const AVERAGE_CHARS_PER_TOKEN = 5; 
    const MAX_CHARS = MAX_TOKENS * AVERAGE_CHARS_PER_TOKEN;

    //Clean Content
    let cleaned = content
      .replace(/\s+/g, ' ')
      .replace(/[^\w\s-.,()]/g, '')
      .trim();

    // Find the most relevant section if content is too long
    if (cleaned.length > MAX_CHARS) {
      Logger.info(`Content too long (${cleaned.length} chars), extracting most relevant section`);
      cleaned = extractMostRelevantParagraph(cleaned);
    }

    // Final truncation if still too long
    if (cleaned.length > MAX_CHARS) {
      Logger.info(`Extracting top 2 sections instead...`);
      cleaned = extractTopTwoSections(cleaned);
    }

    return cleaned;
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
    const CHUNK_SIZE = 4000;
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

function createFocusedPrompt(content: string): string {
  return `I am providing you with text from a company's page. Extract only the names and titles of the top executives who hold specific roles, and return them in JSON format like this:
  executives = [
    {"name": "John Doe", "title": "CEO"},
    {"name": "Jane Smith", "title": "COO"}
  ]
  
  Only include executives with one of the following titles:
  - Founders and co-founders (including titles like CEO, CTO, COO)
  - Chief People Officer, VP of Talent Acquisition, VP of People, Chief of Staff, Talent Partner
  - Head of Talent Acquisition, Head of People
  - VP of Engineering, VP of Operations
  
  Ignore any other roles that do not match this list.
  Only return the JSON format with no additional text. If no relevant executives are found, return an empty array.

  Text: ${content}`;

}

function parseJobsFromResponse(response: string, fallbackUrl: string): LLMResponse {
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




