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
  data: T | null;
  status: number;
  headers: Record<string, string>;
  url: string;
}

export class HttpError extends Error {
  constructor(message: string, public status?: number, public url?: string) {
    super(message);
    this.name = "HttpError";
  }
}

export interface Domain {
  name: string;
  domain: string;
  investorReference: string;
  companyReference: string;
}

export interface Executive {
  domain: string;
  name: string;
  title: string;
  linkedin: string;
  source: string;
}
