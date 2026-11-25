import { useMemo, useState } from 'react'
import { AddWidgetDrawer } from './components/AddWidgetDrawer'
import { CategorySection } from './components/CategorySection'
import { DashboardHeader } from './components/DashboardHeader'
import { EmptySearchState } from './components/EmptySearchState'
import { TopBar } from './components/TopBar'
import { filterCategories } from './lib/filterWidgets'
import { useDashboardStore } from './store/dashboardStore'

export default function App() {
  const categories = useDashboardStore((state) => state.categories)
  const searchQuery = useDashboardStore((state) => state.searchQuery)
  const setSearchQuery = useDashboardStore((state) => state.setSearchQuery)

  // Category id the drawer opens on, or null when it is closed.
  const [drawerCategoryId, setDrawerCategoryId] = useState<string | null>(null)

  const visibleCategories = useMemo(
    () => filterCategories(categories, searchQuery),
    [categories, searchQuery],
  )
  const isSearching = searchQuery.trim() !== ''
  const matchCount = visibleCategories.reduce((sum, c) => sum + c.widgets.length, 0)

  return (
    <div className="min-h-screen bg-slate-100">
      <TopBar />

      <main className="mx-auto max-w-screen-2xl space-y-6 px-4 py-6 sm:px-6">
        <DashboardHeader onAddWidget={() => setDrawerCategoryId(categories[0]?.id ?? null)} />

        {isSearching && (
          <p role="status" className="text-sm text-slate-600">
            {matchCount === 1 ? '1 widget matches' : `${matchCount} widgets match`} &ldquo;
            {searchQuery.trim()}&rdquo;
          </p>
        )}

        {isSearching && matchCount === 0 ? (
          <EmptySearchState query={searchQuery} onClear={() => setSearchQuery('')} />
        ) : (
          visibleCategories.map((category) => (
            <CategorySection
              key={category.id}
              category={category}
              showAddCard={!isSearching}
              onAddWidget={setDrawerCategoryId}
            />
          ))
        )}
      </main>

      {drawerCategoryId && (
        <AddWidgetDrawer
          initialCategoryId={drawerCategoryId}
          onClose={() => setDrawerCategoryId(null)}
        />
      )}
    </div>
  )
}
