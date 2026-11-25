import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import defaultConfig from '../data/dashboard.json'
import { createId } from '../lib/id'
import { safeStorage } from '../lib/safeStorage'
import type { Category, DashboardConfig, Widget } from '../types'

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
  /** Creates a visible text widget in the category. Returns it, or null if the input is invalid. */
  addWidget: (categoryId: string, input: NewWidgetInput) => Widget | null
  /** Removes a widget from the dashboard. It stays listed (unchecked) in the drawer. */
  removeWidget: (categoryId: string, widgetId: string) => void
  setWidgetVisibility: (categoryId: string, widgetId: string, visible: boolean) => void
  /** Applies everything staged in the Add Widget drawer in a single update. */
  applyWidgetChanges: (changes: WidgetChanges) => void
  setSearchQuery: (query: string) => void
  resetDashboard: () => void
}

export const STORAGE_KEY = 'cnapp-dashboard'

/** A fresh deep copy of the JSON config, so state updates never mutate the imported module. */
export function getDefaultCategories(): Category[] {
  return structuredClone((defaultConfig as DashboardConfig).categories)
}

function buildWidget(input: NewWidgetInput): Widget | null {
  const name = input.name.trim()
  const text = input.text.trim()
  if (!name || !text) return null
  return { id: createId(), name, text, type: 'text', custom: true }
}

function updateWidget(
  categories: Category[],
  categoryId: string,
  widgetId: string,
  patch: Partial<Widget>,
): Category[] {
  return categories.map((category) =>
    category.id !== categoryId
      ? category
      : {
          ...category,
          widgets: category.widgets.map((widget) =>
            widget.id === widgetId ? { ...widget, ...patch } : widget,
          ),
        },
  )
}

export const useDashboardStore = create<DashboardState>()(
  persist(
    (set) => ({
      categories: getDefaultCategories(),
      searchQuery: '',

      addWidget: (categoryId, input) => {
        const widget = buildWidget(input)
        if (!widget) return null
        set((state) => ({
          categories: state.categories.map((category) =>
            category.id === categoryId
              ? { ...category, widgets: [...category.widgets, widget] }
              : category,
          ),
        }))
        return widget
      },

      removeWidget: (categoryId, widgetId) =>
        set((state) => ({
          categories: updateWidget(state.categories, categoryId, widgetId, { hidden: true }),
        })),

      setWidgetVisibility: (categoryId, widgetId, visible) =>
        set((state) => ({
          categories: updateWidget(state.categories, categoryId, widgetId, { hidden: !visible }),
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
      version: 1,
      storage: createJSONStorage(() => safeStorage),
      // The search box is session state; only the widget layout is worth keeping.
      partialize: (state) => ({ categories: state.categories }),
    },
  ),
)
