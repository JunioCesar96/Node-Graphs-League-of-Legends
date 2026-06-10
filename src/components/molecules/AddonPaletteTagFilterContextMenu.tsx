import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

import { LangId } from '@/core/language/languageIds'
import {
  SHORTCUT_SCOPE_ATTR,
  SHORTCUT_SCOPE_NODE_PALETTE,
} from '@/core/shortcuts/shortcutScopes'
import { useContextMenuPlacement } from '@/hooks/useContextMenuPlacement'
import { useLanguage } from '@/language/LanguageProvider'

import styles from './AddonContextMenu.module.css'

export const ADDON_PALETTE_TAG_FILTER_CONTEXT_MENU_ROOT_ATTR =
  'data-addon-palette-tag-filter-context-menu-root'

export type AddonPaletteTagFilterMenuAction =
  | 'filter-only'
  | 'add-to-filter'
  | 'remove-from-selection'
  | 'hide-in-list'
  | 'show-in-list'

export type AddonPaletteTagFilterContextMenuAnchor = {
  left: number
  top: number
}

type AddonPaletteTagFilterContextMenuProps = {
  anchor: AddonPaletteTagFilterContextMenuAnchor
  hidden: boolean
  selected: boolean
  onClose: () => void
  onSelect: (action: AddonPaletteTagFilterMenuAction) => void
}

function blockPointerEvent(event: { preventDefault: () => void; stopPropagation: () => void }) {
  event.preventDefault()
  event.stopPropagation()
}

export function AddonPaletteTagFilterContextMenu({
  anchor,
  hidden,
  selected,
  onClose,
  onSelect,
}: AddonPaletteTagFilterContextMenuProps) {
  const { t } = useLanguage()
  const menuRef = useRef<HTMLDivElement>(null)
  const placement = useContextMenuPlacement(anchor.left, anchor.top, menuRef)

  useEffect(() => {
    document.body.dataset.addonPaletteTagFilterContextMenuActive = '1'
    return () => {
      delete document.body.dataset.addonPaletteTagFilterContextMenuActive
    }
  }, [])

  useEffect(() => {
    const closeOnOutside = (event: MouseEvent) => {
      const target = event.target
      if (!(target instanceof Node)) {
        return
      }
      if (menuRef.current?.contains(target)) {
        return
      }
      if (
        target instanceof Element &&
        target.closest(`[${ADDON_PALETTE_TAG_FILTER_CONTEXT_MENU_ROOT_ATTR}]`)
      ) {
        return
      }
      onClose()
    }

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        event.stopPropagation()
        onClose()
      }
    }

    document.addEventListener('click', closeOnOutside, true)
    document.addEventListener('keydown', closeOnEscape, true)

    return () => {
      document.removeEventListener('click', closeOnOutside, true)
      document.removeEventListener('keydown', closeOnEscape, true)
    }
  }, [onClose])

  const runAction = (action: AddonPaletteTagFilterMenuAction) => {
    onSelect(action)
  }

  return createPortal(
    <>
      <div
        className={styles.backdrop}
        {...{
          [ADDON_PALETTE_TAG_FILTER_CONTEXT_MENU_ROOT_ATTR]: 'true',
          [SHORTCUT_SCOPE_ATTR]: SHORTCUT_SCOPE_NODE_PALETTE,
        }}
        onContextMenu={(event) => blockPointerEvent(event)}
        onPointerDown={(event) => blockPointerEvent(event)}
        onPointerUp={(event) => {
          blockPointerEvent(event)
          onClose()
        }}
      />
      <div
        className={styles.menu}
        {...{
          [ADDON_PALETTE_TAG_FILTER_CONTEXT_MENU_ROOT_ATTR]: 'true',
          [SHORTCUT_SCOPE_ATTR]: SHORTCUT_SCOPE_NODE_PALETTE,
        }}
        data-expand-down={placement.expandDown ? 'true' : 'false'}
        data-expand-right={placement.expandRight ? 'true' : 'false'}
        onContextMenu={(event) => blockPointerEvent(event)}
        onPointerDown={(event) => event.stopPropagation()}
        ref={menuRef}
        role="menu"
        style={{ left: `${placement.x}px`, top: `${placement.y}px` }}
      >
        {hidden ? (
          <button
            onClick={(event) => {
              blockPointerEvent(event)
              runAction('show-in-list')
            }}
            onPointerDown={(event) => blockPointerEvent(event)}
            role="menuitem"
            type="button"
          >
            {t(LangId.NodePaletteAddonTagShowInList)}
          </button>
        ) : (
          <>
            <button
              onClick={(event) => {
                blockPointerEvent(event)
                runAction('filter-only')
              }}
              onPointerDown={(event) => blockPointerEvent(event)}
              role="menuitem"
              type="button"
            >
              {t(LangId.NodePaletteAddonTagFilterOnly)}
            </button>
            <button
              onClick={(event) => {
                blockPointerEvent(event)
                runAction('add-to-filter')
              }}
              onPointerDown={(event) => blockPointerEvent(event)}
              role="menuitem"
              type="button"
            >
              {t(LangId.NodePaletteAddonTagAddToFilter)}
            </button>
            <button
              disabled={!selected}
              onClick={(event) => {
                blockPointerEvent(event)
                if (selected) {
                  runAction('remove-from-selection')
                }
              }}
              onPointerDown={(event) => blockPointerEvent(event)}
              role="menuitem"
              type="button"
            >
              {t(LangId.NodePaletteAddonTagRemoveFromSelection)}
            </button>
            <div className={styles.separator} role="separator" />
            <button
              onClick={(event) => {
                blockPointerEvent(event)
                runAction('hide-in-list')
              }}
              onPointerDown={(event) => blockPointerEvent(event)}
              role="menuitem"
              type="button"
            >
              {t(LangId.NodePaletteAddonTagHideInList)}
            </button>
          </>
        )}
      </div>
    </>,
    document.body,
  )
}
