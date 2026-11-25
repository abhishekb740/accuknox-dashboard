import { PlusIcon } from './icons'

interface AddWidgetCardProps {
  categoryName: string
  onClick: () => void
}

/** The dashed placeholder at the end of each category grid. */
export function AddWidgetCard({ categoryName, onClick }: AddWidgetCardProps) {
  return (
    <div className="flex h-28 items-center justify-center rounded-2xl border-2 md:h-64 border-dashed border-slate-300 bg-white/60">
      <button
        type="button"
        onClick={onClick}
        aria-label={`Add widget to ${categoryName}`}
        className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-600 shadow-sm transition hover:border-slate-400 hover:text-slate-900"
      >
        <PlusIcon />
        Add Widget
      </button>
    </div>
  )
}
