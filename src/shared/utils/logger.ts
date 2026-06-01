/**
 * Simple logger abstraction.
 * In production you could swap this for winston, pino, etc.
 */
export class Logger {
  private readonly prefix: string;

  constructor(prefix: string = '[BOT]') {
    this.prefix = prefix;
  }

  info(message: string, meta?: Record<string, unknown>): void {
    console.info(`${this.prefix} INFO:`, message, meta ?? {});
  }

  warn(message: string, meta?: Record<string, unknown>): void {
    console.warn(`${this.prefix} WARN:`, message, meta ?? {});
  }

  error(message: string, meta?: Record<string, unknown>): void {
    console.error(`${this.prefix} ERROR:`, message, meta ?? {});
  }

  debug(message: string, meta?: Record<string, unknown>): void {
    console.debug(`${this.prefix} DEBUG:`, message, meta ?? {});
  }
}

// Export a default instance for convenience
export const logger = new Logger();