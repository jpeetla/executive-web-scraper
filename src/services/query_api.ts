import axios from 'axios';
import { Logger } from '../utils/logger';
import { COMMON_EXECUTIVE_KEYWORDS } from '../config/constants';
import { OpenAI } from 'openai';
import os from 'os';
import { LLMResponse } from '../types';

interface SerpApiResponse {
  organic_results: { link: string }[];
}

export async function querySerpApi(companyName: string, query: string): Promise<string[]> {
  const prompt = `${companyName} ${query}`
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
      .slice(0, 5);

    return urls;
  } catch (error) {
    console.error("Failed to fetch data from SERP API:", error);
    return [];
  }
}

export async function findExecutiveLinkedIn(name: string, companyName: string): Promise<string> {
  const url = 'https://api.apollo.io/api/v1/people/match?reveal_personal_emails=false&reveal_phone_number=false';
  const apiKey = process.env.APOLLO_API_KEY;

  const options = {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'Cache-Control': 'no-cache',
      'Content-Type': 'application/json',
      'x-api-key': apiKey as string
    },
    body: JSON.stringify({
      name: name,
      organization_name: companyName
    })
  };

  try {
    const response = await fetch(url, options);
    const data = await response.json();

    if (data) {
      return "";
    } else {
      return ""; 
    }
  } catch (error) {
    console.error("Error fetching executive information:", error);
    return ""; // Return null if an error occurs
  }
}

export async function apolloPeopleSearch(companyName: string): Promise<string> {
  const options = {
    method: 'POST',
    url: `https://api.apollo.io/api/v1/mixed_people/search?person_titles[]=CEO&person_titles[]=CTO&person_titles[]=COO&person_titles[]=Director%20of%20Engineering&person_titles[]=VP%20of%20Engineering&person_titles[]=Head%20of%20Operations&person_titles[]=VP%20of%20People&person_titles[]=Chief%20of%20Staff&person_titles[]=Chief%20People%20Officer&person_titles[]=VP%20of%20Talent%20Acquisition&person_titles[]=Head%20of%20Talent%20Acquisition&q_organization_domains=${companyName}`,
    headers: {
      accept: 'application/json',
      'Cache-Control': 'no-cache',
      'Content-Type': 'application/json',
      'x-api-key': 'lbHWXQpjPnt0uAWvOgU1qg'
    }
  };

  axios
    .request(options)
    .then(res => console.log(res.data))
    .catch(err => console.error(err));
  return "";
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
    const MAX_TOKENS = 1500;
    const AVERAGE_CHARS_PER_TOKEN = 4; 
    const MAX_CHARS = MAX_TOKENS * AVERAGE_CHARS_PER_TOKEN;

    //Clean Content
    let cleaned = content
      .replace(/\s+/g, ' ')
      .replace(/[^\w\s-.,()]/g, '')
      .trim();

    // Find the most relevant section if content is too long
    if (cleaned.length > MAX_CHARS) {
      Logger.info(`Content too long (${cleaned.length} chars), extracting most relevant section`);
      cleaned = extractMostRelevantSection(cleaned);
    }

    // Final truncation if still too long
    if (cleaned.length > MAX_CHARS) {
      Logger.info(`Truncating content from ${cleaned.length} to ${MAX_CHARS} chars`);
      cleaned = cleaned.slice(0, MAX_CHARS);
      
      // Try to end at a complete sentence or job listing
      const lastPeriod = cleaned.lastIndexOf('.');
      const lastNewline = cleaned.lastIndexOf('\n');
      const cutoff = Math.max(lastPeriod, lastNewline);
      
      if (cutoff > MAX_CHARS * 0.8) { // Only truncate at sentence if we keep at least 80%
        cleaned = cleaned.slice(0, cutoff + 1);
      }
    }

    return cleaned;
  }

  function extractMostRelevantSection(content: string): string {
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

 function calculateJobContentScore(text: string): number {
    const MAX_TOKENS = 1500;
    const lowerText = text.toLowerCase();
    let score = 0;

    // Keywords that indicate job content
    const keywords = [
      'leadership', 'team', 'executive',
      'board', 'leaders', 'directors',
      'position', 'role', 'CEO', 'president'
    ];

    // Job titles from constants
    const jobTitles = COMMON_EXECUTIVE_KEYWORDS;

    // Score based on keywords
    keywords.forEach(keyword => {
        if (lowerText.includes(keyword)) score += 2;
    });

    // Score based on job titles
    jobTitles.forEach(title => {
        if (title && lowerText.includes(title.toLowerCase())) score += 3;
    });

    // Bonus points for multiple job listings
    const jobCount = (lowerText.match(/position|role|job/g) || []).length;
    score += Math.min(jobCount, 5); // Cap at 5 bonus points

    return score;
  }

function createFocusedPrompt(content: string): string {
  return`I am providing you with text from a company's page. Extract the names and titles of the executives in JSON format like this:
  [
    {"name": "John Doe", "title": "CEO"},
    {"name": "Jane Smith", "title": "COO"}
  ]
  Only return this JSON format with no additional text. If no executives are found, return an empty array.

  Text: ${content}`;
}

function parseJobsFromResponse(response: string, fallbackUrl: string): LLMResponse {
  try {
    const parsed = JSON.parse(response);

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




