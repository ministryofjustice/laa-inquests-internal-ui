/**
 * Development Logging Utilities
 *
 * Provides development-only console logging to keep production logs clean.
 * These functions only output to console when NODE_ENV is 'development' or undefined.
 */

export function devLog(message: string): void {
  if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === undefined) {
    console.log(message);
  }
}

export function devWarn(message: string): void {
  if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === undefined) {
    console.warn(message);
  }
}

export function devError(message: string): void {
  if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === undefined) {
    console.error(message);
  }
}

export function devDebug(message: string): void {
  if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === undefined) {
    console.debug(message);
  }
}

export function isDevelopment(): boolean {
  return process.env.NODE_ENV === 'development' || process.env.NODE_ENV === undefined;
}