import { JobPosting } from '../types';
export declare class Parser {
    private static openai;
    private static readonly MAX_TOKENS;
    private static readonly AVERAGE_CHARS_PER_TOKEN;
    private static readonly MAX_CHARS;
    static extractJobsWithLLM(content: string, url: string): Promise<JobPosting[]>;
    private static prepareContentForLLM;
    private static extractMostRelevantSection;
    private static calculateJobContentScore;
    private static createFocusedPrompt;
    private static parseJobsFromResponse;
    private static deduplicateJobs;
}
