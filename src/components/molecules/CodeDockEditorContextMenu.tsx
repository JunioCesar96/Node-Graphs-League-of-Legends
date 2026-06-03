import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

import '@jade/components/EditorContextMenu.css'

import { buildJadeEditorContextMenuLabels } from '@/core/language/jadeMenuLabels'
import { useContextMenuPlacement } from '@/hooks/useContextMenuPlacement'
import { useLanguage } from '@/language/LanguageProvider'

import styles from './CodeDockEditorContextMenu.module.css'

type CodeDockEditorContextMenuProps = {
  x: number
  y: number
  hasEmitters: boolean
  showToNeekoNode?: boolean
  showReplaceValueToGraph?: boolean
  onClose: () => void
  onCopy: () => void
  onCut: () => void
  onPaste: () => void
  onSelectAll: () => void
  onFoldEmitters: () => void
  onUnfoldEmitters: () => void
  onToNeekoNode?: () => void
  onReplaceValueToGraph?: () => void
}

export function CodeDockEditorContextMenu({
  x,
  y,
  hasEmitters,
  showToNeekoNode = false,
  showReplaceValueToGraph = false,
  onClose,
  onCopy,
  onCut,
  onPaste,
  onSelectAll,
  onFoldEmitters,
  onUnfoldEmitters,
  onToNeekoNode,
  onReplaceValueToGraph,
}: CodeDockEditorContextMenuProps) {
  const { t } = useLanguage()
  const labels = buildJadeEditorContextMenuLabels(t)
  const menuRef = useRef<HTMLDivElement>(null)
  const placement = useContextMenuPlacement(x, y, menuRef)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose()
      }
    }
    const handleScroll = () => onClose()
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('scroll', handleScroll, true)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('scroll', handleScroll, true)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [onClose])

  const handleAction = (action: () => void) => {
    action()
    onClose()
  }

  return (
    <div
      ref={menuRef}
      className="editor-ctx-menu"
      data-expand-down={placement.expandDown ? 'true' : 'false'}
      data-expand-right={placement.expandRight ? 'true' : 'false'}
      style={{ left: placement.x, top: placement.y }}
    >
      <button className="editor-ctx-item" onClick={() => handleAction(onCut)} type="button">
        <span className="editor-ctx-label">{labels.cut}</span>
        <span className="editor-ctx-shortcut">Ctrl+X</span>
      </button>
      <button className="editor-ctx-item" onClick={() => handleAction(onCopy)} type="button">
        <span className="editor-ctx-label">{labels.copy}</span>
        <span className="editor-ctx-shortcut">Ctrl+C</span>
      </button>
      <button className="editor-ctx-item" onClick={() => handleAction(onPaste)} type="button">
        <span className="editor-ctx-label">{labels.paste}</span>
        <span className="editor-ctx-shortcut">Ctrl+V</span>
      </button>
      {showToNeekoNode && onToNeekoNode ? (
        <>
          <div className="editor-ctx-separator" />
          <button className="editor-ctx-item" onClick={() => handleAction(onToNeekoNode)} type="button">
            <span className="editor-ctx-label">{labels.toNeekoNode}</span>
          </button>
        </>
      ) : null}
      {showReplaceValueToGraph && onReplaceValueToGraph ? (
        <>
          <div className="editor-ctx-separator" />
          <button
            className="editor-ctx-item"
            onClick={() => handleAction(onReplaceValueToGraph)}
            type="button"
          >
            <span className="editor-ctx-label">{labels.replaceValueToGraph}</span>
          </button>
        </>
      ) : null}
      <div className="editor-ctx-separator" />
      <button className="editor-ctx-item" onClick={() => handleAction(onSelectAll)} type="button">
        <span className="editor-ctx-label">{labels.selectAll}</span>
        <span className="editor-ctx-shortcut">Ctrl+A</span>
      </button>
      {hasEmitters ? (
        <>
          <div className="editor-ctx-separator" />
          <button className="editor-ctx-item" onClick={() => handleAction(onFoldEmitters)} type="button">
            <span className="editor-ctx-label">{labels.foldEmitters}</span>
          </button>
          <button className="editor-ctx-item" onClick={() => handleAction(onUnfoldEmitters)} type="button">
            <span className="editor-ctx-label">{labels.unfoldEmitters}</span>
          </button>
        </>
      ) : null}
    </div>
  )
}
