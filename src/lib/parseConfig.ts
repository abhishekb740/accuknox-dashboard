import type { Category, ChartDatum, DashboardConfig, Widget, WidgetType } from '../types'

const WIDGET_TYPES: readonly WidgetType[] = ['donut', 'bar', 'empty', 'text']
const WIDGET_TYPE_SET = new Set<string>(WIDGET_TYPES)

const isWidgetType = (value: unknown): value is WidgetType =>
  typeof value === 'string' && WIDGET_TYPE_SET.has(value)

/** Thrown when dashboard.json does not match the expected shape. Lists every problem found. */
export class ConfigError extends Error {
  readonly problems: string[]

  constructor(problems: string[]) {
    super(`Invalid dashboard config:\n- ${problems.join('\n- ')}`)
    this.name = 'ConfigError'
    this.problems = problems
  }
}

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

export const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.trim() !== ''

/**
 * Checks the raw JSON config and returns a typed copy that holds only the known fields.
 * Throws a ConfigError naming every bad path, for example `categories[1].widgets[0].type`.
 */
export function parseDashboardConfig(raw: unknown): DashboardConfig {
  const problems: string[] = []
  const categoryIds = new Set<string>()
  const widgetIds = new Set<string>()

  const requireString = (value: unknown, path: string, allowEmpty = false): string => {
    if (typeof value === 'string' && (allowEmpty || value.trim() !== '')) return value
    problems.push(`${path} must be a ${allowEmpty ? '' : 'non-empty '}string`)
    return ''
  }

  const parseDatum = (value: unknown, path: string): ChartDatum => {
    if (!isRecord(value)) {
      problems.push(`${path} must be an object`)
      return { label: '', value: 0, color: '' }
    }
    const amount = value.value
    if (typeof amount !== 'number' || !Number.isFinite(amount) || amount < 0) {
      problems.push(`${path}.value must be a number of 0 or more`)
    }
    return {
      label: requireString(value.label, `${path}.label`),
      value: typeof amount === 'number' ? amount : 0,
      color: requireString(value.color, `${path}.color`),
    }
  }

  const parseWidget = (value: unknown, path: string): Widget => {
    if (!isRecord(value)) {
      problems.push(`${path} must be an object`)
      return { id: '', name: '', text: '' }
    }
    const id = requireString(value.id, `${path}.id`)
    if (id && widgetIds.has(id)) problems.push(`${path}.id "${id}" is used by another widget`)
    widgetIds.add(id)

    const widget: Widget = {
      id,
      name: requireString(value.name, `${path}.name`),
      text: requireString(value.text, `${path}.text`, true),
    }
    if (value.type !== undefined) {
      if (isWidgetType(value.type)) {
        widget.type = value.type
      } else {
        problems.push(`${path}.type must be one of ${WIDGET_TYPES.join(', ')}`)
      }
    }
    if (value.unit !== undefined) widget.unit = requireString(value.unit, `${path}.unit`)
    if (value.data !== undefined) {
      if (Array.isArray(value.data)) {
        widget.data = value.data.map((d, i) => parseDatum(d, `${path}.data[${i}]`))
      } else {
        problems.push(`${path}.data must be an array`)
      }
    }
    return widget
  }

  const parseCategory = (value: unknown, path: string): Category => {
    if (!isRecord(value)) {
      problems.push(`${path} must be an object`)
      return { id: '', name: '', tabLabel: '', widgets: [] }
    }
    const id = requireString(value.id, `${path}.id`)
    if (id && categoryIds.has(id)) problems.push(`${path}.id "${id}" is used by another category`)
    categoryIds.add(id)

    let widgets: Widget[] = []
    if (Array.isArray(value.widgets)) {
      widgets = value.widgets.map((w, i) => parseWidget(w, `${path}.widgets[${i}]`))
    } else {
      problems.push(`${path}.widgets must be an array`)
    }
    return {
      id,
      name: requireString(value.name, `${path}.name`),
      tabLabel: requireString(value.tabLabel, `${path}.tabLabel`),
      widgets,
    }
  }

  let categories: Category[] = []
  if (!isRecord(raw) || !Array.isArray(raw.categories)) {
    problems.push('categories must be an array')
  } else if (raw.categories.length === 0) {
    problems.push('categories must contain at least one category')
  } else {
    categories = raw.categories.map((c, i) => parseCategory(c, `categories[${i}]`))
  }

  if (problems.length > 0) throw new ConfigError(problems)
  return { categories }
}
