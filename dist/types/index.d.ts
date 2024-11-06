export interface JobPosting {
    title: string;
    url: string;
    location?: string;
    description?: string;
    company?: string;
    department?: string;
    employmentType?: string;
    salary?: string;
    experienceLevel?: string;
    postedDate?: string;
    skills?: string[];
    benefits?: string[];
    isRemote?: boolean;
}
export interface CrawlerOptions {
    maxDepth?: number;
    timeout?: number;
    maxConcurrentRequests?: number;
}
export interface HttpClientConfig {
    timeout?: number;
    userAgent?: string;
    retries?: number;
    retryDelay?: number;
    followRedirects?: boolean;
    maxRedirects?: number;
}
export interface HttpResponse<T = any> {
    data: T;
    status: number;
    headers: Record<string, string>;
    url: string;
}
export declare class HttpError extends Error {
    status?: number | undefined;
    url?: string | undefined;
    constructor(message: string, status?: number | undefined, url?: string | undefined);
}
