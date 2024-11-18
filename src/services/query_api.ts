import axios from 'axios';
import { Executive } from '../types';
import { Logger } from '../utils/logger';
import { OpenAI } from 'openai';
import { parseJobsFromResponse } from './webpage_content'


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
    
    const urls = response.data.organic_results
      .map(result => result.link)
      .slice(0, num_responses);

    return urls;
  } catch (error) {
    console.error("Failed to fetch data from SERP API:", error);
    return [];
  }
}

export async function queryChat(content: string, url: string): Promise<Executive[]> {
  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY }); 

    const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{
          role: "system",
          content: "I will give you a chunk of text that contains information about the company's top executives. Please parse it and return a json of the top executive's names and their ."
        }, {
          role: "user",
          content: createFocusedPrompt(content)
        }],
        response_format: { type: "json_object" },
        max_tokens: 1000, // Leave room for response
        temperature: 0,
        stop: ["\n\n"]
      });

      return parseJobsFromResponse(response.choices[0].message?.content ?? '');
  } catch (error) {
    Logger.error('Error extracting jobs with LLM', error as Error);
    return [];
  }
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
  - Any roles that include the "Talent" keyword
  
  Exclude any roles that contain science-specific keywords or unrelated titles. 
  Do not include titles that contain words such as "Scientific," "Biology," "Science," "Research," or "Laboratory," unless the full title matches the specified roles above.  
  Only return the JSON format with no additional text. If no relevant executives are found, return an empty array.

  'Refer to the following content: ${content}`;

}

export async function queryParaformAPI(company_domain: string): Promise<Executive[]> {
  const url = `https://www.paraform.com/api/leads/find_from_domain?url=${company_domain}`;
  try {
    const response = await axios.get(url);

    if (response.status === 200) {
      const leads = response.data;
      const apolloExecutives: Executive[] = leads.map((lead: any) => ({
        name: lead.name,
        title: lead.position,
        linkedin: lead.linkedin_url
      }));
      return apolloExecutives;
    } 
    
    else {
      console.error(`Error: Received status code ${response.status}`);
      return [];
    }
  } catch (error) {
    console.error("Error fetching leads:", error);
    return [];
  }
}

export async function queryApolloAPI(company_domain: string): Promise<Executive[]> {
  const url = `https://api.apollo.io/api/v1/organizations/enrich?domain=${company_domain}`;
  const options: RequestInit = {
    method: 'GET',
    headers: {
      accept: 'application/json',
      'Cache-Control': 'no-cache',
      'Content-Type': 'application/json',
      'x-api-key': '3_RkqXYANJGYk3fXMY_GAA'
    }
  };

  try {
    const response = await fetch(url, options);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const json = await response.json();
    console.log(json);
  } catch (err) {
    console.error("Failed to fetch organization details:", err);
  }
  return [];
}






