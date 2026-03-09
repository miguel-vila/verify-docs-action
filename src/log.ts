let verboseEnabled = false;
let debugEnabled = false;

export function enableVerbose(): void {
  verboseEnabled = true;
}

export function enableDebug(): void {
  debugEnabled = true;
  verboseEnabled = true; // debug implies verbose
}

export function verbose(...args: unknown[]): void {
  if (!verboseEnabled) return;
  console.error(`\x1b[2m[verbose]\x1b[0m`, ...args);
}

export function debug(...args: unknown[]): void {
  if (!debugEnabled) return;
  console.error(`\x1b[36m[debug]\x1b[0m`, ...args);
}
