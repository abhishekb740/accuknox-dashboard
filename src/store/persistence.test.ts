import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Category } from '../types'
import { getDefaultCategories, STORAGE_KEY, useDashboardStore } from './dashboardStore'
import {
  InvalidSavedStateError,
  mergeLayout,
  migrateLayout,
  parseLayout,
  toPersistedLayout,
  type PersistedLayout,
} from './persistence'

const config: Category[] = [
  {
    id: 'cspm',
    name: 'CSPM',
    tabLabel: 'CSPM',
    widgets: [
      { id: 'a', name: 'Config A', text: 'from config', type: 'donut' },
      { id: 'b', name: 'Config B', text: 'from config', type: 'empty' },
    ],
  },
  { id: 'new-cat', name: 'New Category', tabLabel: 'New', widgets: [{ id: 'c', name: 'C', text: 'c' }] },
]

const layout = (overrides: Partial<PersistedLayout> = {}): PersistedLayout => ({
  hiddenWidgetIds: [],
  customWidgets: {},
  ...overrides,
})

describe('mergeLayout', () => {
  it('returns the config unchanged when the user changed nothing', () => {
    expect(mergeLayout(config, layout())).toEqual(config)
  })

  it('keeps hidden flags and appends user widgets after the config widgets', () => {
    const merged = mergeLayout(
      config,
      layout({
        hiddenWidgetIds: ['a', 'mine'],
        customWidgets: { cspm: [{ id: 'mine', name: 'Mine', text: 'my text' }] },
      }),
    )
    expect(merged[0].widgets).toEqual([
      { id: 'a', name: 'Config A', text: 'from config', type: 'donut', hidden: true },
      { id: 'b', name: 'Config B', text: 'from config', type: 'empty' },
      { id: 'mine', name: 'Mine', text: 'my text', type: 'text', custom: true, hidden: true },
    ])
  })

  it('shows categories and widgets that are new in the config', () => {
    const merged = mergeLayout(config, layout({ hiddenWidgetIds: ['b'] }))
    expect(merged.map((c) => c.id)).toEqual(['cspm', 'new-cat'])
    expect(merged[1].widgets[0].hidden).toBeUndefined()
  })

  it('drops user widgets whose category left the config, and unknown hidden ids', () => {
    const merged = mergeLayout(
      config,
      layout({
        hiddenWidgetIds: ['gone'],
        customWidgets: { removed: [{ id: 'orphan', name: 'Orphan', text: 'x' }] },
      }),
    )
    expect(merged).toEqual(config)
  })

  it('lets a config widget win over a user widget with the same id', () => {
    const merged = mergeLayout(
      config,
      layout({ customWidgets: { cspm: [{ id: 'a', name: 'Clash', text: 'x' }] } }),
    )
    expect(merged[0].widgets.map((w) => w.name)).toEqual(['Config A', 'Config B'])
  })

  it('round-trips through toPersistedLayout', () => {
    const merged = mergeLayout(
      config,
      layout({
        hiddenWidgetIds: ['b'],
        customWidgets: { 'new-cat': [{ id: 'mine', name: 'Mine', text: 'x' }] },
      }),
    )
    expect(toPersistedLayout(merged)).toEqual({
      hiddenWidgetIds: ['b'],
      customWidgets: { 'new-cat': [{ id: 'mine', name: 'Mine', text: 'x' }] },
    })
  })
})

describe('migrateLayout', () => {
  it('converts a v1 snapshot to the v2 layout, keeping hidden flags and user widgets', () => {
    const v1 = {
      categories: [
        {
          id: 'cspm',
          name: 'Old name',
          tabLabel: 'Old',
          widgets: [
            { id: 'a', name: 'Stale name', text: 'stale', hidden: true },
            { id: 'b', name: 'B', text: 'b', hidden: false },
            { id: 'mine', name: 'Mine', text: 'my text', type: 'text', custom: true },
          ],
        },
      ],
    }
    expect(migrateLayout(v1, 1)).toEqual({
      hiddenWidgetIds: ['a'],
      customWidgets: { cspm: [{ id: 'mine', name: 'Mine', text: 'my text' }] },
    })
  })

  it('rejects a malformed v1 snapshot and unknown versions', () => {
    expect(() => migrateLayout({ categories: 'nope' }, 1)).toThrow(InvalidSavedStateError)
    expect(() =>
      migrateLayout({ categories: [{ id: 'x', widgets: [{ id: 'w', custom: true }] }] }, 1),
    ).toThrow(InvalidSavedStateError)
    expect(() => migrateLayout(layout(), 99)).toThrow(/unknown saved version 99/)
  })
})

describe('parseLayout', () => {
  it('accepts a valid layout', () => {
    const valid = layout({ hiddenWidgetIds: ['a'], customWidgets: { x: [{ id: 'w', name: 'n', text: 't' }] } })
    expect(parseLayout(valid)).toEqual(valid)
  })

  it.each([
    ['null', null],
    ['an array', []],
    ['hidden ids that are not strings', { hiddenWidgetIds: [1], customWidgets: {} }],
    ['missing customWidgets', { hiddenWidgetIds: [] }],
    ['a user widget without text', { hiddenWidgetIds: [], customWidgets: { x: [{ id: 'w', name: 'n' }] } }],
  ])('rejects %s', (_label, value) => {
    expect(() => parseLayout(value)).toThrow(InvalidSavedStateError)
  })
})

describe('rehydrating the store from localStorage', () => {
  const store = () => useDashboardStore.getState()
  const save = (value: unknown) =>
    localStorage.setItem(STORAGE_KEY, typeof value === 'string' ? value : JSON.stringify(value))

  beforeEach(() => {
    localStorage.clear()
    store().resetDashboard()
    localStorage.clear()
    vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('migrates a v1 snapshot, picks up config changes and rewrites storage as v2', async () => {
    // A returning visitor saved under v1 when only CSPM existed, with stale widget names.
    save({
      version: 1,
      state: {
        categories: [
          {
            id: 'cspm',
            name: 'CSPM Executive Dashboard',
            tabLabel: 'CSPM',
            widgets: [
              { id: 'cloud-accounts', name: 'Old title', text: 'old', hidden: true },
              { id: 'mine', name: 'My Widget', text: 'mine', type: 'text', custom: true },
            ],
          },
        ],
      },
    })

    await useDashboardStore.persist.rehydrate()

    const [cspm, cwpp, registry] = store().categories
    expect(cspm.widgets.map((w) => [w.name, Boolean(w.hidden)])).toEqual([
      ['Cloud Accounts', true],
      ['Cloud Account Risk Assessment', false],
      ['My Widget', false],
    ])
    expect(cwpp.widgets).toHaveLength(2)
    expect(registry.widgets).toHaveLength(2)

    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY)!)
    expect(saved).toEqual({
      version: 2,
      state: {
        hiddenWidgetIds: ['cloud-accounts'],
        customWidgets: { cspm: [{ id: 'mine', name: 'My Widget', text: 'mine' }] },
      },
    })
  })

  it('restores a v2 layout', async () => {
    save({ version: 2, state: { hiddenWidgetIds: ['workload-alerts'], customWidgets: {} } })
    await useDashboardStore.persist.rehydrate()
    expect(store().categories[1].widgets.find((w) => w.id === 'workload-alerts')?.hidden).toBe(true)
  })

  it.each([
    ['text that is not JSON', '{not json'],
    ['a JSON value that is not a state object', '42'],
    ['a v2 layout with the wrong shape', { version: 2, state: { hiddenWidgetIds: 'all' } }],
    ['a broken v1 snapshot', { version: 1, state: { categories: [{ id: 7 }] } }],
    ['a version this app does not know', { version: 7, state: {} }],
  ])('falls back to the config and clears storage for %s', async (_label, value) => {
    save(value)

    await useDashboardStore.persist.rehydrate()

    expect(store().categories).toEqual(getDefaultCategories())
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull()
    expect(console.warn).toHaveBeenCalledOnce()
  })
})
