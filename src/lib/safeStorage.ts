import type { StateStorage } from 'zustand/middleware'

/**
 * localStorage wrapper that never throws. Private browsing, blocked site data or a full
 * quota make the browser throw on access; in those cases the dashboard still works and
 * simply does not persist.
 */
export const safeStorage: StateStorage = {
  getItem(name) {
    try {
      return window.localStorage.getItem(name)
    } catch {
      return null
    }
  },
  setItem(name, value) {
    try {
      window.localStorage.setItem(name, value)
    } catch {
      // Ignore: persistence is a convenience, not a requirement.
    }
  },
  removeItem(name) {
    try {
      window.localStorage.removeItem(name)
    } catch {
      // Ignore, see setItem.
    }
  },
}
