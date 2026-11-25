import { beforeEach, describe, expect, it } from 'vitest'
import { filterCategories } from '../lib/filterWidgets'
import { getDefaultCategories, STORAGE_KEY, useDashboardStore } from './dashboardStore'

const store = () => useDashboardStore.getState()
const category = (id: string) => store().categories.find((c) => c.id === id)!
const widget = (categoryId: string, widgetId: string) =>
  category(categoryId).widgets.find((w) => w.id === widgetId)
/** Adds one widget the way the drawer does, through applyWidgetChanges. */
const add = (categoryId: string, name: string, text: string) =>
  store().applyWidgetChanges({ visibility: {}, additions: [{ categoryId, name, text }] })

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

describe('adding widgets', () => {
  it('appends a visible text widget to the chosen category only', () => {
    add('cwpp', 'Runtime Policies', 'Blocked syscalls')

    expect(category('cwpp').widgets.at(-1)).toMatchObject({
      name: 'Runtime Policies',
      text: 'Blocked syscalls',
      type: 'text',
      custom: true,
    })
    expect(category('cwpp').widgets.at(-1)?.hidden).toBeFalsy()
    expect(category('cspm').widgets).toHaveLength(2)
  })

  it('trims input and skips an addition with an empty name or text', () => {
    add('cspm', '   ', 'x')
    add('cspm', 'x', '')
    expect(category('cspm').widgets).toHaveLength(2)

    add('cspm', '  Spaced  ', ' out ')
    expect(category('cspm').widgets.at(-1)).toMatchObject({ name: 'Spaced', text: 'out' })
  })

  it('gives each new widget a unique id', () => {
    add('cspm', 'A', 'a')
    add('cspm', 'A', 'a')
    const [a, b] = category('cspm').widgets.slice(-2)
    expect(a.id).not.toBe(b.id)
  })

  it('ignores additions for an unknown category', () => {
    const before = store().categories
    add('missing', 'Lost', 'nowhere to go')
    expect(store().categories).toEqual(before)
  })

  it('persists only the user changes to localStorage', () => {
    add('registry', 'Saved', 'kept')
    store().removeWidget('cspm', 'cloud-accounts')

    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY)!)
    expect(saved.version).toBe(2)
    expect(saved.state.hiddenWidgetIds).toEqual(['cloud-accounts'])
    expect(saved.state.customWidgets.registry).toEqual([
      { id: expect.any(String), name: 'Saved', text: 'kept' },
    ])
    // Config widgets are not copied into storage.
    expect(localStorage.getItem(STORAGE_KEY)).not.toContain('Image Risk Assessment')
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
  it('applyWidgetChanges hides and shows a widget', () => {
    store().applyWidgetChanges({ visibility: { 'image-risk': false }, additions: [] })
    expect(widget('registry', 'image-risk')?.hidden).toBe(true)

    store().applyWidgetChanges({ visibility: { 'image-risk': true }, additions: [] })
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
    add('cspm', 'Notes', 'Quarterly kubernetes review')
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
    add('cspm', 'Temp', 'temp')
    store().removeWidget('registry', 'image-risk')
    store().setSearchQuery('temp')

    store().resetDashboard()

    expect(store().categories).toEqual(getDefaultCategories())
    expect(store().searchQuery).toBe('')
  })
})
