"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.queryChat = exports.apolloPeopleSearch = exports.findExecutiveLinkedIn = exports.querySerpApi = void 0;
const axios_1 = __importDefault(require("axios"));
const logger_1 = require("../utils/logger");
const constants_1 = require("../config/constants");
const openai_1 = require("openai");
async function querySerpApi(companyName, query) {
    const prompt = `${companyName} ${query}`;
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
            .slice(0, 5);
        return urls;
    }
    catch (error) {
        console.error("Failed to fetch data from SERP API:", error);
        return [];
    }
}
exports.querySerpApi = querySerpApi;
async function findExecutiveLinkedIn(name, companyName) {
    const url = 'https://api.apollo.io/api/v1/people/match?reveal_personal_emails=false&reveal_phone_number=false';
    const apiKey = process.env.APOLLO_API_KEY;
    const options = {
        method: 'POST',
        headers: {
            accept: 'application/json',
            'Cache-Control': 'no-cache',
            'Content-Type': 'application/json',
            'x-api-key': apiKey
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
        }
        else {
            return "";
        }
    }
    catch (error) {
        console.error("Error fetching executive information:", error);
        return ""; // Return null if an error occurs
    }
}
exports.findExecutiveLinkedIn = findExecutiveLinkedIn;
async function apolloPeopleSearch(companyName) {
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
    axios_1.default
        .request(options)
        .then(res => console.log(res.data))
        .catch(err => console.error(err));
    return "";
}
exports.apolloPeopleSearch = apolloPeopleSearch;
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
        const resultText = response.choices[0].message?.content?.trim() ?? '';
        const executiveInfo = JSON.parse(resultText);
        return executiveInfo;
    }
    catch (error) {
        logger_1.Logger.error('Error extracting jobs with LLM', error);
        return "";
    }
}
exports.queryChat = queryChat;
function prepareContentForLLM(content) {
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
        logger_1.Logger.info(`Content too long (${cleaned.length} chars), extracting most relevant section`);
        cleaned = extractMostRelevantSection(cleaned);
    }
    // Final truncation if still too long
    if (cleaned.length > MAX_CHARS) {
        logger_1.Logger.info(`Truncating content from ${cleaned.length} to ${MAX_CHARS} chars`);
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
function extractMostRelevantSection(content) {
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
function calculateJobContentScore(text) {
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
    const jobTitles = constants_1.COMMON_EXECUTIVE_KEYWORDS;
    // Score based on keywords
    keywords.forEach(keyword => {
        if (lowerText.includes(keyword))
            score += 2;
    });
    // Score based on job titles
    jobTitles.forEach(title => {
        if (title && lowerText.includes(title.toLowerCase()))
            score += 3;
    });
    // Bonus points for multiple job listings
    const jobCount = (lowerText.match(/position|role|job/g) || []).length;
    score += Math.min(jobCount, 5); // Cap at 5 bonus points
    return score;
}
function createFocusedPrompt(content) {
    return `I am providing you with text from a company's page. Extract the names and titles of the executives in JSON format like this:
  [
    {"name": "John Doe", "title": "CEO"},
    {"name": "Jane Smith", "title": "COO"}
  ]
  Only return this JSON format with no additional text. If no executives are found, return an empty array.

  Text: ${content}`;
}
