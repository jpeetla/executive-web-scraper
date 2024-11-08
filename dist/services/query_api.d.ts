import { LLMResponse } from '../types';
export declare function querySerpApi(prompt: string): Promise<string[]>;
export declare function findExecutiveLinkedIn(name: string, companyName: string): Promise<string>;
export declare function apolloPeopleSearch(companyName: string): Promise<string>;
export declare function queryChat(content: string, url: string): Promise<LLMResponse>;
