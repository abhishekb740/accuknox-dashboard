import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'
import { MoreVerticalIcon } from './icons'

export interface MenuAction {
  label: string
  onSelect: () => void
  tone?: 'default' | 'danger'
}

interface ActionsMenuProps {
  actions: MenuAction[]
}

/** Kebab button with a keyboard-navigable dropdown (arrow keys, Home, End, Escape). */
export function ActionsMenu({ actions }: ActionsMenuProps) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([])
  const menuId = useId()

  useEffect(() => {
    if (!open) return
    itemRefs.current[0]?.focus()

    const handlePointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [open])

  const close = () => {
    setOpen(false)
    buttonRef.current?.focus()
  }

  const handleMenuKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const items = itemRefs.current.filter((item): item is HTMLButtonElement => item !== null)
    const index = items.indexOf(document.activeElement as HTMLButtonElement)

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault()
        items[(index + 1) % items.length]?.focus()
        break
      case 'ArrowUp':
        event.preventDefault()
        items[(index - 1 + items.length) % items.length]?.focus()
        break
      case 'Home':
        event.preventDefault()
        items[0]?.focus()
        break
      case 'End':
        event.preventDefault()
        items[items.length - 1]?.focus()
        break
      case 'Escape':
        event.preventDefault()
        close()
        break
      case 'Tab':
        setOpen(false)
        break
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-label="More actions"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen((value) => !value)}
        className="rounded-lg border border-slate-200 bg-white p-2 text-slate-600 shadow-sm hover:bg-slate-50 hover:text-slate-900"
      >
        <MoreVerticalIcon />
      </button>

      {open && (
        <div
          id={menuId}
          role="menu"
          aria-label="More actions"
          onKeyDown={handleMenuKeyDown}
          className="absolute right-0 z-30 mt-2 w-48 rounded-xl border border-slate-200 bg-white p-1 shadow-lg"
        >
          {actions.map((action, i) => (
            <button
              key={action.label}
              ref={(el) => {
                itemRefs.current[i] = el
              }}
              type="button"
              role="menuitem"
              tabIndex={-1}
              onClick={() => {
                close()
                action.onSelect()
              }}
              className={`block w-full rounded-lg px-3 py-2 text-left text-sm focus:bg-slate-100 focus:outline-none ${
                action.tone === 'danger'
                  ? 'text-red-600 hover:bg-red-50'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              {action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
