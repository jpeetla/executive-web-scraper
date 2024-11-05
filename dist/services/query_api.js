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
async function querySerpApi(companyName) {
    const apiKey = "0fe2bae7badde0df4430892bba286f6394526f0d52f3e539be9b16c1340f6c14";
    const params = {
        q: `${companyName} leadership team OR board of directors OR executive profiles`,
        location: "Austin, Texas, United States",
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
            .slice(0, 3);
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
        const openai = new openai_1.OpenAI({ apiKey: "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" });
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
            temperature: 0.1
        });
        const messageContent = response.choices[0].message?.content;
        return messageContent;
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
        'job description', 'requirements', 'qualifications',
        'responsibilities', 'experience', 'skills',
        'position', 'role', 'title', 'apply'
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
    return `Find company executives from the following text:
    Return as JSON in this format: {"executive_name": "role_title"}
    Content: ${content}`;
}
