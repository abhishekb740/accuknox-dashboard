import { useDashboardStore } from '../store/dashboardStore'
import { BellIcon, ChevronRightIcon, CloseIcon, SearchIcon, UserIcon } from './icons'

export function TopBar() {
  const searchQuery = useDashboardStore((state) => state.searchQuery)
  const setSearchQuery = useDashboardStore((state) => state.setSearchQuery)

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-screen-2xl flex-wrap items-center gap-3 px-4 py-3 sm:flex-nowrap sm:px-6">
        <nav aria-label="Breadcrumb" className="order-1 shrink-0">
          <ol className="flex items-center gap-1.5 text-sm">
            <li className="text-slate-500">Home</li>
            <li aria-hidden="true" className="text-slate-400">
              <ChevronRightIcon className="h-3.5 w-3.5" />
            </li>
            <li aria-current="page" className="font-semibold text-indigo-900">
              Dashboard V2
            </li>
          </ol>
        </nav>

        <form
          role="search"
          onSubmit={(e) => e.preventDefault()}
          className="order-3 w-full sm:order-2 sm:mx-auto sm:max-w-md"
        >
          <label htmlFor="widget-search" className="sr-only">
            Search widgets
          </label>
          <div className="relative">
            <SearchIcon className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              id="widget-search"
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search anything..."
              autoComplete="off"
              className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pr-9 pl-9 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100 focus:outline-none [&::-webkit-search-cancel-button]:hidden"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label="Clear search"
                className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-slate-700"
              >
                <CloseIcon className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </form>

        <div className="order-2 ml-auto flex items-center gap-2 sm:order-3 sm:ml-0">
          <button
            type="button"
            aria-label="Notifications"
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
          >
            <BellIcon className="h-5 w-5" />
          </button>
          <button
            type="button"
            aria-label="Account"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-indigo-900 hover:bg-indigo-200"
          >
            <UserIcon className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  )
}
