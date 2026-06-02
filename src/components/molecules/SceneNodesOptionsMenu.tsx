import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

import { RgbaColorPicker } from '@/components/molecules/RgbaColorPicker'
import type { CanvasNode } from '@/core/canvasScene'
import { LangId } from '@/core/language/languageIds'
import { useLanguage } from '@/language/LanguageProvider'

import styles from '@/components/molecules/SceneNodesOptionsMenu.module.css'

const DEFAULT_BODY_COLOR = 'rgba(37, 37, 38, 1)'

export type SceneNodesOptionsMenuProps = {
  anchorRef: React.RefObject<HTMLElement | null>
  hasSelection: boolean
  selectedNode: CanvasNode | undefined
  onClose: () => void
  onHideAll: () => void
  onLockAll: () => void
  onPatchSelected: (
    patch: Partial<
      Pick<CanvasNode, 'displayLabel' | 'bodyColor' | 'bodyColorEnabled' | 'sceneHidden' | 'locked'>
    >,
  ) => void
  onResetSelectedPosition: () => void
  onShowAll: () => void
  onUnlockAll: () => void
}

export function SceneNodesOptionsMenu({
  anchorRef,
  hasSelection,
  selectedNode,
  onClose,
  onHideAll,
  onLockAll,
  onPatchSelected,
  onResetSelectedPosition,
  onShowAll,
  onUnlockAll,
}: SceneNodesOptionsMenuProps) {
  const { t } = useLanguage()
  const menuRef = useRef<HTMLDivElement>(null)
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null)
  const [labelDraft, setLabelDraft] = useState('')
  const [colorEnabled, setColorEnabled] = useState(false)
  const [colorValue, setColorValue] = useState(DEFAULT_BODY_COLOR)

  useEffect(() => {
    const anchor = anchorRef.current

    if (!anchor) {
      return
    }

    setAnchorRect(anchor.getBoundingClientRect())
  }, [anchorRef])

  useEffect(() => {
    if (!selectedNode) {
      setLabelDraft('')
      setColorEnabled(false)
      setColorValue(DEFAULT_BODY_COLOR)
      return
    }

    setLabelDraft(selectedNode.displayLabel ?? '')
    setColorEnabled(selectedNode.bodyColorEnabled === true)
    setColorValue(selectedNode.bodyColor?.trim() || DEFAULT_BODY_COLOR)
  }, [selectedNode])

  useEffect(() => {
    const closeOnOutside = (event: MouseEvent) => {
      const target = event.target

      if (!(target instanceof Node)) {
        return
      }

      if (menuRef.current?.contains(target) || anchorRef.current?.contains(target)) {
        return
      }

      onClose()
    }

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('mousedown', closeOnOutside)
    document.addEventListener('keydown', closeOnEscape)

    return () => {
      document.removeEventListener('mousedown', closeOnOutside)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [anchorRef, onClose])

  if (!anchorRect) {
    return null
  }

  const top = anchorRect.bottom + 6
  const left = Math.min(anchorRect.left, window.innerWidth - 300)

  return createPortal(
    <div
      className={styles.menu}
      ref={menuRef}
      role="menu"
      style={{ left: `${left}px`, top: `${top}px` }}
    >
      <button className={styles.action} onClick={onShowAll} role="menuitem" type="button">
        {t(LangId.SceneNodesCtxShowAll)}
      </button>
      <button className={styles.action} onClick={onHideAll} role="menuitem" type="button">
        {t(LangId.SceneNodesCtxHideAll)}
      </button>
      <div className={styles.separator} role="separator" />
      <div className={[styles.section, !hasSelection ? styles.sectionMuted : ''].filter(Boolean).join(' ')}>
        <span className={styles.sectionTitle}>{t(LangId.SceneNodesCtxBodyColor)}</span>
        <label className={styles.checkRow}>
          <input
            checked={colorEnabled}
            disabled={!hasSelection}
            onChange={(event) => {
              const next = event.target.checked
              setColorEnabled(next)

              if (hasSelection) {
                onPatchSelected({
                  bodyColorEnabled: next,
                  ...(next ? { bodyColor: colorValue } : {}),
                })
              }
            }}
            type="checkbox"
          />
          <span>{t(LangId.SceneNodesCtxEnableBodyColor)}</span>
        </label>
        {colorEnabled && hasSelection ? (
          <div className={styles.pickerWrap}>
            <RgbaColorPicker
              onChange={(next) => {
                setColorValue(next)
                onPatchSelected({ bodyColor: next, bodyColorEnabled: true })
              }}
              value={colorValue}
            />
          </div>
        ) : null}
      </div>
      <div className={[styles.section, !hasSelection ? styles.sectionMuted : ''].filter(Boolean).join(' ')}>
        <label className={styles.labelField}>
          <span className={styles.sectionTitle}>{t(LangId.SceneNodesCtxLabel)}</span>
          <input
            disabled={!hasSelection}
            onChange={(event) => {
              const next = event.target.value
              setLabelDraft(next)
              onPatchSelected({ displayLabel: next })
            }}
            placeholder={selectedNode?.node.schema.title ?? 'Título do schema'}
            type="text"
            value={labelDraft}
          />
        </label>
        <p className={styles.hint}>{t(LangId.SceneNodesCtxLabelHint)}</p>
      </div>
      <button
        className={styles.action}
        disabled={!hasSelection}
        onClick={() => {
          onResetSelectedPosition()
          onClose()
        }}
        role="menuitem"
        type="button"
      >
        {t(LangId.SceneNodesCtxResetPosition)}
      </button>
      <div className={styles.separator} role="separator" />
      <button className={styles.action} onClick={onLockAll} role="menuitem" type="button">
        {t(LangId.SceneNodesCtxLockAll)}
      </button>
      <button className={styles.action} onClick={onUnlockAll} role="menuitem" type="button">
        {t(LangId.SceneNodesCtxUnlockAll)}
      </button>
    </div>,
    document.body,
  )
}
