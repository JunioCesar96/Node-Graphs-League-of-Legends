import type { CSSProperties, PointerEvent as ReactPointerEvent, RefObject } from 'react'
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

import { StructureIndexPager } from '@/components/molecules/StructureIndexPager'
import type { CanvasContextMenuAnchor } from '@/core/canvasContextMenuTypes'
import {
  STRUCTURE_LIST_ITEM_HEIGHT,
  STRUCTURE_LIST_MAX_VISIBLE_ITEMS,
  STRUCTURE_LIST_PANEL_MIN_WIDTH,
  clampStructureListPanelSize,
  matchesStructureListLabelSearch,
  resolveBlockMapListPanelRect,
  resolveStructureListScreenAnchorRect,
  structureListPanelDefaultHeight,
  type StructureListPanelRect,
} from '@/core/structureListPanelLayout'

import styles from './StructureListPanel.module.css'

export type StructureListPanelItem = {
  id: string
  label: string
  /** Índice real na coleção completa (mantém-se com filtro activo). */
  index: number
}

export type StructureListPanelAction = {
  onClick: () => void
  ariaLabel: string
  disabled?: boolean
  title?: string
  glyph?: string
}

/** Omitir uma acção = botão oculto. */
export type StructureListPanelActions = {
  edit?: StructureListPanelAction
  add?: StructureListPanelAction
  remove?: StructureListPanelAction
}

const DEFAULT_ACTION_GLYPHS = {
  edit: '✎',
  add: '+',
  remove: '−',
} as const

const DEFAULT_PORTAL_Z_INDEX = 12000
const DEFAULT_PORTAL_ATTR = 'data-structure-list-panel-portal'

type ListPanelSize = {
  height: number
  width: number
}

type ListPanelResizeEdge = 'e' | 's' | 'se'

export type StructureListPanelProps = {
  open: boolean
  onOpenChange?: (open: boolean) => void
  /** Elemento de ancoragem (ex. linha do input). Obrigatório em modo portal. */
  anchorRef?: RefObject<HTMLElement | null>
  /** Sem portal — o pai posiciona o painel (ex. BlockCardMenuFloatingLayer). */
  embedded?: boolean
  /** Tamanho inicial do painel. */
  initialSize?: { width: number; height: number }
  /** Ancora de ecrã (ex. clique nos botões do BlockCard). */
  screenAnchor?: CanvasContextMenuAnchor | null
  /** Fechar ao clicar fora (default: true só em portal com anchorRef). */
  dismissOnClickOutside?: boolean
  /** Clique fora não fecha se o alvo estiver dentro destes nós (ex. botão de abrir lista). */
  dismissGuardRefs?: ReadonlyArray<RefObject<HTMLElement | null>>
  listTitle: string
  items: readonly StructureListPanelItem[]
  selectedId: string | null
  selectedIndex: number
  onSelectIndex: (index: number) => void
  onPickItem: (item: StructureListPanelItem) => void
  onHoverItem?: (item: StructureListPanelItem | null) => void
  emptyHint?: string
  noResultsMessage?: string
  interactionLocked?: boolean
  actions?: StructureListPanelActions
  filterItem?: (item: StructureListPanelItem, query: string) => boolean
  resolveAnchorRect?: (anchor: HTMLElement) => StructureListPanelRect
  portalZIndex?: number
  portalDataAttr?: string
  itemCountForHeight?: number
}

function ActionButton({
  action,
  defaultGlyph,
}: {
  action: StructureListPanelAction
  defaultGlyph: string
}) {
  return (
    <button
      aria-label={action.ariaLabel}
      className={styles.toolButton}
      disabled={action.disabled}
      onClick={action.onClick}
      title={action.title ?? action.ariaLabel}
      type="button"
    >
      {action.glyph ?? defaultGlyph}
    </button>
  )
}

export function StructureListPanel({
  open,
  onOpenChange,
  anchorRef,
  embedded = false,
  initialSize,
  screenAnchor = null,
  dismissOnClickOutside,
  dismissGuardRefs = [],
  listTitle,
  items,
  selectedId,
  selectedIndex,
  onSelectIndex,
  onPickItem,
  onHoverItem,
  emptyHint = 'Lista vazia',
  noResultsMessage = 'Nenhum item corresponde à pesquisa.',
  interactionLocked = false,
  actions,
  filterItem = (item, query) => matchesStructureListLabelSearch(item.label, query),
  resolveAnchorRect = resolveBlockMapListPanelRect,
  portalZIndex = DEFAULT_PORTAL_Z_INDEX,
  portalDataAttr = DEFAULT_PORTAL_ATTR,
  itemCountForHeight,
}: StructureListPanelProps) {
  const dismissOutside =
    dismissOnClickOutside ?? (!embedded && !screenAnchor)
  const [searchQuery, setSearchQuery] = useState('')
  const [panelRect, setPanelRect] = useState<StructureListPanelRect | null>(null)
  const [panelSize, setPanelSize] = useState<ListPanelSize | null>(null)
  const [panelDragging, setPanelDragging] = useState(false)
  const panelPositionManualRef = useRef(false)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  const heightEntryCount = itemCountForHeight ?? items.length

  const setOpen = useCallback(
    (next: boolean) => {
      onOpenChange?.(next)
      if (!next) {
        setSearchQuery('')
        setPanelRect(null)
        setPanelSize(null)
        panelPositionManualRef.current = false
        setPanelDragging(false)
        onHoverItem?.(null)
      }
    },
    [onOpenChange, onHoverItem],
  )

  const updatePanelRect = useCallback(() => {
    if (panelPositionManualRef.current) {
      return
    }
    const anchor = anchorRef.current
    if (!anchor) {
      return
    }
    setPanelRect(resolveAnchorRect(anchor))
  }, [anchorRef, resolveAnchorRect])

  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) {
      return items
    }
    return items.filter((item) => filterItem(item, searchQuery))
  }, [filterItem, items, searchQuery])

  const showEdit = Boolean(actions?.edit)
  const showAdd = Boolean(actions?.add)
  const showRemove = Boolean(actions?.remove)

  const toolbarColumns = useMemo(() => {
    const cols = ['auto', 'max-content', 'minmax(3rem, 1fr)']
    if (showEdit) {
      cols.push('auto')
    }
    if (showAdd) {
      cols.push('auto')
    }
    if (showRemove) {
      cols.push('auto')
    }
    return cols.join(' ')
  }, [showAdd, showEdit, showRemove])

  const panelStyle = useMemo(
    () =>
      ({
        '--structure-list-item-height': `${String(STRUCTURE_LIST_ITEM_HEIGHT)}px`,
        '--structure-list-max-items': String(STRUCTURE_LIST_MAX_VISIBLE_ITEMS),
      }) as CSSProperties,
    [],
  )

  const initialWidth = initialSize?.width ?? STRUCTURE_LIST_PANEL_MIN_WIDTH
  const initialHeight =
    initialSize?.height ?? structureListPanelDefaultHeight(heightEntryCount)

  useLayoutEffect(() => {
    if (!open) {
      setPanelRect(null)
      setPanelSize(null)
      return
    }
    if (screenAnchor) {
      const rect = resolveStructureListScreenAnchorRect(
        screenAnchor,
        initialWidth,
        initialHeight,
      )
      const nextSize = clampStructureListPanelSize(initialWidth, initialHeight, rect.top)
      setPanelRect((prev) => {
        if (
          prev &&
          prev.left === rect.left &&
          prev.top === rect.top &&
          prev.width === rect.width
        ) {
          return prev
        }
        return rect
      })
      setPanelSize((prev) => {
        if (prev && prev.width === nextSize.width && prev.height === nextSize.height) {
          return prev
        }
        return nextSize
      })
      return
    }
    if (!embedded) {
      return
    }
    const nextSize = clampStructureListPanelSize(initialWidth, initialHeight, 0)
    setPanelRect((prev) => {
      if (prev && prev.left === 0 && prev.top === 0 && prev.width === initialWidth) {
        return prev
      }
      return { left: 0, top: 0, width: initialWidth }
    })
    setPanelSize((prev) => {
      if (prev && prev.width === nextSize.width && prev.height === nextSize.height) {
        return prev
      }
      return nextSize
    })
  }, [embedded, initialHeight, initialWidth, open, screenAnchor?.left, screenAnchor?.top])

  useLayoutEffect(() => {
    if (!open || embedded || !panelRect) {
      return
    }
    setPanelSize((current) => {
      const next = current
        ? clampStructureListPanelSize(current.width, current.height, panelRect.top)
        : clampStructureListPanelSize(
            panelRect.width,
            structureListPanelDefaultHeight(heightEntryCount),
            panelRect.top,
          )
      if (current && current.width === next.width && current.height === next.height) {
        return current
      }
      return next
    })
  }, [embedded, heightEntryCount, open, panelRect?.top, panelRect?.width])

  useLayoutEffect(() => {
    if (!open || embedded || screenAnchor) {
      return
    }
    updatePanelRect()

    let raf = 0
    const tick = () => {
      updatePanelRect()
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)

    window.addEventListener('resize', updatePanelRect)
    window.addEventListener('scroll', updatePanelRect, true)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', updatePanelRect)
      window.removeEventListener('scroll', updatePanelRect, true)
    }
  }, [embedded, open, screenAnchor, updatePanelRect])

  useEffect(() => {
    if (!open) {
      return
    }
    searchInputRef.current?.focus()
  }, [open])

  useEffect(() => {
    if (!open || !dismissOutside) {
      return
    }
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node
      if (panelRef.current?.contains(target)) {
        return
      }
      for (const guardRef of dismissGuardRefs) {
        if (guardRef.current?.contains(target)) {
          return
        }
      }
      if (anchorRef?.current?.contains(target)) {
        return
      }
      setOpen(false)
    }
    window.addEventListener('pointerdown', onPointerDown, true)
    return () => window.removeEventListener('pointerdown', onPointerDown, true)
  }, [anchorRef, dismissGuardRefs, dismissOutside, open, setOpen])

  const startListPanelMove = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>) => {
      if (!panelRect || !panelSize || interactionLocked) {
        return
      }
      event.preventDefault()
      event.stopPropagation()

      panelPositionManualRef.current = true
      setPanelDragging(true)

      const startX = event.clientX
      const startY = event.clientY
      const startLeft = panelRect.left
      const startTop = panelRect.top
      const panelWidth = panelSize.width
      const panelHeight = panelSize.height

      const onPointerMove = (moveEvent: PointerEvent) => {
        const margin = 8
        const nextLeft = Math.min(
          Math.max(margin, startLeft + moveEvent.clientX - startX),
          window.innerWidth - panelWidth - margin,
        )
        const nextTop = Math.min(
          Math.max(margin, startTop + moveEvent.clientY - startY),
          window.innerHeight - panelHeight - margin,
        )
        setPanelRect((current) =>
          current
            ? {
                ...current,
                left: nextLeft,
                top: nextTop,
              }
            : current,
        )
      }

      const onPointerUp = () => {
        setPanelDragging(false)
        window.removeEventListener('pointermove', onPointerMove)
        window.removeEventListener('pointerup', onPointerUp)
      }

      window.addEventListener('pointermove', onPointerMove)
      window.addEventListener('pointerup', onPointerUp)
    },
    [interactionLocked, panelRect, panelSize],
  )

  const startListPanelResize = useCallback(
    (edge: ListPanelResizeEdge) => (event: ReactPointerEvent<HTMLDivElement>) => {
      if (!panelRect || !panelSize) {
        return
      }
      event.preventDefault()
      event.stopPropagation()

      const startX = event.clientX
      const startY = event.clientY
      const startWidth = panelSize.width
      const startHeight = panelSize.height

      const onPointerMove = (moveEvent: PointerEvent) => {
        const deltaX = moveEvent.clientX - startX
        const deltaY = moveEvent.clientY - startY
        const nextWidth = edge === 's' ? startWidth : startWidth + deltaX
        const nextHeight = edge === 'e' ? startHeight : startHeight + deltaY
        panelPositionManualRef.current = true
        setPanelSize((current) => {
          const top = panelRect.top
          return clampStructureListPanelSize(nextWidth, nextHeight, top)
        })
      }

      const onPointerUp = () => {
        window.removeEventListener('pointermove', onPointerMove)
        window.removeEventListener('pointerup', onPointerUp)
      }

      window.addEventListener('pointermove', onPointerMove)
      window.addEventListener('pointerup', onPointerUp)
    },
    [panelRect, panelSize],
  )

  if (!open || !panelRect || !panelSize) {
    return null
  }

  if (!embedded && typeof document === 'undefined') {
    return null
  }

  const panelElement = (
    <div
      {...{ [portalDataAttr]: '' }}
      className={[
        styles.panel,
        embedded ? styles.panelEmbedded : '',
        panelDragging ? styles.panelDragging : '',
      ]
        .filter(Boolean)
        .join(' ')}
      ref={panelRef}
      style={
        embedded
          ? {
              ...panelStyle,
              position: 'relative',
              width: '100%',
              minWidth: panelSize.width,
              height: panelSize.height,
            }
          : {
              ...panelStyle,
              position: 'fixed',
              top: panelRect.top,
              left: panelRect.left,
              width: panelSize.width,
              height: panelSize.height,
              zIndex: portalZIndex,
            }
      }
      onPointerDown={(event) => event.stopPropagation()}
    >
      <div className={styles.toolbar} style={{ gridTemplateColumns: toolbarColumns }}>
        <button
          aria-label="Mover janela da lista"
          className={[styles.toolButton, styles.moveButton, panelDragging ? styles.moveButtonActive : '']
            .filter(Boolean)
            .join(' ')}
          disabled={interactionLocked}
          onPointerDown={startListPanelMove}
          title="Arrastar para mover a lista"
          type="button"
        >
          ⤢
        </button>
        <StructureIndexPager
          className={styles.indexPager}
          editableCounter
          onSelectedIndexChange={onSelectIndex}
          selectedIndex={selectedIndex}
          total={items.length}
        />
        <input
          ref={searchInputRef}
          aria-label={`Pesquisar itens de ${listTitle}`}
          autoComplete="off"
          className={styles.search}
          disabled={interactionLocked}
          placeholder="Pesquisar…"
          type="search"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          onKeyDown={(event) => event.stopPropagation()}
          onPointerDown={(event) => event.stopPropagation()}
        />
        {showEdit && actions?.edit ? (
          <ActionButton action={actions.edit} defaultGlyph={DEFAULT_ACTION_GLYPHS.edit} />
        ) : null}
        {showAdd && actions?.add ? (
          <ActionButton action={actions.add} defaultGlyph={DEFAULT_ACTION_GLYPHS.add} />
        ) : null}
        {showRemove && actions?.remove ? (
          <ActionButton action={actions.remove} defaultGlyph={DEFAULT_ACTION_GLYPHS.remove} />
        ) : null}
      </div>

      <div className={styles.body}>
        {items.length === 0 ? (
          <p className={styles.emptyMessage}>{emptyHint}</p>
        ) : filteredItems.length === 0 ? (
          <p className={styles.noResults}>{noResultsMessage}</p>
        ) : (
          <ul
            className={styles.list}
            role="listbox"
            onMouseLeave={() => onHoverItem?.(null)}
          >
            {filteredItems.map((item) => {
              const isSelected = selectedId === item.id

              return (
                <li
                  key={`${item.id}-${item.index}`}
                  aria-selected={isSelected}
                  className={[styles.listItem, isSelected ? styles.listItemSelected : '']
                    .filter(Boolean)
                    .join(' ')}
                  role="option"
                  onMouseEnter={() => onHoverItem?.(item)}
                  onMouseDown={(event) => {
                    event.preventDefault()
                    onSelectIndex(item.index)
                    onPickItem(item)
                  }}
                >
                  <span className={styles.listItemIndex}>{item.index}</span>
                  <span className={styles.itemLabel} title={item.label}>
                    {item.label}
                  </span>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      <div aria-hidden className={styles.resizeHandleE} onPointerDown={startListPanelResize('e')} />
      <div aria-hidden className={styles.resizeHandleS} onPointerDown={startListPanelResize('s')} />
      <div
        aria-label="Redimensionar lista"
        className={styles.resizeHandleSE}
        onPointerDown={startListPanelResize('se')}
        role="separator"
      />
    </div>
  )

  if (embedded) {
    return panelElement
  }

  return createPortal(panelElement, document.body)
}
