"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Parser = void 0;
const openai_1 = require("openai");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const logger_1 = require("../utils/logger");
const constants_1 = require("../config/constants");
class Parser {
    static async extractJobsWithLLM(content, url) {
        try {
            if (!content?.trim()) {
                return [];
            }
            // Clean and truncate content before sending to LLM
            const processedContent = this.prepareContentForLLM(content);
            logger_1.Logger.info(`Sending ${processedContent.length} characters to LLM for ${url}`);
            const response = await this.openai.chat.completions.create({
                model: "gpt-3.5-turbo",
                messages: [{
                        role: "system",
                        content: "Extract job postings and return them in JSON format. Return only valid job postings with clear titles."
                    }, {
                        role: "user",
                        content: this.createFocusedPrompt(processedContent, url)
                    }],
                response_format: { type: "json_object" },
                max_tokens: 1000,
                temperature: 0.1
            });
            return this.parseJobsFromResponse(response.choices[0].message?.content ?? '', url);
        }
        catch (error) {
            logger_1.Logger.error('Error extracting jobs with LLM', error);
            return [];
        }
    }
    static prepareContentForLLM(content) {
        // First clean the content
        let cleaned = content
            .replace(/\s+/g, ' ')
            .replace(/[^\w\s-.,()]/g, '')
            .trim();
        // Find the most relevant section if content is too long
        if (cleaned.length > this.MAX_CHARS) {
            logger_1.Logger.info(`Content too long (${cleaned.length} chars), extracting most relevant section`);
            cleaned = this.extractMostRelevantSection(cleaned);
        }
        // Final truncation if still too long
        if (cleaned.length > this.MAX_CHARS) {
            logger_1.Logger.info(`Truncating content from ${cleaned.length} to ${this.MAX_CHARS} chars`);
            cleaned = cleaned.slice(0, this.MAX_CHARS);
            // Try to end at a complete sentence or job listing
            const lastPeriod = cleaned.lastIndexOf('.');
            const lastNewline = cleaned.lastIndexOf('\n');
            const cutoff = Math.max(lastPeriod, lastNewline);
            if (cutoff > this.MAX_CHARS * 0.8) { // Only truncate at sentence if we keep at least 80%
                cleaned = cleaned.slice(0, cutoff + 1);
            }
        }
        return cleaned;
    }
    static extractMostRelevantSection(content) {
        // Split into paragraphs or sections
        const sections = content.split(/\n\s*\n/);
        let bestSection = '';
        let bestScore = 0;
        for (const section of sections) {
            const score = this.calculateJobContentScore(section);
            if (score > bestScore) {
                bestScore = score;
                bestSection = section;
            }
        }
        return bestSection || content.slice(0, this.MAX_CHARS);
    }
    static calculateJobContentScore(text) {
        const lowerText = text.toLowerCase();
        let score = 0;
        // Keywords that indicate job content
        const keywords = [
            'job description', 'requirements', 'qualifications',
            'responsibilities', 'experience', 'skills',
            'position', 'role', 'title', 'apply'
        ];
        // Job titles from constants
        const jobTitles = constants_1.COMMON_JOB_TITLES;
        // Score based on keywords
        keywords.forEach(keyword => {
            if (lowerText.includes(keyword))
                score += 2;
        });
        // Score based on job titles
        jobTitles.forEach(title => {
            if (lowerText.includes(title.toLowerCase()))
                score += 3;
        });
        // Bonus points for multiple job listings
        const jobCount = (lowerText.match(/position|role|job/g) || []).length;
        score += Math.min(jobCount, 5); // Cap at 5 bonus points
        return score;
    }
    static createFocusedPrompt(content, url) {
        return `Extract job postings from: ${url}
    Return as JSON in this format: {"jobs": [{"title": "...", "location": "...", "department": "...", "description": "...", "url": "..."}]}
    Content: ${content}`;
    }
    static parseJobsFromResponse(response, fallbackUrl) {
        try {
            const parsed = JSON.parse(response);
            return (parsed.jobs || []).map((job) => ({
                title: job.title || 'Unknown Title',
                location: job.location || 'Not specified',
                department: job.department || 'Not specified',
                description: job.description || '',
                url: job.url || fallbackUrl,
                company: job.company,
                employmentType: job.employmentType,
                salary: job.salary,
                experienceLevel: job.experienceLevel,
                postedDate: job.postedDate,
                skills: job.skills,
                benefits: job.benefits,
                isRemote: job.isRemote
            }));
        }
        catch (error) {
            logger_1.Logger.error('Error parsing LLM response', error);
            return [];
        }
    }
    static deduplicateJobs(jobs) {
        const seen = new Set();
        return jobs.filter(job => {
            const key = `${job.title}-${job.location}-${job.department}`;
            if (seen.has(key))
                return false;
            seen.add(key);
            return true;
        });
    }
}
exports.Parser = Parser;
Parser.openai = new openai_1.OpenAI({ apiKey: process.env.OPENAI_API_KEY });
Parser.MAX_TOKENS = 1500;
Parser.AVERAGE_CHARS_PER_TOKEN = 4; // GPT typically uses ~4 chars per token
Parser.MAX_CHARS = Parser.MAX_TOKENS * Parser.AVERAGE_CHARS_PER_TOKEN;
