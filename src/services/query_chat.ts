import { Executive } from "../types";
import { OpenAI } from "openai";
import { Logger } from "../utils/logger";

export async function queryChat(
  content: string,
  queryType: string,
  company_name: string
): Promise<Executive[]> {
  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content:
            "I will give you a chunk of text that contains information about the company's top executives. Please parse it and return a json of the top executive's names and their .",
        },
        {
          role: "user",
          content: contentForChat(content, queryType),
        },
      ],
      response_format: { type: "json_object" },
      max_tokens: 1000,
      temperature: 0,
      stop: ["\n\n"],
    });

    return parseJobsFromResponse(
      response.choices[0].message?.content ?? "",
      queryType,
      company_name
    );
  } catch (error) {
    Logger.error("Error extracting jobs with LLM", error as Error);
    return [];
  }
}

function contentForChat(content: string, queryType: string) {
  let executiveReturnStructure = "";

  if (queryType === "webpage") {
    executiveReturnStructure =
      'executives = [{"name": "John Doe", "title": "CEO"}, {"name": "Jane Smith", "title": "COO"}]';
  }

  if (queryType === "crust") {
    executiveReturnStructure =
      'executives = [{"name": "John Doe", "title": "CEO", "linkedin: "https://www.linkedin.com/in/johndoe"}, {"name": "Jane Smith", "title": "COO", "linkedin: "https://www.linkedin.com/in/janesmith"}]';
  }

  return `I am providing you with text from a company's page. Extract only the names, titles, and linkedin_profile urls of the top executives who hold specific roles, and return them in JSON format like this:
    ${executiveReturnStructure}
    
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

function parseJobsFromResponse(
  response: string,
  queryType: string,
  company_name: string
): Executive[] {
  try {
    const parsed = JSON.parse(response.trim());

    const executives = (parsed.executives || []).map((executive: any) => {
      const baseExecutive = {
        name: executive.name || "",
        title: executive.title || "",
        source: queryType,
      };

      if (queryType === "crust") {
        return {
          ...baseExecutive,
          linkedin: executive.linkedin || "",
          domain: company_name || "",
        };
      }

      return baseExecutive;
    });

    return executives;
  } catch (error) {
    Logger.error("Error parsing LLM response", error as Error);
    return [];
  }
}
