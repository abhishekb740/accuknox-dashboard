import type { Category } from '../types'

/**
 * Returns the categories with only their visible widgets whose name or text contains the
 * query (case-insensitive). With an empty query every visible widget is kept and every
 * category is returned, so empty categories still show their "Add Widget" card.
 * With a query, categories without a match are dropped.
 */
export function filterCategories(categories: Category[], query: string): Category[] {
  const needle = query.trim().toLowerCase()

  const visible = categories.map((category) => ({
    ...category,
    widgets: category.widgets.filter((widget) => !widget.hidden),
  }))

  if (!needle) return visible

  return visible
    .map((category) => ({
      ...category,
      widgets: category.widgets.filter(
        (widget) =>
          widget.name.toLowerCase().includes(needle) || widget.text.toLowerCase().includes(needle),
      ),
    }))
    .filter((category) => category.widgets.length > 0)
}
