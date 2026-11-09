type LogLevel = 'debug' | 'info' | 'warn' | 'error';

class Logger {
  private prefix: string;
  private minLevel: LogLevel;

  constructor(prefix: string, minLevel: LogLevel = 'info') {
    this.prefix = prefix;
    this.minLevel = minLevel;
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
    return levels.indexOf(level) >= levels.indexOf(this.minLevel);
  }

  private write(level: LogLevel, service: string, message: string): void {
    if (!this.shouldLog(level)) return;

    const timestamp = new Date().toISOString();
    const output = `${timestamp} [${level.toUpperCase()}] [${service}] ${message}`;

    if (level === 'error' || level === 'warn') {
      process.stderr.write(output + '\n');
    } else {
      process.stdout.write(output + '\n');
    }
  }

  debug(service: string, message: string): void {
    this.write('debug', service, message);
  }

  info(service: string, message: string): void {
    this.write('info', service, message);
  }

  warn(service: string, message: string): void {
    this.write('warn', service, message);
  }

  error(service: string, message: string): void {
    this.write('error', service, message);
  }

  child(additionalPrefix: string): Logger {
    return new Logger(`${this.prefix}:${additionalPrefix}`, this.minLevel);
  }
}

export const startupLogger = new Logger('startup');
export const cronLogger = new Logger('cron');
export const apiLogger = new Logger('api');

export function createLogger(prefix: string): Logger {
  return new Logger(prefix);
}