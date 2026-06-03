/**
 * Simple Logger Utility
 * Provides structured logging with levels and emojis
 * No external dependencies required
 *
 * Usage:
 *  logger.info('ServiceName', 'Action description', { key: value });
 *  logger.warn('ServiceName', 'Warning message', { key: value });
 *  logger.error('ServiceName', 'Error message', error, { context: data });
 *  logger.debug('ServiceName', 'Debug info', { key: value });
 */

type LogLevel = "DEBUG" | "INFO" | "WARN" | "ERROR";

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  service: string;
  message: string;
  data?: any;
  error?: string;
  stack?: string;
}

class Logger {
  private isDev = process.env.NODE_ENV === "development";
  private logLevel = (process.env.LOG_LEVEL || "INFO") as LogLevel;

  private levelMap: Record<LogLevel, number> = {
    DEBUG: 0,
    INFO: 1,
    WARN: 2,
    ERROR: 3,
  };

  private emoji: Record<LogLevel, string> = {
    DEBUG: "🔍",
    INFO: "ℹ️",
    WARN: "⚠️",
    ERROR: "❌",
  };

  /**
   * Check if current log level should be logged
   */
  private shouldLog(level: LogLevel): boolean {
    return this.levelMap[level] >= this.levelMap[this.logLevel];
  }

  /**
   * Format log entry for console output
   */
  private formatLog(entry: LogEntry): string {
    const emoji = this.emoji[entry.level];
    const date = new Date(entry.timestamp);
    const timeStr = date.toLocaleTimeString("en-US", {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    const ms = String(date.getMilliseconds()).padStart(3, "0");

    return `${emoji} ${timeStr}.${ms} [${entry.service}] ${entry.message}`;
  }

  /**
   * Format log data for console output
   */
  private formatData(data: any): string {
    if (!data) return "";
    try {
      return JSON.stringify(data, null, 2);
    } catch {
      return String(data);
    }
  }

  /**
   * DEBUG level logging
   * Used for detailed diagnostic information
   */
  debug(service: string, message: string, data?: any) {
    if (!this.shouldLog("DEBUG")) return;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: "DEBUG",
      service,
      message,
      data,
    };

    console.debug(this.formatLog(entry));
    if (data) {
      console.debug(this.formatData(data));
    }
  }

  /**
   * INFO level logging
   * Used for general informational messages
   */
  info(service: string, message: string, data?: any) {
    if (!this.shouldLog("INFO")) return;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: "INFO",
      service,
      message,
      data,
    };

    console.log(this.formatLog(entry));
    if (data) {
      console.log(this.formatData(data));
    }
  }

  /**
   * WARN level logging
   * Used for warning messages (recoverable issues)
   */
  warn(service: string, message: string, data?: any) {
    if (!this.shouldLog("WARN")) return;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: "WARN",
      service,
      message,
      data,
    };

    console.warn(this.formatLog(entry));
    if (data) {
      console.warn(this.formatData(data));
    }
  }

  /**
   * ERROR level logging
   * Used for error messages (critical issues)
   */
  error(service: string, message: string, error?: Error | unknown, data?: any) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: "ERROR",
      service,
      message,
      data,
      error:
        error instanceof Error
          ? error.message
          : typeof error === "string"
            ? error
            : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
    };

    console.error(this.formatLog(entry));
    if (data) {
      console.error(this.formatData(data));
    }
    if (entry.stack) {
      console.error("Stack trace:");
      console.error(entry.stack);
    }
  }
}

export const logger = new Logger();
