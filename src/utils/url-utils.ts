import { URL } from 'url';

export class UrlUtils {
  static normalizeUrl(url: string): string {
    try {
      const parsedUrl = new URL(url);
      return parsedUrl.toString().replace(/\/$/, '');
    } catch (error) {
      throw new Error(`Invalid URL: ${url}`);
    }
  }

  static isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  static isSameDomain(url1: string, url2: string): boolean {
    try {
      const domain1 = new URL(url1).hostname;
      const domain2 = new URL(url2).hostname;
      return domain1 === domain2;
    } catch {
      return false;
    }
  }

  static joinUrls(base: string, path: string): string {
    try {
      return new URL(path, base).toString();
    } catch {
      return '';
    }
  }
} 