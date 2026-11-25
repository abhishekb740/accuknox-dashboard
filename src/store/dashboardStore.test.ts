import { beforeEach, describe, expect, it } from 'vitest'
import { filterCategories } from '../lib/filterWidgets'
import { getDefaultCategories, STORAGE_KEY, useDashboardStore } from './dashboardStore'

const store = () => useDashboardStore.getState()
const category = (id: string) => store().categories.find((c) => c.id === id)!
const widget = (categoryId: string, widgetId: string) =>
  category(categoryId).widgets.find((w) => w.id === widgetId)

beforeEach(() => {
  localStorage.clear()
  store().resetDashboard()
})

describe('initial state', () => {
  it('loads every category and widget from the JSON config', () => {
    expect(store().categories.map((c) => c.name)).toEqual([
      'CSPM Executive Dashboard',
      'CWPP Dashboard',
      'Registry Scan',
    ])
    expect(store().categories.every((c) => c.widgets.length === 2)).toBe(true)
  })
})

describe('addWidget', () => {
  it('appends a visible text widget to the chosen category only', () => {
    const created = store().addWidget('cwpp', { name: 'Runtime Policies', text: 'Blocked syscalls' })

    expect(created).not.toBeNull()
    expect(category('cwpp').widgets.at(-1)).toMatchObject({
      name: 'Runtime Policies',
      text: 'Blocked syscalls',
      type: 'text',
      custom: true,
    })
    expect(category('cspm').widgets).toHaveLength(2)
  })

  it('trims input and rejects an empty name or text', () => {
    expect(store().addWidget('cspm', { name: '   ', text: 'x' })).toBeNull()
    expect(store().addWidget('cspm', { name: 'x', text: '' })).toBeNull()
    expect(category('cspm').widgets).toHaveLength(2)

    const created = store().addWidget('cspm', { name: '  Spaced  ', text: ' out ' })
    expect(created).toMatchObject({ name: 'Spaced', text: 'out' })
  })

  it('gives each new widget a unique id', () => {
    const a = store().addWidget('cspm', { name: 'A', text: 'a' })
    const b = store().addWidget('cspm', { name: 'A', text: 'a' })
    expect(a!.id).not.toBe(b!.id)
  })

  it('persists the layout to localStorage', () => {
    store().addWidget('registry', { name: 'Saved', text: 'kept' })
    expect(localStorage.getItem(STORAGE_KEY)).toContain('Saved')
  })
})

describe('removeWidget', () => {
  it('hides the widget but keeps it in the category so it can be re-checked', () => {
    store().removeWidget('cspm', 'cloud-accounts')

    expect(widget('cspm', 'cloud-accounts')?.hidden).toBe(true)
    expect(filterCategories(store().categories, '')[0].widgets.map((w) => w.id)).toEqual([
      'cloud-account-risk',
    ])
  })

  it('leaves state unchanged for an unknown widget', () => {
    const before = store().categories
    store().removeWidget('cspm', 'missing')
    expect(store().categories).toEqual(before)
  })
})

describe('toggling visibility', () => {
  it('setWidgetVisibility hides and shows a widget', () => {
    store().setWidgetVisibility('registry', 'image-risk', false)
    expect(widget('registry', 'image-risk')?.hidden).toBe(true)

    store().setWidgetVisibility('registry', 'image-risk', true)
    expect(widget('registry', 'image-risk')?.hidden).toBe(false)
  })

  it('applyWidgetChanges applies staged toggles and additions together', () => {
    store().applyWidgetChanges({
      visibility: { 'cloud-accounts': false, 'workload-alerts': false },
      additions: [
        { categoryId: 'registry', name: 'Base Images', text: 'Outdated base layers' },
        { categoryId: 'registry', name: '', text: 'invalid, skipped' },
      ],
    })

    expect(widget('cspm', 'cloud-accounts')?.hidden).toBe(true)
    expect(widget('cwpp', 'workload-alerts')?.hidden).toBe(true)
    expect(widget('cwpp', 'namespace-alerts')?.hidden).toBeFalsy()
    expect(category('registry').widgets.map((w) => w.name)).toEqual([
      'Image Risk Assessment',
      'Image Security Issues',
      'Base Images',
    ])
  })
})

describe('search', () => {
  it('stores the query', () => {
    store().setSearchQuery('alerts')
    expect(store().searchQuery).toBe('alerts')
  })

  it('matches widget names across all categories, case-insensitively', () => {
    const result = filterCategories(store().categories, 'IMAGE')
    expect(result.map((c) => c.id)).toEqual(['registry'])
    expect(result[0].widgets).toHaveLength(2)
  })

  it('matches widget text as well as name', () => {
    store().addWidget('cspm', { name: 'Notes', text: 'Quarterly kubernetes review' })
    const result = filterCategories(store().categories, 'kubernetes')
    expect(result.flatMap((c) => c.widgets.map((w) => w.name))).toEqual(['Notes'])
  })

  it('excludes hidden widgets and returns nothing when there is no match', () => {
    store().removeWidget('cwpp', 'workload-alerts')
    expect(filterCategories(store().categories, 'workload')).toEqual([])
    expect(filterCategories(store().categories, 'zzz-no-match')).toEqual([])
  })

  it('keeps every category when the query is blank', () => {
    expect(filterCategories(store().categories, '   ')).toHaveLength(3)
  })
})

describe('resetDashboard', () => {
  it('restores the JSON config and clears the search', () => {
    store().addWidget('cspm', { name: 'Temp', text: 'temp' })
    store().removeWidget('registry', 'image-risk')
    store().setSearchQuery('temp')

    store().resetDashboard()

    expect(store().categories).toEqual(getDefaultCategories())
    expect(store().searchQuery).toBe('')
  })
})
