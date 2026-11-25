import type { ChartDatum } from '../../types'

interface ChartLegendProps {
  data: ChartDatum[]
  layout?: 'column' | 'grid'
}

export function ChartLegend({ data, layout = 'column' }: ChartLegendProps) {
  return (
    <ul
      className={
        layout === 'grid'
          ? 'grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs text-slate-600'
          : 'flex flex-col gap-1.5 text-xs text-slate-600'
      }
    >
      {data.map((d) => (
        <li key={d.label} className="flex items-center gap-2">
          <span
            className="h-2.5 w-2.5 shrink-0 rounded-sm"
            style={{ backgroundColor: d.color }}
            aria-hidden="true"
          />
          <span>
            {d.label} <span className="text-slate-400">({d.value.toLocaleString()})</span>
          </span>
        </li>
      ))}
    </ul>
  )
}
