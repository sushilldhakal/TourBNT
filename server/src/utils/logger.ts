/**
 * Centralized logging utility for the application
 * Provides structured logging with different severity levels
 */

export enum LogLevel {
    ERROR = 'ERROR',
    WARN = 'WARN',
    INFO = 'INFO',
    DEBUG = 'DEBUG'
}

export interface LogEntry {
    level: LogLevel;
    message: string;
    timestamp: string;
    metadata?: Record<string, any>;
}

class Logger {
    private isDevelopment: boolean;

    constructor() {
        this.isDevelopment = process.env.NODE_ENV !== 'production';
    }

    /**
     * Format log entry for output
     */
    private formatLog(entry: LogEntry): string {
        const { level, message, timestamp, metadata } = entry;
        const metaStr = metadata ? ` | ${JSON.stringify(metadata)}` : '';
        return `[${timestamp}] [${level}] ${message}${metaStr}`;
    }

    /**
     * Write log entry to console (can be extended to write to files/services)
     */
    private writeLog(entry: LogEntry): void {
        const formatted = this.formatLog(entry);

        switch (entry.level) {
            case LogLevel.ERROR:
                console.error(formatted);
                break;
            case LogLevel.WARN:
                console.warn(formatted);
                break;
            case LogLevel.INFO:
                console.info(formatted);
                break;
            case LogLevel.DEBUG:
                if (this.isDevelopment) {
                    console.debug(formatted);
                }
                break;
        }
    }

    /**
     * Log error message
     */
    error(message: string, metadata?: Record<string, any>): void {
        this.writeLog({
            level: LogLevel.ERROR,
            message,
            timestamp: new Date().toISOString(),
            metadata
        });
    }

    /**
     * Log warning message
     */
    warn(message: string, metadata?: Record<string, any>): void {
        this.writeLog({
            level: LogLevel.WARN,
            message,
            timestamp: new Date().toISOString(),
            metadata
        });
    }

    /**
     * Log info message
     */
    info(message: string, metadata?: Record<string, any>): void {
        this.writeLog({
            level: LogLevel.INFO,
            message,
            timestamp: new Date().toISOString(),
            metadata
        });
    }

    /**
     * Log debug message (only in development)
     */
    debug(message: string, metadata?: Record<string, any>): void {
        this.writeLog({
            level: LogLevel.DEBUG,
            message,
            timestamp: new Date().toISOString(),
            metadata
        });
    }
}

// Export singleton instance
export const logger = new Logger();
