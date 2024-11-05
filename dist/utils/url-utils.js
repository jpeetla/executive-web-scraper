"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UrlUtils = void 0;
const url_1 = require("url");
class UrlUtils {
    static normalizeUrl(url) {
        try {
            const parsedUrl = new url_1.URL(url);
            return parsedUrl.toString().replace(/\/$/, '');
        }
        catch (error) {
            throw new Error(`Invalid URL: ${url}`);
        }
    }
    static isValidUrl(url) {
        try {
            new url_1.URL(url);
            return true;
        }
        catch {
            return false;
        }
    }
    static isSameDomain(url1, url2) {
        try {
            const domain1 = new url_1.URL(url1).hostname;
            const domain2 = new url_1.URL(url2).hostname;
            return domain1 === domain2;
        }
        catch {
            return false;
        }
    }
    static joinUrls(base, path) {
        try {
            return new url_1.URL(path, base).toString();
        }
        catch {
            return '';
        }
    }
}
exports.UrlUtils = UrlUtils;
