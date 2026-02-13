import Logger from "@denodnt/logger";

export type LogLevels = "silly" | "verbose" | "info" | "warn" | "error";
export const logger = new Logger();

export default class Log {
  public static silence: boolean;

  public static log(
    level: LogLevels | string,
    prefix: string,
    message: string,
    ...args: unknown[]
  ): void {
    if (!Log.silence) {
      switch (level) {
        case "info":
          logger.info(prefix, message, ...args);
          break;
        case "warn":
          logger.warn(prefix, message, ...args);
          break;
        case "error":
          logger.error(prefix, message, ...args);
          break;
        default:
          logger.info(prefix, message, ...args);
          break;
      }
      // log.log(level, prefix, message, ...args);
    }
  }

  info(...args: unknown[]): Promise<void> {
    if (Log.silence) {
      return Promise.resolve();
    }
    return logger.info(...args);
  }

  warn(...args: unknown[]): Promise<void> {
    if (Log.silence) {
      return Promise.resolve();
    }
    return logger.warn(...args);
  }

  error(...args: unknown[]): Promise<void> {
    if (Log.silence) {
      return Promise.resolve();
    }
    return logger.error(...args);
  }

  silly(...args: unknown[]): Promise<void> {
    if (Log.silence) {
      return Promise.resolve();
    }
    return logger.info(...args);
  }

  verbose(...args: unknown[]): Promise<void> {
    if (Log.silence) {
      return Promise.resolve();
    }
    return logger.info(...args);
  }

  public static set level(level: LogLevels) {
    //  npmlog.level = level;
  }
}
