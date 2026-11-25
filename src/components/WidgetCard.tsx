import type { Widget } from '../types'
import { DonutChart } from './charts/DonutChart'
import { EmptyChart } from './charts/EmptyChart'
import { StackedBar } from './charts/StackedBar'
import { CloseIcon } from './icons'

interface WidgetCardProps {
  widget: Widget
  onRemove: () => void
}

function WidgetBody({ widget }: { widget: Widget }) {
  const summary = widget.data?.map((d) => `${d.label} ${d.value}`).join(', ') ?? ''

  switch (widget.type) {
    case 'donut':
      return widget.data?.length ? (
        <DonutChart data={widget.data} label={`${widget.name}: ${summary}`} />
      ) : (
        <EmptyChart />
      )
    case 'bar':
      return widget.data?.length ? (
        <StackedBar
          data={widget.data}
          unit={widget.unit ?? 'Total'}
          label={`${widget.name}: ${summary}`}
        />
      ) : (
        <EmptyChart />
      )
    case 'empty':
      return <EmptyChart />
    default:
      return (
        <p className="line-clamp-6 text-sm leading-relaxed whitespace-pre-line text-slate-600">
          {widget.text}
        </p>
      )
  }
}

export function WidgetCard({ widget, onRemove }: WidgetCardProps) {
  const titleId = `widget-title-${widget.id}`
  const isText = !widget.type || widget.type === 'text'

  return (
    <article
      aria-labelledby={titleId}
      className="group flex h-64 flex-col rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200/70 transition-shadow hover:shadow-md"
    >
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 id={titleId} className="truncate text-sm font-semibold text-slate-900">
            {widget.name}
          </h3>
          {!isText && <p className="mt-0.5 truncate text-xs text-slate-500">{widget.text}</p>}
        </div>
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove ${widget.name} widget`}
          title="Remove widget"
          className="-mt-1 -mr-1 shrink-0 rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 sm:opacity-0 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100"
        >
          <CloseIcon />
        </button>
      </header>
      <div className="mt-4 min-h-0 flex-1">
        <WidgetBody widget={widget} />
      </div>
    </article>
  )
}
