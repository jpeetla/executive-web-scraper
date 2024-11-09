import { LLMResponse } from '../types';
export declare function querySerpApi(prompt: string, num_responses: number): Promise<string[]>;
export declare function queryChat(content: string, url: string): Promise<LLMResponse>;
