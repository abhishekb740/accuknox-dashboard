import { useDashboardStore } from '../store/dashboardStore'
import type { Category } from '../types'
import { AddWidgetCard } from './AddWidgetCard'
import { WidgetCard } from './WidgetCard'

interface CategorySectionProps {
  /** The category with its widgets already filtered for display. */
  category: Category
  showAddCard: boolean
  onAddWidget: (categoryId: string) => void
}

export function CategorySection({ category, showAddCard, onAddWidget }: CategorySectionProps) {
  const removeWidget = useDashboardStore((state) => state.removeWidget)
  const headingId = `category-${category.id}`

  return (
    <section aria-labelledby={headingId}>
      <h2 id={headingId} className="mb-3 text-sm font-semibold text-slate-800">
        {category.name}
      </h2>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {category.widgets.map((widget) => (
          <WidgetCard
            key={widget.id}
            widget={widget}
            onRemove={() => removeWidget(category.id, widget.id)}
          />
        ))}
        {showAddCard && (
          <AddWidgetCard categoryName={category.name} onClick={() => onAddWidget(category.id)} />
        )}
      </div>
    </section>
  )
}
