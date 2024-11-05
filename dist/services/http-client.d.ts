import { HttpClientConfig, HttpResponse } from '../types';
export declare class HttpClient {
    private client;
    private readonly config;
    private lastRequestTime;
    private static readonly MIN_REQUEST_INTERVAL;
    private readonly defaultHeaders;
    constructor(config?: HttpClientConfig);
    private delay;
    private enforceRateLimit;
    private executeWithRetry;
    get<T = string>(url: string): Promise<HttpResponse<T>>;
    checkRobotsTxt(baseUrl: string): Promise<boolean>;
}
