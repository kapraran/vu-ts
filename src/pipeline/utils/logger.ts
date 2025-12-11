import type { Logger } from "../interfaces";

export class ConsoleLogger implements Logger {
  info(message: string): void {
    console.log(message);
  }

  warn(message: string): void {
    console.warn(message);
  }

  error(message: string): void {
    console.error(message);
  }

  debug(message: string): void {
    if (
      process.env.DEBUG === "true" ||
      process.env.NODE_ENV === "development"
    ) {
      console.debug(message);
    }
  }
}

export function createLogger(): Logger {
  return new ConsoleLogger();
}
