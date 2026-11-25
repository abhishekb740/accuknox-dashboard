import type { ChartDatum } from '../../types'
import { ChartLegend } from './ChartLegend'

interface DonutChartProps {
  data: ChartDatum[]
  /** Accessible summary read by screen readers in place of the drawing. */
  label: string
}

const SIZE = 120
const STROKE = 18
const RADIUS = (SIZE - STROKE) / 2
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

/**
 * Donut drawn with one SVG circle per slice. Each circle shows a dash the length of its
 * share and is shifted by the total of the slices before it.
 */
export function DonutChart({ data, label }: DonutChartProps) {
  const total = data.reduce((sum, d) => sum + d.value, 0)

  const slices = data.reduce<Array<ChartDatum & { length: number; offset: number }>>(
    (acc, datum) => {
      const offset = acc.length ? acc[acc.length - 1].offset + acc[acc.length - 1].length : 0
      const length = total ? (datum.value / total) * CIRCUMFERENCE : 0
      return [...acc, { ...datum, length, offset }]
    },
    [],
  )

  return (
    <div className="flex h-full items-center gap-6">
      <figure className="relative shrink-0" role="img" aria-label={label}>
        <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} className="-rotate-90">
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            fill="none"
            stroke="#eef1f6"
            strokeWidth={STROKE}
          />
          {slices.map((slice) => (
            <circle
              key={slice.label}
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={RADIUS}
              fill="none"
              stroke={slice.color}
              strokeWidth={STROKE}
              strokeDasharray={`${slice.length} ${CIRCUMFERENCE - slice.length}`}
              strokeDashoffset={-slice.offset}
            />
          ))}
        </svg>
        <figcaption className="absolute inset-0 flex flex-col items-center justify-center leading-tight">
          <span className="text-lg font-semibold text-slate-900">{total.toLocaleString()}</span>
          <span className="text-xs text-slate-500">Total</span>
        </figcaption>
      </figure>
      <ChartLegend data={data} />
    </div>
  )
}
