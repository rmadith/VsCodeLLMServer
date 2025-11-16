/**
 * Structured logging utility with configurable log levels
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  [key: string]: any;
}

class Logger {
  private logLevel: LogLevel = 'info';
  private readonly levels: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
  };

  setLogLevel(level: LogLevel): void {
    this.logLevel = level;
  }

  private shouldLog(level: LogLevel): boolean {
    return this.levels[level] >= this.levels[this.logLevel];
  }

  private formatMessage(level: LogLevel, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString();
    const contextStr = context ? ` ${JSON.stringify(context)}` : '';
    return `[${timestamp}] [${level.toUpperCase()}] ${message}${contextStr}`;
  }

  debug(message: string, context?: LogContext): void {
    if (this.shouldLog('debug')) {
      console.debug(this.formatMessage('debug', message, context));
    }
  }

  info(message: string, context?: LogContext): void {
    if (this.shouldLog('info')) {
      console.info(this.formatMessage('info', message, context));
    }
  }

  warn(message: string, context?: LogContext): void {
    if (this.shouldLog('warn')) {
      console.warn(this.formatMessage('warn', message, context));
    }
  }

  error(message: string, context?: LogContext): void {
    if (this.shouldLog('error')) {
      console.error(this.formatMessage('error', message, context));
    }
  }

  /**
   * Log without including sensitive data
   */
  logRequest(method: string, path: string, requestId: string, statusCode?: number): void {
    const context: LogContext = {
      requestId,
      method,
      path,
    };
    
    if (statusCode) {
      context.statusCode = statusCode;
    }

    this.info('HTTP Request', context);
  }

  /**
   * Log errors with sanitized information
   */
  logError(error: Error, requestId?: string): void {
    const context: LogContext = {
      error: error.message,
      stack: error.stack,
    };

    if (requestId) {
      context.requestId = requestId;
    }

    this.error('Error occurred', context);
  }
}

export const logger = new Logger();

