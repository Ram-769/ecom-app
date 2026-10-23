export function readStorage(key: string): unknown {
  try { const value = localStorage.getItem(key); return value ? JSON.parse(value) as unknown : null; }
  catch { return null; }
}
export function writeStorage(key: string, value: unknown): void {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* Private browsing or full storage must not block shopping. */ }
}
