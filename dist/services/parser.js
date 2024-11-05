"use strict";
// import { OpenAI } from 'openai';
// import { JobPosting } from '../types';
// import dotenv from 'dotenv';
// dotenv.config();
// import { Logger } from '../utils/logger';
// import { COMMON_EXECUTIVE_KEYWORDS } from '../config/constants';
// export class Parser {
//   private static openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
//   private static readonly MAX_TOKENS = 1500;
//   private static readonly AVERAGE_CHARS_PER_TOKEN = 4; // GPT typically uses ~4 chars per token
//   private static readonly MAX_CHARS = Parser.MAX_TOKENS * Parser.AVERAGE_CHARS_PER_TOKEN;
//   static async extractJobsWithLLM(content: string, url: string): Promise<JobPosting[]> {
//     try {
//       if (!content?.trim()) {
//         return [];
//       }
//       // Clean and truncate content before sending to LLM
//       const processedContent = this.prepareContentForLLM(content);
//       Logger.info(`Sending ${processedContent.length} characters to LLM for ${url}`);
//       const response = await this.openai.chat.completions.create({
//         model: "gpt-3.5-turbo",
//         messages: [{
//           role: "system",
//           content: "If there are job postings, extract them and return them in JSON format. Return only valid job postings with clear titles. Otherwise, return an empty array."
//         }, {
//           role: "user",
//           content: this.createFocusedPrompt(processedContent, url)
//         }],
//         response_format: { type: "json_object" },
//         max_tokens: 1000, // Leave room for response
//         temperature: 0.1
//       });
//       return this.parseJobsFromResponse(response.choices[0].message?.content ?? '', url);
//     } catch (error) {
//       Logger.error('Error extracting jobs with LLM', error as Error);
//       return [];
//     }
//   }
//   private static prepareContentForLLM(content: string): string {
//     // First clean the content
//     let cleaned = content
//       .replace(/\s+/g, ' ')
//       .replace(/[^\w\s-.,()]/g, '')
//       .trim();
//     // Find the most relevant section if content is too long
//     if (cleaned.length > this.MAX_CHARS) {
//       Logger.info(`Content too long (${cleaned.length} chars), extracting most relevant section`);
//       cleaned = this.extractMostRelevantSection(cleaned);
//     }
//     // Final truncation if still too long
//     if (cleaned.length > this.MAX_CHARS) {
//       Logger.info(`Truncating content from ${cleaned.length} to ${this.MAX_CHARS} chars`);
//       cleaned = cleaned.slice(0, this.MAX_CHARS);
//       // Try to end at a complete sentence or job listing
//       const lastPeriod = cleaned.lastIndexOf('.');
//       const lastNewline = cleaned.lastIndexOf('\n');
//       const cutoff = Math.max(lastPeriod, lastNewline);
//       if (cutoff > this.MAX_CHARS * 0.8) { // Only truncate at sentence if we keep at least 80%
//         cleaned = cleaned.slice(0, cutoff + 1);
//       }
//     }
//     return cleaned;
//   }
//   private static extractMostRelevantSection(content: string): string {
//     // Split into paragraphs or sections
//     const sections = content.split(/\n\s*\n/);
//     let bestSection = '';
//     let bestScore = 0;
//     for (const section of sections) {
//       const score = this.calculateJobContentScore(section);
//       if (score > bestScore) {
//         bestScore = score;
//         bestSection = section;
//       }
//     }
//     return bestSection || content.slice(0, this.MAX_CHARS);
//   }
//   private static calculateJobContentScore(text: string): number {
//     const lowerText = text.toLowerCase();
//     let score = 0;
//     // Keywords that indicate job content
//     const keywords = [
//       'job description', 'requirements', 'qualifications',
//       'responsibilities', 'experience', 'skills',
//       'position', 'role', 'title', 'apply'
//     ];
//     // Job titles from constants
//     const jobTitles = COMMON_JOB_TITLES;
//     // Score based on keywords
//     keywords.forEach(keyword => {
//       if (lowerText.includes(keyword)) score += 2;
//     });
//     // Score based on job titles
//     jobTitles.forEach(title => {
//       if (lowerText.includes(title.toLowerCase())) score += 3;
//     });
//     // Bonus points for multiple job listings
//     const jobCount = (lowerText.match(/position|role|job/g) || []).length;
//     score += Math.min(jobCount, 5); // Cap at 5 bonus points
//     return score;
//   }
//   private static createFocusedPrompt(content: string, url: string): string {
//     return `Extract job postings from: ${url}
//     Return as JSON in this format: {"jobs": [{"title": "...", "location": "...", "department": "...", "description": "...", "url": "..."}]}
//     Content: ${content}`;
//   }
//   private static parseJobsFromResponse(response: string, fallbackUrl: string): JobPosting[] {
//     try {
//       const parsed = JSON.parse(response);
//       return (parsed.jobs || []).map((job: any) => ({
//         title: job.title || 'Unknown Title',
//         location: job.location || 'Not specified',
//         department: job.department || 'Not specified',
//         description: job.description || '',
//         url: job.url || fallbackUrl,
//         company: job.company,
//         employmentType: job.employmentType,
//         salary: job.salary,
//         experienceLevel: job.experienceLevel,
//         postedDate: job.postedDate,
//         skills: job.skills,
//         benefits: job.benefits,
//         isRemote: job.isRemote
//       }));
//     } catch (error) {
//       Logger.error('Error parsing LLM response', error as Error);
//       return [];
//     }
//   }
//   private static deduplicateJobs(jobs: JobPosting[]): JobPosting[] {
//     const seen = new Set<string>();
//     return jobs.filter(job => {
//       const key = `${job.title}-${job.location}-${job.department}`;
//       if (seen.has(key)) return false;
//       seen.add(key);
//       return true;
//     });
//   }
// }
