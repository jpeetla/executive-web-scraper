enum LogLevel {
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
  DEBUG = 'DEBUG'
}

export class Logger {
  private static formatMessage(level: LogLevel, message: string): string {
    return `[${new Date().toISOString()}] ${level}: ${message}`;
  }

  static info(message: string): void {
    console.log(this.formatMessage(LogLevel.INFO, message));
  }

  static warn(message: string): void {
    console.warn(this.formatMessage(LogLevel.WARN, message));
  }

  static error(message: string, error?: Error): void {
    console.error(this.formatMessage(LogLevel.ERROR, message));
    if (error) {
      console.error(error);
    }
  }

  static debug(message: string): void {
    if (process.env.DEBUG) {
      console.debug(this.formatMessage(LogLevel.DEBUG, message));
    }
  }
} 