import { useEffect, useId, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { createPortal } from 'react-dom'
import { useFocusTrap } from '../hooks/useFocusTrap'
import { createId } from '../lib/id'
import { useDashboardStore, type WidgetChanges } from '../store/dashboardStore'
import { CloseIcon, PlusIcon } from './icons'

interface AddWidgetDrawerProps {
  /** Category whose tab is selected when the drawer opens. */
  initialCategoryId: string
  onClose: () => void
}

type StagedWidget = WidgetChanges['additions'][number] & { tempId: string }

/** What is typed in the new widget form. Each tab keeps its own, so text stays where it was typed. */
interface Draft {
  name: string
  text: string
}

const EMPTY_DRAFT: Draft = { name: '', text: '' }
const isEmptyDraft = (draft: Draft) => !draft.name.trim() && !draft.text.trim()
const isCompleteDraft = (draft: Draft) => Boolean(draft.name.trim() && draft.text.trim())

/**
 * Right-side panel for choosing which widgets each category shows and creating new ones.
 * Every change is staged locally and only written to the store on Confirm.
 */
export function AddWidgetDrawer({ initialCategoryId, onClose }: AddWidgetDrawerProps) {
  const categories = useDashboardStore((state) => state.categories)
  const applyWidgetChanges = useDashboardStore((state) => state.applyWidgetChanges)

  const [activeId, setActiveId] = useState(initialCategoryId)
  const [visibility, setVisibility] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(categories.flatMap((c) => c.widgets.map((w) => [w.id, !w.hidden]))),
  )
  const [staged, setStaged] = useState<StagedWidget[]>([])
  const [drafts, setDrafts] = useState<Record<string, Draft>>({})
  const [error, setError] = useState('')

  const panelRef = useRef<HTMLDivElement>(null)
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({})
  const baseId = useId()

  // While open, the page behind is inert (unreachable by keyboard and screen readers) and
  // does not scroll. Declared before the focus trap so it is undone first on close, letting
  // the trap hand focus back to the button that opened the drawer.
  useEffect(() => {
    const root = document.getElementById('root')
    const previousOverflow = document.body.style.overflow
    root?.setAttribute('inert', '')
    document.body.style.overflow = 'hidden'
    return () => {
      root?.removeAttribute('inert')
      document.body.style.overflow = previousOverflow
    }
  }, [])

  useFocusTrap(panelRef, true, onClose)

  const activeCategory = categories.find((c) => c.id === activeId) ?? categories[0]
  const stagedHere = staged.filter((s) => s.categoryId === activeCategory.id)
  const draft = drafts[activeCategory.id] ?? EMPTY_DRAFT

  const updateDraft = (patch: Partial<Draft>) =>
    setDrafts((all) => ({ ...all, [activeCategory.id]: { ...draft, ...patch } }))

  const selectTab = (id: string) => {
    setActiveId(id)
    setError('')
    tabRefs.current[id]?.focus()
  }

  const handleTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const count = categories.length
    const targets: Record<string, number> = {
      ArrowRight: (index + 1) % count,
      ArrowLeft: (index - 1 + count) % count,
      Home: 0,
      End: count - 1,
    }
    if (!(event.key in targets)) return
    event.preventDefault()
    selectTab(categories[targets[event.key]].id)
  }

  const buildStaged = (categoryId: string, from: Draft): StagedWidget => ({
    tempId: createId('staged'),
    categoryId,
    name: from.name.trim(),
    text: from.text.trim(),
  })

  const handleStage = (event: FormEvent) => {
    event.preventDefault()
    if (!isCompleteDraft(draft)) {
      setError('Enter both a widget name and some widget text.')
      return
    }
    setStaged((list) => [...list, buildStaged(activeCategory.id, draft)])
    setDrafts((all) => ({ ...all, [activeCategory.id]: EMPTY_DRAFT }))
    setError('')
  }

  const handleConfirm = () => {
    // A filled-in form that was never added to the list still counts, in the category it was
    // typed in, so nothing typed is lost.
    const typedIn = categories.filter((c) => drafts[c.id] && !isEmptyDraft(drafts[c.id]))
    const unfinished = typedIn.find((c) => !isCompleteDraft(drafts[c.id]))
    if (unfinished) {
      selectTab(unfinished.id)
      setError('Finish the new widget (name and text) or clear it before confirming.')
      return
    }
    const additions = [...staged, ...typedIn.map((c) => buildStaged(c.id, drafts[c.id]))]
    applyWidgetChanges({
      visibility,
      additions: additions.map((item) => ({
        categoryId: item.categoryId,
        name: item.name,
        text: item.text,
      })),
    })
    onClose()
  }

  const titleId = `${baseId}-title`
  const panelId = `${baseId}-panel`
  const errorId = `${baseId}-error`

  return createPortal(
    <div className="fixed inset-0 z-40 flex justify-end">
      <div
        className="absolute inset-0 bg-slate-900/40 motion-safe:animate-fade-in"
        aria-hidden="true"
        onClick={onClose}
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="relative flex h-full w-full max-w-lg flex-col bg-white shadow-2xl motion-safe:animate-slide-in"
      >
        <header className="flex items-center justify-between bg-indigo-950 px-5 py-3.5 text-white">
          <h2 id={titleId} className="text-base font-semibold">
            Add Widget
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-md p-1 text-indigo-100 hover:bg-white/10 hover:text-white"
          >
            <CloseIcon className="h-5 w-5" />
          </button>
        </header>

        <div className="flex min-h-0 flex-1 flex-col px-5 pt-4">
          <p className="text-sm text-slate-600">
            Personalise your dashboard by adding the following widget
          </p>

          <div role="tablist" aria-label="Widget categories" className="mt-4 flex border-b border-slate-200">
            {categories.map((category, index) => {
              const selected = category.id === activeCategory.id
              return (
                <button
                  key={category.id}
                  ref={(el) => {
                    tabRefs.current[category.id] = el
                  }}
                  type="button"
                  role="tab"
                  id={`${baseId}-tab-${category.id}`}
                  aria-selected={selected}
                  aria-controls={panelId}
                  tabIndex={selected ? 0 : -1}
                  onClick={() => selectTab(category.id)}
                  onKeyDown={(e) => handleTabKeyDown(e, index)}
                  className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
                    selected
                      ? 'border-indigo-900 text-indigo-900'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {category.tabLabel}
                </button>
              )
            })}
          </div>

          <div
            role="tabpanel"
            id={panelId}
            aria-labelledby={`${baseId}-tab-${activeCategory.id}`}
            className="min-h-0 flex-1 overflow-y-auto py-4"
          >
            <fieldset>
              <legend className="mb-2 text-xs font-medium tracking-wide text-slate-500 uppercase">
                {activeCategory.name}
              </legend>
              <ul className="space-y-2">
                {activeCategory.widgets.map((widget) => {
                  const inputId = `${baseId}-widget-${widget.id}`
                  return (
                    <li key={widget.id}>
                      <label
                        htmlFor={inputId}
                        className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-800 hover:bg-slate-50"
                      >
                        <input
                          id={inputId}
                          type="checkbox"
                          checked={visibility[widget.id] ?? false}
                          onChange={(e) =>
                            setVisibility((v) => ({ ...v, [widget.id]: e.target.checked }))
                          }
                          className="h-4 w-4 accent-indigo-900"
                        />
                        <span className="min-w-0 flex-1 truncate">{widget.name}</span>
                        {widget.custom && <span className="text-xs text-slate-400">Custom</span>}
                      </label>
                    </li>
                  )
                })}
                {stagedHere.map((item) => (
                  <li
                    key={item.tempId}
                    className="flex items-center gap-3 rounded-lg border border-dashed border-indigo-300 bg-indigo-50/60 px-3 py-2.5 text-sm text-slate-800"
                  >
                    <span className="min-w-0 flex-1 truncate">{item.name}</span>
                    <span className="rounded bg-indigo-100 px-1.5 py-0.5 text-xs font-medium text-indigo-900">
                      New
                    </span>
                    <button
                      type="button"
                      onClick={() => setStaged((list) => list.filter((s) => s.tempId !== item.tempId))}
                      aria-label={`Discard new widget ${item.name}`}
                      className="rounded p-0.5 text-slate-400 hover:text-slate-700"
                    >
                      <CloseIcon className="h-3.5 w-3.5" />
                    </button>
                  </li>
                ))}
                {activeCategory.widgets.length === 0 && stagedHere.length === 0 && (
                  <li className="text-sm text-slate-500">No widgets in this category yet.</li>
                )}
              </ul>
            </fieldset>

            <form onSubmit={handleStage} noValidate className="mt-6 rounded-xl bg-slate-50 p-4">
              <h3 className="text-sm font-semibold text-slate-800">
                Create a widget in {activeCategory.name}
              </h3>
              <div className="mt-3 space-y-3">
                <div>
                  <label htmlFor={`${baseId}-name`} className="mb-1 block text-xs font-medium text-slate-600">
                    Widget name
                  </label>
                  <input
                    id={`${baseId}-name`}
                    value={draft.name}
                    onChange={(e) => updateDraft({ name: e.target.value })}
                    maxLength={60}
                    placeholder="e.g. Runtime Policy Violations"
                    aria-invalid={Boolean(error) && !draft.name.trim()}
                    aria-describedby={error ? errorId : undefined}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 focus:outline-none"
                  />
                </div>
                <div>
                  <label htmlFor={`${baseId}-text`} className="mb-1 block text-xs font-medium text-slate-600">
                    Widget text
                  </label>
                  <textarea
                    id={`${baseId}-text`}
                    value={draft.text}
                    onChange={(e) => updateDraft({ text: e.target.value })}
                    rows={3}
                    maxLength={400}
                    placeholder="What should this widget show?"
                    aria-invalid={Boolean(error) && !draft.text.trim()}
                    aria-describedby={error ? errorId : undefined}
                    className="w-full resize-none rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 focus:outline-none"
                  />
                </div>
                {error && (
                  <p id={errorId} role="alert" className="text-xs text-red-600">
                    {error}
                  </p>
                )}
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-900 px-3 py-1.5 text-sm font-medium text-indigo-900 hover:bg-indigo-50"
                >
                  <PlusIcon />
                  Add to list
                </button>
              </div>
            </form>
          </div>
        </div>

        <footer className="flex justify-end gap-3 border-t border-slate-200 px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-indigo-900 px-5 py-2 text-sm font-medium text-indigo-900 hover:bg-indigo-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="rounded-lg bg-indigo-900 px-5 py-2 text-sm font-medium text-white hover:bg-indigo-950"
          >
            Confirm
          </button>
        </footer>
      </div>
    </div>,
    document.body,
  )
}
