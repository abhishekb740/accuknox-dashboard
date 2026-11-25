import { isNonEmptyString, isRecord } from '../lib/parseConfig'
import type { Category, Widget } from '../types'

/**
 * Version of the saved layout format. Bump it when PersistedLayout changes shape and teach
 * migrateLayout how to read the old one. Edits to dashboard.json never need a bump: the
 * config is merged in on every load.
 *
 * v1: a full copy of every category and widget.
 * v2: only what the user changed (hidden widget ids and the widgets they created).
 */
export const PERSIST_VERSION = 2

export interface SavedCustomWidget {
  id: string
  name: string
  text: string
}

/** What is written to localStorage: the user's changes, never the config itself. */
export interface PersistedLayout {
  /** Ids of hidden widgets, both config and user-created ones. */
  hiddenWidgetIds: string[]
  /** User-created widgets, by category id, in the order they were added. */
  customWidgets: Record<string, SavedCustomWidget[]>
}

/** Saved state that cannot be read. The store discards it and starts from the config. */
export class InvalidSavedStateError extends Error {
  constructor(reason: string) {
    super(`Ignoring saved dashboard layout: ${reason}`)
    this.name = 'InvalidSavedStateError'
  }
}

/** Reduces the in-memory categories to the user's changes. */
export function toPersistedLayout(categories: Category[]): PersistedLayout {
  const hiddenWidgetIds: string[] = []
  const customWidgets: Record<string, SavedCustomWidget[]> = {}
  for (const category of categories) {
    for (const widget of category.widgets) {
      if (widget.hidden) hiddenWidgetIds.push(widget.id)
    }
    const custom = category.widgets
      .filter((widget) => widget.custom)
      .map(({ id, name, text }) => ({ id, name, text }))
    if (custom.length > 0) customWidgets[category.id] = custom
  }
  return { hiddenWidgetIds, customWidgets }
}

function isSavedCustomWidget(value: unknown): value is SavedCustomWidget {
  return (
    isRecord(value) &&
    isNonEmptyString(value.id) &&
    isNonEmptyString(value.name) &&
    isNonEmptyString(value.text)
  )
}

/** Checks a value read from storage against the current (v2) format. */
export function parseLayout(value: unknown): PersistedLayout {
  if (!isRecord(value)) throw new InvalidSavedStateError('state is not an object')

  const { hiddenWidgetIds, customWidgets } = value
  if (!Array.isArray(hiddenWidgetIds) || !hiddenWidgetIds.every((id) => typeof id === 'string')) {
    throw new InvalidSavedStateError('hiddenWidgetIds must be an array of strings')
  }
  if (!isRecord(customWidgets)) {
    throw new InvalidSavedStateError('customWidgets must be an object')
  }
  const parsed: Record<string, SavedCustomWidget[]> = {}
  for (const [categoryId, widgets] of Object.entries(customWidgets)) {
    if (!Array.isArray(widgets) || !widgets.every(isSavedCustomWidget)) {
      throw new InvalidSavedStateError(`customWidgets.${categoryId} has an invalid widget`)
    }
    parsed[categoryId] = widgets.map(({ id, name, text }) => ({ id, name, text }))
  }
  return { hiddenWidgetIds: [...hiddenWidgetIds], customWidgets: parsed }
}

/** Converts a v1 snapshot (every category with every widget) to the v2 format. */
function fromV1(state: unknown): PersistedLayout {
  if (!isRecord(state) || !Array.isArray(state.categories)) {
    throw new InvalidSavedStateError('v1 state has no categories array')
  }
  const hiddenWidgetIds: string[] = []
  const customWidgets: Record<string, SavedCustomWidget[]> = {}
  for (const category of state.categories) {
    if (!isRecord(category) || !isNonEmptyString(category.id) || !Array.isArray(category.widgets)) {
      throw new InvalidSavedStateError('v1 state has an invalid category')
    }
    for (const widget of category.widgets) {
      if (!isRecord(widget) || !isNonEmptyString(widget.id)) {
        throw new InvalidSavedStateError(`v1 category ${category.id} has an invalid widget`)
      }
      if (widget.hidden === true) hiddenWidgetIds.push(widget.id)
      if (widget.custom === true) {
        if (!isSavedCustomWidget(widget)) {
          throw new InvalidSavedStateError(`v1 custom widget ${widget.id} is missing its name or text`)
        }
        const { id, name, text } = widget
        customWidgets[category.id] = [...(customWidgets[category.id] ?? []), { id, name, text }]
      }
    }
  }
  return { hiddenWidgetIds, customWidgets }
}

/** Persist `migrate` hook: upgrades a layout saved by an older version of the app. */
export function migrateLayout(state: unknown, version: number): PersistedLayout {
  if (version === 1) return fromV1(state)
  throw new InvalidSavedStateError(`unknown saved version ${version}`)
}

/**
 * Builds the dashboard from the config plus the user's saved changes.
 *
 * - Categories, their order, and every config widget's content come from the config, so
 *   categories and widgets added to dashboard.json show up for returning visitors.
 * - A widget is hidden only if the user hid it; new config widgets start visible.
 * - User-created widgets follow the config widgets of their category.
 * - User-created widgets whose category is no longer in the config are dropped: there is
 *   no section left to show them in, and moving them to another category would be a guess.
 * - Saved ids that no longer match any widget are ignored and disappear on the next save.
 */
export function mergeLayout(defaults: Category[], layout: PersistedLayout): Category[] {
  const hidden = new Set(layout.hiddenWidgetIds)
  const configIds = new Set(defaults.flatMap((c) => c.widgets.map((w) => w.id)))
  const withVisibility = (widget: Widget): Widget =>
    hidden.has(widget.id) ? { ...widget, hidden: true } : widget

  return defaults.map((category) => {
    const custom = (layout.customWidgets[category.id] ?? [])
      // A config widget always wins if it ever shares an id with a user-created one.
      .filter((saved) => !configIds.has(saved.id))
      .map((saved): Widget => ({ ...saved, type: 'text', custom: true }))
    return { ...category, widgets: [...category.widgets, ...custom].map(withVisibility) }
  })
}
