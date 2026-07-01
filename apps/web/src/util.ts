/**
 * Share ID validation — used by future D7 share link generation/loading.
 * Currently a tiny pure function so vitest has something to test in D1.
 */
export function isShareIdValid(s: string): boolean {
  return /^[a-zA-Z0-9_-]{8,64}$/.test(s);
}
