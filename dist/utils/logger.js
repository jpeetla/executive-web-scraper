"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Logger = void 0;
var LogLevel;
(function (LogLevel) {
    LogLevel["INFO"] = "INFO";
    LogLevel["WARN"] = "WARN";
    LogLevel["ERROR"] = "ERROR";
    LogLevel["DEBUG"] = "DEBUG";
})(LogLevel || (LogLevel = {}));
class Logger {
    static formatMessage(level, message) {
        return `[${new Date().toISOString()}] ${level}: ${message}`;
    }
    static info(message) {
        console.log(this.formatMessage(LogLevel.INFO, message));
    }
    static warn(message) {
        console.warn(this.formatMessage(LogLevel.WARN, message));
    }
    static error(message, error) {
        console.error(this.formatMessage(LogLevel.ERROR, message));
        if (error) {
            console.error(error);
        }
    }
    static debug(message) {
        if (process.env.DEBUG) {
            console.debug(this.formatMessage(LogLevel.DEBUG, message));
        }
    }
}
exports.Logger = Logger;
