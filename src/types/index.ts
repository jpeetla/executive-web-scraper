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

export interface ScrapingResult {
  website: string;
  hasJobs: boolean;
  jobPostings: JobPosting[];
  error?: string;
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

export class HttpError extends Error {
  constructor(
    message: string,
    public status?: number,
    public url?: string
  ) {
    super(message);
    this.name = 'HttpError';
  }
} 