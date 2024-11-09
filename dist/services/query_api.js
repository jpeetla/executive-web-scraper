"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.queryChat = exports.querySerpApi = void 0;
const axios_1 = __importDefault(require("axios"));
const logger_1 = require("../utils/logger");
const constants_1 = require("../config/constants");
const openai_1 = require("openai");
async function querySerpApi(prompt, num_responses) {
    const apiKey = process.env.SERP_API_KEY;
    const params = {
        q: prompt,
        hl: "en",
        gl: "us",
        google_domain: "google.com",
        api_key: apiKey
    };
    try {
        const response = await axios_1.default.get('https://serpapi.com/search', { params });
        // Extract URLs from the organic results, limiting to the top 5
        const urls = response.data.organic_results
            .map(result => result.link)
            .slice(0, num_responses);
        return urls;
    }
    catch (error) {
        console.error("Failed to fetch data from SERP API:", error);
        return [];
    }
}
exports.querySerpApi = querySerpApi;
async function queryChat(content, url) {
    try {
        const openai = new openai_1.OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        const processedContent = prepareContentForLLM(content);
        logger_1.Logger.info(`Sending ${processedContent.length} characters to LLM for ${url}`);
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
            max_tokens: 1000,
            temperature: 0,
            stop: ["\n\n"]
        });
        return parseJobsFromResponse(response.choices[0].message?.content ?? '', url);
    }
    catch (error) {
        logger_1.Logger.error('Error extracting jobs with LLM', error);
        return { executives: [] };
    }
}
exports.queryChat = queryChat;
function prepareContentForLLM(content) {
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
        logger_1.Logger.info(`Content too long (${cleaned.length} chars), extracting most relevant section`);
        cleaned = extractMostRelevantParagraph(cleaned);
    }
    // Final truncation if still too long
    if (cleaned.length > MAX_CHARS) {
        logger_1.Logger.info(`Extracting top 2 sections instead...`);
        cleaned = extractTopTwoSections(cleaned);
    }
    return cleaned;
}
function extractMostRelevantParagraph(content) {
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
function extractTopTwoSections(content) {
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
function calculateJobContentScore(text) {
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
    const roleTitles = constants_1.COMMON_EXECUTIVE_KEYWORDS;
    // Score based on keywords
    keywords.forEach(keyword => {
        if (lowerText.includes(keyword))
            score += 2;
    });
    // Score based on job titles
    roleTitles.forEach(title => {
        if (title && lowerText.includes(title.toLowerCase()))
            score += 3;
    });
    // Bonus points for multiple job listings
    const jobCount = (lowerText.match(/position|role|job/g) || []).length;
    score += Math.min(jobCount, 5); // Cap at 5 bonus points
    return score;
}
function createFocusedPrompt(content) {
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
  
  Ignore any other roles that do not match this list.
  Only return the JSON format with no additional text. If no relevant executives are found, return an empty array.

  Text: ${content}`;
}
function parseJobsFromResponse(response, fallbackUrl) {
    try {
        const parsed = JSON.parse(response.trim());
        // Map each executive to match the `Executive` interface
        const executives = (parsed.executives || []).map((executive) => ({
            name: executive.name || "",
            title: executive.title || ""
        }));
        return { executives };
    }
    catch (error) {
        logger_1.Logger.error('Error parsing LLM response', error);
        return { executives: [] }; // Return an empty array if parsing fails
    }
}
