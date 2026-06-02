import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'

import { BlockCardMenuFloatingLayer } from '@/components/molecules/BlockCardMenuFloatingLayer'
import { BlockParameterPickerPopover } from '@/components/molecules/BlockParameterPickerPopover'
import type { BlockParameterJsonDocument } from '@/core/blockParameterJson'
import type { BlockParameterDef } from '@/core/blockSchema'
import { LangId } from '@/core/language/languageIds'
import { useLanguage } from '@/language/LanguageProvider'

import styles from './BlockCardParameterMenu.module.css'

type BlockCardParameterMenuProps = {
  blockType: string
  parameters: readonly BlockParameterDef[]
  onAddParameter?: (doc: BlockParameterJsonDocument) => void
  onRemoveParameter?: (paramId: string) => void
  onEditParameter?: (param: BlockParameterDef) => void
}

type PanelMode = 'menu' | 'add' | 'remove' | 'edit' | 'confirmRemove'

function stopMenuPointerPropagation(event: ReactPointerEvent) {
  event.stopPropagation()
}

export function BlockCardParameterMenu({
  blockType,
  parameters,
  onAddParameter,
  onRemoveParameter,
  onEditParameter,
}: BlockCardParameterMenuProps) {
  const { t } = useLanguage()
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const portalRef = useRef<HTMLDivElement>(null)
  const [panel, setPanel] = useState<PanelMode>('menu')
  const [menuOpen, setMenuOpen] = useState(false)
  const [pendingRemove, setPendingRemove] = useState<BlockParameterDef | null>(null)

  const closeAll = useCallback(() => {
    setMenuOpen(false)
    setPanel('menu')
    setPendingRemove(null)
  }, [])

  const floatingOpen =
    menuOpen &&
    panel !== 'confirmRemove' &&
    (panel === 'menu' || panel === 'add' || panel === 'remove' || panel === 'edit')

  const isInsideMenu = useCallback((target: Node | null) => {
    if (!target) {
      return false
    }
    if (rootRef.current?.contains(target) || portalRef.current?.contains(target)) {
      return true
    }
    let node: Node | null = target
    while (node) {
      if (node instanceof Element) {
        if (
          node.hasAttribute('data-block-param-menu-portal') ||
          node.hasAttribute('data-block-param-menu-root')
        ) {
          return true
        }
      }
      node = node.parentNode
    }
    return false
  }, [])

  useEffect(() => {
    if (!menuOpen) {
      return
    }

    const onPointerDownCapture = (event: PointerEvent) => {
      if (isInsideMenu(event.target as Node)) {
        return
      }
    }

    const onClickCapture = (event: MouseEvent) => {
      if (isInsideMenu(event.target as Node)) {
        return
      }
      closeAll()
    }

    window.addEventListener('pointerdown', onPointerDownCapture, true)
    const registerClickTimer = window.setTimeout(() => {
      window.addEventListener('click', onClickCapture, true)
    }, 0)

    return () => {
      window.clearTimeout(registerClickTimer)
      window.removeEventListener('pointerdown', onPointerDownCapture, true)
      window.removeEventListener('click', onClickCapture, true)
    }
  }, [closeAll, isInsideMenu, menuOpen])

  const openParamList = (mode: 'remove' | 'edit') => {
    if (parameters.length === 0) {
      window.alert(
        t(mode === 'edit' ? LangId.BlockParameterSelectToEdit : LangId.BlockParameterSelectToRemove),
      )
      return
    }
    setPanel(mode)
    setMenuOpen(true)
  }

  const openAddPanel = () => {
    setPanel('add')
    setMenuOpen(true)
  }

  return (
    <div ref={rootRef} className={styles.menuRoot} data-block-param-menu-root="1">
      <button
        ref={triggerRef}
        type="button"
        className={styles.menuTrigger}
        aria-expanded={menuOpen}
        onPointerDown={stopMenuPointerPropagation}
        onClick={(event) => {
          event.stopPropagation()
          setMenuOpen((open) => !open)
          setPanel('menu')
        }}
      >
        {t(LangId.BlockCardParameterMenu)}
      </button>

      <BlockCardMenuFloatingLayer open={floatingOpen} anchorRef={triggerRef} layerRef={portalRef}>
        {menuOpen && panel === 'menu' ? (
          <div className={styles.submenu} role="menu">
            <button
              type="button"
              className={styles.submenuItem}
              role="menuitem"
              disabled={!onAddParameter}
              onPointerDown={stopMenuPointerPropagation}
              onClick={(event) => {
                event.stopPropagation()
                openAddPanel()
              }}
            >
              {t(LangId.BlockCardParameterAdd)}
            </button>
            <button
              type="button"
              className={styles.submenuItem}
              role="menuitem"
              disabled={!onRemoveParameter || parameters.length === 0}
              onPointerDown={stopMenuPointerPropagation}
              onClick={(event) => {
                event.stopPropagation()
                openParamList('remove')
              }}
            >
              {t(LangId.BlockCardParameterRemove)}
            </button>
            <button
              type="button"
              className={styles.submenuItem}
              role="menuitem"
              disabled={!onEditParameter || parameters.length === 0}
              onPointerDown={stopMenuPointerPropagation}
              onClick={(event) => {
                event.stopPropagation()
                openParamList('edit')
              }}
            >
              {t(LangId.BlockCardParameterEdit)}
            </button>
          </div>
        ) : null}

        {menuOpen && panel === 'add' && onAddParameter ? (
          <BlockParameterPickerPopover
            blockType={blockType}
            existingParameters={parameters}
            onPick={(doc) => {
              onAddParameter(doc)
              queueMicrotask(() => {
                closeAll()
              })
            }}
            onClose={closeAll}
          />
        ) : null}

        {menuOpen && (panel === 'remove' || panel === 'edit') ? (
          <div className={styles.listPanel} role="listbox">
            {parameters.map((param) => (
              <button
                key={param.idParameter}
                type="button"
                className={styles.listItem}
                onPointerDown={stopMenuPointerPropagation}
                onClick={(event) => {
                  event.stopPropagation()
                  if (panel === 'edit') {
                    onEditParameter?.(param)
                    closeAll()
                    return
                  }
                  setPendingRemove(param)
                  setPanel('confirmRemove')
                }}
              >
                {param.nameParameter || param.idParameter}
              </button>
            ))}
          </div>
        ) : null}
      </BlockCardMenuFloatingLayer>

      {pendingRemove && panel === 'confirmRemove' ? (
        <div className={styles.confirmBackdrop} role="presentation">
          <div className={styles.confirmDialog} role="alertdialog">
            <h4 className={styles.confirmTitle}>{t(LangId.BlockParameterRemoveConfirmTitle)}</h4>
            <p className={styles.confirmMessage}>
              {t(LangId.BlockParameterRemoveConfirmMessage, undefined, {
                name: pendingRemove.nameParameter || pendingRemove.idParameter,
              })}
            </p>
            <div className={styles.confirmActions}>
              <button
                type="button"
                className={styles.confirmButton}
                onClick={() => {
                  setPendingRemove(null)
                  setPanel('remove')
                }}
              >
                {t(LangId.BlockParameterRemoveConfirmNo)}
              </button>
              <button
                type="button"
                className={[styles.confirmButton, styles.confirmButtonDanger].join(' ')}
                onClick={() => {
                  onRemoveParameter?.(pendingRemove.idParameter)
                  closeAll()
                }}
              >
                {t(LangId.BlockParameterRemoveConfirmYes)}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
