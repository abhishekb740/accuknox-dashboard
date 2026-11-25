import { describe, expect, it } from 'vitest'
import rawConfig from '../data/dashboard.json'
import { ConfigError, parseDashboardConfig } from './parseConfig'

const validWidget = { id: 'w1', name: 'Widget', text: 'Some text', type: 'donut' }
const withWidgets = (...widgets: unknown[]) => ({
  categories: [{ id: 'cspm', name: 'CSPM', tabLabel: 'CSPM', widgets }],
})

const problemsOf = (raw: unknown): string[] => {
  try {
    parseDashboardConfig(raw)
  } catch (error) {
    if (error instanceof ConfigError) return error.problems
    throw error
  }
  return []
}

describe('parseDashboardConfig', () => {
  it('accepts the shipped dashboard.json', () => {
    const config = parseDashboardConfig(rawConfig)
    expect(config.categories.map((c) => c.id)).toEqual(['cspm', 'cwpp', 'registry'])
  })

  it('keeps only known fields', () => {
    const config = parseDashboardConfig(withWidgets({ ...validWidget, hidden: true, extra: 1 }))
    expect(config.categories[0].widgets[0]).toEqual(validWidget)
  })

  it('rejects a config without categories', () => {
    expect(problemsOf({})).toEqual(['categories must be an array'])
    expect(problemsOf({ categories: [] })).toEqual(['categories must contain at least one category'])
    expect(problemsOf(null)).toEqual(['categories must be an array'])
  })

  it('names every bad path in one error', () => {
    const problems = problemsOf(
      withWidgets(
        { id: 'w1', name: '', text: 'x', type: 'pie' },
        { id: 'w2', name: 'Bar', text: 'x', data: [{ label: 'High', value: -1, color: '#f00' }] },
        'not a widget',
      ),
    )
    expect(problems).toEqual([
      'categories[0].widgets[0].name must be a non-empty string',
      'categories[0].widgets[0].type must be one of donut, bar, empty, text',
      'categories[0].widgets[1].data[0].value must be a number of 0 or more',
      'categories[0].widgets[2] must be an object',
    ])
  })

  it('rejects duplicate category and widget ids', () => {
    const category = { id: 'cspm', name: 'CSPM', tabLabel: 'CSPM', widgets: [validWidget] }
    expect(problemsOf({ categories: [category, category] })).toEqual([
      'categories[1].id "cspm" is used by another category',
      'categories[1].widgets[0].id "w1" is used by another widget',
    ])
  })

  it('throws an error whose message lists the problems', () => {
    expect(() => parseDashboardConfig(withWidgets({ ...validWidget, text: 3 }))).toThrow(
      'Invalid dashboard config:\n- categories[0].widgets[0].text must be a string',
    )
  })
})
