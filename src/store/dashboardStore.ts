import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import rawConfig from '../data/dashboard.json'
import { createId } from '../lib/id'
import { parseDashboardConfig } from '../lib/parseConfig'
import { safeStorage } from '../lib/safeStorage'
import type { Category, Widget } from '../types'
import {
  InvalidSavedStateError,
  mergeLayout,
  migrateLayout,
  parseLayout,
  PERSIST_VERSION,
  toPersistedLayout,
  type PersistedLayout,
} from './persistence'

export interface NewWidgetInput {
  name: string
  text: string
}

export interface WidgetChanges {
  /** Widget id mapped to whether it should be shown. Ids not listed are left as they are. */
  visibility: Record<string, boolean>
  /** New widgets to create, each in its own category. */
  additions: Array<NewWidgetInput & { categoryId: string }>
}

interface DashboardState {
  categories: Category[]
  searchQuery: string
  /** Removes a widget from the dashboard. It stays listed (unchecked) in the drawer. */
  removeWidget: (categoryId: string, widgetId: string) => void
  /** Applies everything staged in the Add Widget drawer in a single update. */
  applyWidgetChanges: (changes: WidgetChanges) => void
  setSearchQuery: (query: string) => void
  resetDashboard: () => void
}

export const STORAGE_KEY = 'cnapp-dashboard'

// Validated once at startup. A broken dashboard.json throws here with every bad path listed,
// instead of rendering a half-working page.
const config = parseDashboardConfig(rawConfig)

/** A fresh deep copy of the JSON config, so state updates never mutate the parsed config. */
export function getDefaultCategories(): Category[] {
  return structuredClone(config.categories)
}

function buildWidget(input: NewWidgetInput): Widget | null {
  const name = input.name.trim()
  const text = input.text.trim()
  if (!name || !text) return null
  return { id: createId(), name, text, type: 'text', custom: true }
}

export const useDashboardStore = create<DashboardState>()(
  persist(
    (set) => ({
      categories: getDefaultCategories(),
      searchQuery: '',

      removeWidget: (categoryId, widgetId) =>
        set((state) => ({
          categories: state.categories.map((category) =>
            category.id !== categoryId
              ? category
              : {
                  ...category,
                  widgets: category.widgets.map((widget) =>
                    widget.id === widgetId ? { ...widget, hidden: true } : widget,
                  ),
                },
          ),
        })),

      applyWidgetChanges: ({ visibility, additions }) =>
        set((state) => ({
          categories: state.categories.map((category) => {
            const widgets = category.widgets.map((widget) =>
              widget.id in visibility ? { ...widget, hidden: !visibility[widget.id] } : widget,
            )
            const added = additions
              .filter((addition) => addition.categoryId === category.id)
              .map(buildWidget)
              .filter((widget): widget is Widget => widget !== null)
            return { ...category, widgets: [...widgets, ...added] }
          }),
        })),

      setSearchQuery: (searchQuery) => set({ searchQuery }),

      resetDashboard: () => set({ categories: getDefaultCategories(), searchQuery: '' }),
    }),
    {
      name: STORAGE_KEY,
      version: PERSIST_VERSION,
      storage: createJSONStorage<PersistedLayout>(() => safeStorage),
      // Only the user's changes are saved. The search box is session state.
      partialize: (state) => toPersistedLayout(state.categories),
      migrate: migrateLayout,
      merge: (persisted, current) => {
        if (persisted === undefined) {
          // Nothing usable was read. Anything still stored is not a state envelope.
          if (safeStorage.getItem(STORAGE_KEY) !== null) {
            throw new InvalidSavedStateError('stored value is not a { state, version } object')
          }
          return current
        }
        return { ...current, categories: mergeLayout(getDefaultCategories(), parseLayout(persisted)) }
      },
      // Unparseable JSON, a failed migration or an invalid layout all end up here. The store
      // keeps the config defaults, and the bad value is removed so it cannot fail again.
      onRehydrateStorage: () => (_state, error) => {
        if (!error) return
        console.warn(error instanceof Error ? error.message : error)
        safeStorage.removeItem(STORAGE_KEY)
      },
    },
  ),
)
