import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

import type { CanvasNode } from '@/core/canvasScene'
import type { InternalStructureDefinition } from '@/core/nodeSchema'

import { LangId } from '@/core/language/languageIds'
import { useLanguage } from '@/language/LanguageProvider'

import styles from './CollectionTypeLinkMenu.module.css'

export const COLLECTION_TYPE_LINK_MENU_ROOT_ATTR = 'data-collection-type-link-menu-root'

type CollectionTypeLinkMenuProps = {
  anchor: { left: number; top: number }
  collectionType: string
  compatibleNodes: readonly CanvasNode[]
  currentTarget?: CanvasNode
  fromNode: CanvasNode
  structure: InternalStructureDefinition
  onClose: () => void
  onSelect: (targetNodeId: string) => void
}

export function CollectionTypeLinkMenu({
  anchor,
  collectionType,
  compatibleNodes,
  currentTarget,
  fromNode,
  structure,
  onClose,
  onSelect,
}: CollectionTypeLinkMenuProps) {
  const { t } = useLanguage()
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const closeOnOutsideClick = (event: MouseEvent) => {
      const target = event.target
      if (!(target instanceof globalThis.Node)) {
        return
      }
      if (target instanceof Element && target.closest(`[${COLLECTION_TYPE_LINK_MENU_ROOT_ATTR}]`)) {
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

  const otherCompatibleNodes = compatibleNodes.filter((node) => node.id !== currentTarget?.id)

  return createPortal(
    <div
      {...{ [COLLECTION_TYPE_LINK_MENU_ROOT_ATTR]: '' }}
      className={styles.menu}
      ref={menuRef}
      role="menu"
      style={{ left: `${anchor.left}px`, top: `${anchor.top}px` }}
    >
      <p className={styles.heading}>
        {t(LangId.CtxCollectionLinkHeading, 'Compatible {type} nodes', { type: collectionType })}
      </p>
      <p className={styles.sectionLabel}>
        {t(LangId.CtxCollectionLinkOrigin, 'Source · {title}', { title: fromNode.node.schema.title })}
      </p>

      <p className={styles.sectionLabel}>
        {t(LangId.CtxCollectionLinkCurrent, 'Current link · {name}', { name: structure.name })}
      </p>
      {currentTarget ? (
        <button
          data-active="true"
          onClick={() => onSelect(currentTarget.id)}
          type="button"
        >
          <span>{currentTarget.node.schema.title}</span>
          <small>{currentTarget.id}</small>
        </button>
      ) : (
        <p className={styles.emptyState}>{t(LangId.CtxCollectionLinkNoLink)}</p>
      )}

      {otherCompatibleNodes.length > 0 ? (
        <>
          <p className={styles.sectionLabel}>{t(LangId.CtxCollectionLinkCompatible)}</p>
          {otherCompatibleNodes.map((node) => (
            <button key={node.id} onClick={() => onSelect(node.id)} type="button">
              <span>{node.node.schema.title}</span>
              <small>{node.id}</small>
            </button>
          ))}
        </>
      ) : null}
    </div>,
    document.body,
  )
}
