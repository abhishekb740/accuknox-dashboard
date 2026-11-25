import { useEffect, useRef, useState } from 'react'
import { useDashboardStore } from '../store/dashboardStore'
import { ActionsMenu } from './ActionsMenu'
import { ChevronDownIcon, ClockIcon, PlusIcon, RefreshIcon } from './icons'

const TIME_RANGES = [
  { value: '2d', label: 'Last 2 days' },
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
]

interface DashboardHeaderProps {
  onAddWidget: () => void
}

export function DashboardHeader({ onAddWidget }: DashboardHeaderProps) {
  const resetDashboard = useDashboardStore((state) => state.resetDashboard)
  const [timeRange, setTimeRange] = useState(TIME_RANGES[0].value)
  const [refreshing, setRefreshing] = useState(false)
  const [status, setStatus] = useState('')
  const timer = useRef<number | undefined>(undefined)

  useEffect(() => () => window.clearTimeout(timer.current), [])

  // The data is static, so refresh only gives visual feedback. A real API call would go here.
  const handleRefresh = () => {
    setRefreshing(true)
    setStatus('')
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => {
      setRefreshing(false)
      setStatus('Dashboard refreshed')
    }, 600)
  }

  const handleReset = () => {
    resetDashboard()
    setStatus('Dashboard reset to default widgets')
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h1 className="text-lg font-bold text-slate-900">CNAPP Dashboard</h1>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onAddWidget}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 hover:text-slate-900"
        >
          Add Widget
          <PlusIcon />
        </button>

        <button
          type="button"
          onClick={handleRefresh}
          aria-label="Refresh dashboard"
          className="rounded-lg border border-slate-200 bg-white p-2 text-slate-600 shadow-sm hover:bg-slate-50 hover:text-slate-900"
        >
          <RefreshIcon className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
        </button>

        <ActionsMenu
          actions={[
            { label: 'Add widget', onSelect: onAddWidget },
            { label: 'Reset to default', onSelect: handleReset, tone: 'danger' },
          ]}
        />

        <div className="relative">
          <label htmlFor="time-range" className="sr-only">
            Time range
          </label>
          <ClockIcon className="pointer-events-none absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-indigo-900" />
          <select
            id="time-range"
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="appearance-none rounded-lg border border-indigo-900 bg-white py-2 pr-8 pl-8 text-sm font-medium text-indigo-900 shadow-sm hover:bg-indigo-50 focus:ring-2 focus:ring-indigo-200 focus:outline-none"
          >
            {TIME_RANGES.map((range) => (
              <option key={range.value} value={range.value}>
                {range.label}
              </option>
            ))}
          </select>
          <ChevronDownIcon className="pointer-events-none absolute top-1/2 right-2.5 h-4 w-4 -translate-y-1/2 text-indigo-900" />
        </div>
      </div>

      <p role="status" className="sr-only">
        {status}
      </p>
    </div>
  )
}
