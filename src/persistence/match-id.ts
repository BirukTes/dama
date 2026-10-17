// getRandomValues also works on HTTP Wi-Fi previews, where randomUUID is unavailable.
// This is an opaque identifier for deduplicating match results, not an account token.
export function createMatchId(): string {
  const bytes = new Uint8Array(16);
  globalThis.crypto.getRandomValues(bytes);
  return `match-${Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')}`;
}
