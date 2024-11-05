"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HttpError = void 0;
class HttpError extends Error {
    constructor(message, status, url) {
        super(message);
        this.status = status;
        this.url = url;
        this.name = 'HttpError';
    }
}
exports.HttpError = HttpError;
