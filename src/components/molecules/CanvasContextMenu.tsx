import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

import type { CanvasContextMenuAnchor, ContextMenuItem, ContextMenuItemId } from '@/core/canvasContextMenuTypes'

import styles from './CanvasContextMenu.module.css'

export const CANVAS_CONTEXT_MENU_ROOT_ATTR = 'data-canvas-context-menu-root'

type CanvasContextMenuProps = {
  anchor: CanvasContextMenuAnchor
  items: ContextMenuItem[]
  onClose: () => void
  onSelect: (id: ContextMenuItemId) => void
}

function toolbarVisibilityAriaLabel(item: ContextMenuItem): string | undefined {
  if (item.toolbarToolVisible === undefined) {
    return undefined
  }

  const status = item.toolbarToolVisible ? 'mostrando na barra' : 'oculto na barra'
  const context = item.contextLimited ? ', contexto inactivo' : ''

  return `${item.label}, ${status}${context}`
}

function ToolbarVisibilityMenuButton({
  item,
  onSelect,
}: {
  item: ContextMenuItem
  onSelect: (id: ContextMenuItemId) => void
}) {
  const visible = item.toolbarToolVisible === true
  const statusLabel = visible ? 'mostrando' : 'oculto'

  return (
    <button
      aria-label={toolbarVisibilityAriaLabel(item)}
      className={styles.toolbarVisibilityButton}
      data-context-limited={item.contextLimited ? 'true' : undefined}
      data-toolbar-visible={visible ? 'true' : 'false'}
      disabled={item.disabled}
      onClick={() => {
        if (!item.disabled) {
          onSelect(item.id)
        }
      }}
      role="menuitem"
      type="button"
    >
      <span className={styles.itemMain}>
        <span className={styles.itemLabel}>{item.label}</span>
        <span className={styles.visibilityTag} data-state={visible ? 'visible' : 'hidden'}>
          {statusLabel}
        </span>
      </span>
    </button>
  )
}

function ContextMenuButton({
  item,
  onSelect,
}: {
  item: ContextMenuItem
  onSelect: (id: ContextMenuItemId) => void
}) {
  if (item.toolbarToolVisible !== undefined) {
    return <ToolbarVisibilityMenuButton item={item} onSelect={onSelect} />
  }

  return (
    <button
      aria-checked={item.selected ? 'true' : undefined}
      data-danger={item.danger ? 'true' : undefined}
      data-selected={item.selected ? 'true' : undefined}
      disabled={item.disabled}
      onClick={() => {
        if (!item.disabled) {
          onSelect(item.id)
        }
      }}
      role={item.selected !== undefined ? 'menuitemradio' : 'menuitem'}
      type="button"
    >
      <span className={styles.itemMain}>
        {item.selected !== undefined ? (
          <span aria-hidden className={styles.selectedMark}>
            {item.selected ? '✓' : ''}
          </span>
        ) : null}
        <span className={styles.itemLabel}>{item.label}</span>
      </span>
      {item.shortcut ? <small>{item.shortcut}</small> : null}
    </button>
  )
}

function SubmenuChildButton({
  item,
  onSelect,
}: {
  item: ContextMenuItem
  onSelect: (id: ContextMenuItemId) => void
}) {
  if (item.toolbarToolVisible !== undefined) {
    return <ToolbarVisibilityMenuButton item={item} onSelect={onSelect} />
  }
  return <ContextMenuButton item={item} onSelect={onSelect} />
}

function ContextMenuSubmenuRow({
  item,
  onClose,
  onSelect,
}: {
  item: ContextMenuItem
  onClose: () => void
  onSelect: (id: ContextMenuItemId) => void
}) {
  const children = item.children ?? []

  return (
    <div
      className={styles.submenuRow}
      onMouseEnter={(event) => {
        event.currentTarget.dataset.open = 'true'
      }}
      onMouseLeave={(event) => {
        delete event.currentTarget.dataset.open
      }}
    >
      <button
        aria-haspopup="menu"
        className={[styles.submenuTrigger, styles.exibirTrigger].join(' ')}
        role="menuitem"
        type="button"
      >
        <span>{item.label}</span>
        <span aria-hidden className={styles.submenuCaret}>
          ›
        </span>
      </button>
      {children.length > 0 ? (
        <div className={[styles.submenuFlyout, styles.exibirFlyout].join(' ')} role="menu">
          {children.map((child) => (
            <div key={child.id}>
              {child.separatorBefore ? <div className={styles.separator} role="separator" /> : null}
              <SubmenuChildButton
                item={child}
                onSelect={(id) => {
                  onSelect(id)
                  onClose()
                }}
              />
            </div>
          ))}
        </div>
      ) : null}
    </div>
  )
}

export function CanvasContextMenu({ anchor, items, onClose, onSelect }: CanvasContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const closeOnOutsideClick = (event: MouseEvent) => {
      const target = event.target
      if (!(target instanceof globalThis.Node)) {
        return
      }
      if (target instanceof Element && target.closest(`[${CANVAS_CONTEXT_MENU_ROOT_ATTR}]`)) {
        return
      }
      if (!menuRef.current?.contains(target)) {
        onClose()
      }
    }

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('mousedown', closeOnOutsideClick)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('mousedown', closeOnOutsideClick)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [onClose])

  if (items.length === 0) {
    return null
  }

  return createPortal(
    <div
      {...{ [CANVAS_CONTEXT_MENU_ROOT_ATTR]: '' }}
      className={styles.menu}
      ref={menuRef}
      role="menu"
      style={{ left: `${anchor.left}px`, top: `${anchor.top}px` }}
    >
      {items.map((item) => (
        <div key={item.id}>
          {item.separatorBefore ? <div className={styles.separator} role="separator" /> : null}
          {item.children && item.children.length > 0 ? (
            <ContextMenuSubmenuRow item={item} onClose={onClose} onSelect={onSelect} />
          ) : (
            <ContextMenuButton
              item={item}
              onSelect={(id) => {
                onSelect(id)
                onClose()
              }}
            />
          )}
        </div>
      ))}
    </div>,
    document.body,
  )
}
