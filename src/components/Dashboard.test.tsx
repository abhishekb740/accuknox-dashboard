import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../App'
import { useDashboardStore } from '../store/dashboardStore'
import type { Widget } from '../types'
import { WidgetCard } from './WidgetCard'

beforeEach(() => {
  localStorage.clear()
  useDashboardStore.getState().resetDashboard()
})

describe('WidgetCard', () => {
  const textWidget: Widget = { id: 'w1', name: 'Runtime Policies', text: '12 syscalls blocked', type: 'text' }

  it('shows the text of a text widget and calls onRemove from the cross button', async () => {
    const onRemove = vi.fn()
    render(<WidgetCard widget={textWidget} onRemove={onRemove} />)

    const card = screen.getByRole('article', { name: 'Runtime Policies' })
    expect(within(card).getByText('12 syscalls blocked')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Remove Runtime Policies widget' }))
    expect(onRemove).toHaveBeenCalledOnce()
  })

  it('shows the empty chart placeholder for an empty widget', () => {
    render(<WidgetCard widget={{ ...textWidget, type: 'empty' }} onRemove={() => {}} />)
    expect(screen.getByText(/No Graph data available/i)).toBeInTheDocument()
  })
})

describe('App', () => {
  it('renders one section per category with its widgets', () => {
    render(<App />)
    const cwpp = screen.getByRole('region', { name: 'CWPP Dashboard' })
    expect(within(cwpp).getAllByRole('article')).toHaveLength(2)
    expect(screen.getAllByRole('article')).toHaveLength(6)
  })

  it('removes a widget from the page and the store', async () => {
    render(<App />)
    await userEvent.click(screen.getByRole('button', { name: 'Remove Workload Alerts widget' }))

    expect(screen.queryByRole('article', { name: 'Workload Alerts' })).not.toBeInTheDocument()
    const cwpp = useDashboardStore.getState().categories.find((c) => c.id === 'cwpp')!
    expect(cwpp.widgets.find((w) => w.id === 'workload-alerts')?.hidden).toBe(true)
  })

  it('adds a widget through the drawer into the category it was opened from', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: 'Add widget to Registry Scan' }))

    const dialog = screen.getByRole('dialog', { name: 'Add Widget' })
    await user.type(within(dialog).getByLabelText('Widget name'), 'Base Image Drift')
    await user.type(within(dialog).getByLabelText('Widget text'), 'Old base layers')
    await user.click(within(dialog).getByRole('button', { name: 'Add to list' }))
    await user.click(within(dialog).getByRole('button', { name: 'Confirm' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    const registry = screen.getByRole('region', { name: 'Registry Scan' })
    expect(within(registry).getByRole('article', { name: 'Base Image Drift' })).toBeInTheDocument()
  })

  it('filters by search and shows the empty state when nothing matches', async () => {
    const user = userEvent.setup()
    render(<App />)
    const search = screen.getByRole('searchbox', { name: 'Search widgets' })

    await user.type(search, 'cloud')
    expect(screen.getAllByRole('article')).toHaveLength(2)

    await user.clear(search)
    await user.type(search, 'zzz')
    expect(screen.getByRole('heading', { name: 'No widgets match your search' })).toBeInTheDocument()

    await user.click(screen.getAllByRole('button', { name: 'Clear search' }).at(-1)!)
    expect(screen.getAllByRole('article')).toHaveLength(6)
  })
})
