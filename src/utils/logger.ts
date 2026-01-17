const ENABLE_LOG = process.env.ENABLE_LOG === 'true';

export function log(...args: any[]): void {
  if (ENABLE_LOG) {
    console.log(...args);
  }
}

export function logError(...args: any[]): void {
  if (ENABLE_LOG) {
    console.error(...args);
  }
}

export function logWarn(...args: any[]): void {
  if (ENABLE_LOG) {
    console.warn(...args);
  }
}
