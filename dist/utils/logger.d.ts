export declare class Logger {
    private static formatMessage;
    static info(message: string): void;
    static warn(message: string): void;
    static error(message: string, error?: Error): void;
    static debug(message: string): void;
}
