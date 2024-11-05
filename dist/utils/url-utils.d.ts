export declare class UrlUtils {
    static normalizeUrl(url: string): string;
    static isValidUrl(url: string): boolean;
    static isSameDomain(url1: string, url2: string): boolean;
    static joinUrls(base: string, path: string): string;
}
