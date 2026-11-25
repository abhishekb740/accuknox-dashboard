/** Returns a unique id, falling back to a timestamp-based id where crypto.randomUUID is unavailable. */
export function createId(prefix = 'widget'): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`
  }
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}
