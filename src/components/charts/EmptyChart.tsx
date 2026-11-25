import { ChartIcon } from '../icons'

export function EmptyChart() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 text-slate-400">
      <ChartIcon className="h-10 w-10" />
      <p className="text-sm">No Graph data available!</p>
    </div>
  )
}
