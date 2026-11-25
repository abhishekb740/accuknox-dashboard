import { SearchIcon } from './icons'

interface EmptySearchStateProps {
  query: string
  onClear: () => void
}

export function EmptySearchState({ query, onClear }: EmptySearchStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
      <SearchIcon className="h-10 w-10 text-slate-300" />
      <h2 className="mt-4 text-base font-semibold text-slate-800">No widgets match your search</h2>
      <p className="mt-1 max-w-sm text-sm break-words text-slate-500">
        Nothing in any category has &ldquo;{query.trim()}&rdquo; in its name or text.
      </p>
      <button
        type="button"
        onClick={onClear}
        className="mt-5 rounded-lg border border-indigo-900 px-4 py-2 text-sm font-medium text-indigo-900 hover:bg-indigo-50"
      >
        Clear search
      </button>
    </div>
  )
}
