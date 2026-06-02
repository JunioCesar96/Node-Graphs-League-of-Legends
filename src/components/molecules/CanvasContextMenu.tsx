import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

import type { CanvasContextMenuAnchor, ContextMenuItem, ContextMenuItemId } from '@/core/canvasContextMenuTypes'
import { LangId } from '@/core/language/languageIds'
import { formatLanguageText } from '@/core/language/languagePack'
import { useContextMenuPlacement } from '@/hooks/useContextMenuPlacement'
import { useLanguage } from '@/language/LanguageProvider'

import { AppToggleCheckbox } from '@/components/atoms/AppToggleCheckbox'

import styles from './CanvasContextMenu.module.css'

export const CANVAS_CONTEXT_MENU_ROOT_ATTR = 'data-canvas-context-menu-root'

type CanvasContextMenuProps = {
  anchor: CanvasContextMenuAnchor
  items: ContextMenuItem[]
  onClose: () => void
  onSelect: (id: ContextMenuItemId) => void
}

function toolbarVisibilityAriaLabel(
  item: ContextMenuItem,
  t: ReturnType<typeof useLanguage>['t'],
): string | undefined {
  if (item.toolbarToolVisible === undefined) {
    return undefined
  }

  const template = item.toolbarToolVisible
    ? t(LangId.CtxToolbarAriaVisible, '{label}, mostrando na barra')
    : t(LangId.CtxToolbarAriaHidden, '{label}, oculto na barra')
  const context = item.contextLimited
    ? t(LangId.CtxToolbarContextInactive, ', contexto inactivo')
    : ''

  return `${formatLanguageText(template, { label: item.label })}${context}`
}

function ToolbarVisibilityMenuButton({
  item,
  onSelect,
  t,
}: {
  item: ContextMenuItem
  onSelect: (id: ContextMenuItemId) => void
  t: ReturnType<typeof useLanguage>['t']
}) {
  const visible = item.toolbarToolVisible === true
  const statusLabel = visible
    ? t(LangId.CtxToolbarShowing, 'mostrando')
    : t(LangId.CtxToolbarHidden, 'oculto')

  return (
    <button
      aria-label={toolbarVisibilityAriaLabel(item, t)}
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
  t,
}: {
  item: ContextMenuItem
  onSelect: (id: ContextMenuItemId) => void
  t: ReturnType<typeof useLanguage>['t']
}) {
  if (item.toolbarToolVisible !== undefined) {
    return <ToolbarVisibilityMenuButton item={item} onSelect={onSelect} t={t} />
  }

  if (item.toggleCheckbox) {
    return (
      <button
        aria-checked={item.selected ? 'true' : 'false'}
        className={styles.themeToggleButton}
        data-selected={item.selected ? 'true' : 'false'}
        disabled={item.disabled}
        onClick={() => {
          if (!item.disabled) {
            onSelect(item.id)
          }
        }}
        role="menuitemcheckbox"
        type="button"
      >
        <span className={styles.itemLabel}>{item.label}</span>
        <AppToggleCheckbox checked={Boolean(item.selected)} decorative size="compact" />
      </button>
    )
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

function ContextMenuEntry({
  item,
  onClose,
  onSelect,
  t,
  highlighted = false,
}: {
  item: ContextMenuItem
  onClose: () => void
  onSelect: (id: ContextMenuItemId) => void
  t: ReturnType<typeof useLanguage>['t']
  highlighted?: boolean
}) {
  if (item.children && item.children.length > 0) {
    return (
      <ContextMenuSubmenuRow
        highlighted={highlighted}
        item={item}
        onClose={onClose}
        onSelect={onSelect}
        t={t}
      />
    )
  }

  return (
    <ContextMenuButton
      item={item}
      onSelect={(id) => {
        onSelect(id)
        onClose()
      }}
      t={t}
    />
  )
}

function ContextMenuSubmenuRow({
  item,
  onClose,
  onSelect,
  t,
  highlighted = false,
}: {
  item: ContextMenuItem
  onClose: () => void
  onSelect: (id: ContextMenuItemId) => void
  t: ReturnType<typeof useLanguage>['t']
  highlighted?: boolean
}) {
  const children = item.children ?? []
  const rowRef = useRef<HTMLDivElement>(null)
  const flyoutRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [flipX, setFlipX] = useState(false)
  const [flipY, setFlipY] = useState(false)
  const [flyoutMaxHeight, setFlyoutMaxHeight] = useState<number | undefined>(undefined)

  const updateFlyoutPlacement = () => {
    const row = rowRef.current
    const flyout = flyoutRef.current

    if (!row || !flyout) {
      return
    }

    const rowRect = row.getBoundingClientRect()
    const flyoutWidth = flyout.offsetWidth
    const flyoutHeight = flyout.offsetHeight
    const gap = 4
    const margin = 8

    const openRightLeft = rowRect.right + gap
    const openLeftLeft = rowRect.left - gap - flyoutWidth
    const shouldFlipX = openRightLeft + flyoutWidth + margin > window.innerWidth && openLeftLeft >= margin
    setFlipX(shouldFlipX)

    const overflowForTop = (top: number) => {
      const bottom = top + flyoutHeight
      return Math.max(0, margin - top) + Math.max(0, bottom + margin - window.innerHeight)
    }

    const topDefault = rowRect.top
    const topFlipped = rowRect.bottom - flyoutHeight
    const shouldFlipY = overflowForTop(topFlipped) < overflowForTop(topDefault)
    setFlipY(shouldFlipY)

    const availableBelow = Math.max(140, window.innerHeight - rowRect.top - margin)
    const availableAbove = Math.max(140, rowRect.bottom - margin)
    setFlyoutMaxHeight(shouldFlipY ? availableAbove : availableBelow)
  }

  return (
    <div
      data-open={open ? 'true' : undefined}
      className={styles.submenuRow}
      ref={rowRef}
      onFocus={() => {
        setOpen(true)
        requestAnimationFrame(updateFlyoutPlacement)
      }}
      onMouseEnter={(event) => {
        setOpen(true)
        requestAnimationFrame(updateFlyoutPlacement)
      }}
      onMouseLeave={(event) => {
        setOpen(false)
      }}
    >
      <button
        aria-expanded={open ? 'true' : 'false'}
        aria-haspopup="menu"
        className={[styles.submenuTrigger, highlighted ? styles.exibirTrigger : ''].filter(Boolean).join(' ')}
        role="menuitem"
        type="button"
      >
        <span>{item.label}</span>
        <span aria-hidden className={styles.submenuCaret}>
          ›
        </span>
      </button>
      {children.length > 0 ? (
        <div
          className={[styles.submenuFlyout, highlighted ? styles.exibirFlyout : ''].filter(Boolean).join(' ')}
          data-flip-x={flipX ? 'true' : undefined}
          data-flip-y={flipY ? 'true' : undefined}
          data-open={open ? 'true' : undefined}
          ref={flyoutRef}
          role="menu"
          style={flyoutMaxHeight ? { maxHeight: `${flyoutMaxHeight}px` } : undefined}
        >
          {children.map((child) => (
            <div key={child.id}>
              {child.separatorBefore ? <div className={styles.separator} role="separator" /> : null}
              <ContextMenuEntry
                item={child}
                onClose={onClose}
                onSelect={onSelect}
                t={t}
              />
            </div>
          ))}
        </div>
      ) : null}
    </div>
  )
}

export function CanvasContextMenu({ anchor, items, onClose, onSelect }: CanvasContextMenuProps) {
  const { t } = useLanguage()
  const menuRef = useRef<HTMLDivElement>(null)
  const placement = useContextMenuPlacement(anchor.left, anchor.top, menuRef)

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
      data-expand-down={placement.expandDown ? 'true' : 'false'}
      data-expand-right={placement.expandRight ? 'true' : 'false'}
      ref={menuRef}
      role="menu"
      style={{ left: `${placement.x}px`, top: `${placement.y}px` }}
    >
      {items.map((item) => (
        <div key={item.id}>
          {item.separatorBefore ? <div className={styles.separator} role="separator" /> : null}
          <ContextMenuEntry
            highlighted={item.id === 'canvas.exibir'}
            item={item}
            onClose={onClose}
            onSelect={onSelect}
            t={t}
          />
        </div>
      ))}
    </div>,
    document.body,
  )
}
