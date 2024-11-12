import axios from 'axios';
import { Logger } from '../utils/logger';
import { OpenAI } from 'openai';
import { LLMResponse } from '../types';
import { parseJobsFromResponse } from './webpage_content'
import Anthropic from '@anthropic-ai/sdk';


interface SerpApiResponse {
  organic_results: { link: string }[];
}

// export async function downloadWebpageAsPDF(url: string): Promise<void> {
//   try {
//     // Launch a new browser instance
//     const browser = await puppeteer.launch();
//     const page = await browser.newPage();
    
//     // Navigate to the specified URL
//     await page.goto(url, { waitUntil: 'networkidle2' });
    
//     // Generate the PDF and save it in the current directory
//     const fileName = path.resolve('./webpage.pdf'); // Ensures it saves in the current working directory
//     await page.pdf({
//       path: fileName,
//       format: 'A4',   // You can adjust the format based on your needs
//       printBackground: true, // Print background graphics if needed
//     });

//     // Close the browser
//     await browser.close();

//     console.log(`PDF successfully created at ./${fileName}`);
//   } catch (error) {
//     console.error('Error generating PDF:', error);
//   }
// }

// export async function queryClaude(filePath: string): Promise<LLMResponse> {
//   try {
//     const anthropicApiKey = process.env.CLAUDE_API_KEY;
//     const anthropic = new Anthropic({
//       apiKey: anthropicApiKey, 
//     });

//     console.log(filePath);
//     const msg = await anthropic.messages.create({
//       model: "claude-3-5-sonnet-20241022",
//       max_tokens: 1024,
//       messages: [
//         { 
//           role: "user", 
//           content: createFocusedPrompt(), 
//         },
//         {
//           role: "user",
//           content: `{"type": "document", "source": {"type": "base64", "media_type": "application/pdf", "data": "${filePath}"}}`
//         }
//       ],
//     });

//     console.log(msg);
//     return parseJobsFromResponse(msg.toString());
//   } catch(error) {
//     Logger.error('Error extracting jobs with LLM', error as Error);
//     return { executives: [] };
//   }
// }

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
    return { executives: [] };
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






