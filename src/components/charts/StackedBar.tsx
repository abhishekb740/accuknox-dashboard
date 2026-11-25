import type { ChartDatum } from '../../types'
import { ChartLegend } from './ChartLegend'

interface StackedBarProps {
  data: ChartDatum[]
  unit: string
  label: string
}

/** A single horizontal bar split into segments proportional to each value. */
export function StackedBar({ data, unit, label }: StackedBarProps) {
  const total = data.reduce((sum, d) => sum + d.value, 0)

  return (
    <div className="flex h-full flex-col justify-center gap-4">
      <p className="text-slate-900">
        <span className="text-2xl font-semibold">{total.toLocaleString()}</span>{' '}
        <span className="text-sm text-slate-500">{unit}</span>
      </p>
      <div
        className="flex h-4 w-full overflow-hidden rounded-full bg-slate-100"
        role="img"
        aria-label={label}
      >
        {data.map((d) => (
          <div
            key={d.label}
            className="h-full"
            style={{ width: `${total ? (d.value / total) * 100 : 0}%`, backgroundColor: d.color }}
          />
        ))}
      </div>
      <ChartLegend data={data} layout="grid" />
    </div>
  )
}
