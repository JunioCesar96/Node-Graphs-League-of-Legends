import type { HTMLAttributes } from 'react'
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'

import { ViewportDockPinIcon } from '@/components/atoms/ViewportDockPinIcon'
import { BlockInspectorParameterCard } from '@/components/molecules/BlockInspectorParameterCard'
import { SurfaceThemeContextMenu } from '@/components/molecules/SurfaceThemeContextMenu'
import type { BlockInspectorDraft, BlockInspectorDraftEntry } from '@/core/blockSchema'
import type { CanvasNode } from '@/core/canvasScene'
import { LangId } from '@/core/language/languageIds'
import { blockTypeDefinitionById, blockTypeDefinitionsList } from '@/core/blockStructureRegistry'
import { useLanguage } from '@/language/LanguageProvider'
import { useSurfaceThemeContextMenu } from '@/hooks/useSurfaceThemeContextMenu'

import styles from './BlockInspector.module.css'

type BlockInspectorProps = {
  node?: CanvasNode
  draft: BlockInspectorDraft | null
  knownBlockTypeIds?: readonly string[]
  minimized: boolean
  viewportDocked?: boolean
  dragHandleProps?: HTMLAttributes<HTMLElement>
  onToggleMinimized: () => void
  onDockToViewport?: () => void
  onUndockFromViewportToolbar?: (anchor: { clientX: number; clientY: number }) => void
  onDraftChange: (draft: BlockInspectorDraft) => void
  onGenerateBlock: () => void
  onRevertBlock: () => void
}

const BLOCK_TYPE_DATALIST_ID = 'block-inspector-type-options'

function buildBlockTypeOptions(
  knownIds: readonly string[],
  currentValue: string,
): Array<{ id: string; title: string }> {
  const byId = new Map<string, string>()

  for (const def of blockTypeDefinitionsList()) {
    byId.set(def.id, def.title)
  }

  for (const id of knownIds) {
    const trimmed = id.trim()
    if (!trimmed || byId.has(trimmed)) {
      continue
    }
    byId.set(trimmed, trimmed)
  }

  const current = currentValue.trim()
  if (current && !byId.has(current)) {
    byId.set(current, current)
  }

  return [...byId.entries()]
    .map(([id, title]) => ({ id, title }))
    .sort((a, b) => a.title.localeCompare(b.title))
}

function BlockInspectorBody({
  node,
  draft,
  knownBlockTypeIds = [],
  onDraftChange,
  onGenerateBlock,
  onRevertBlock,
}: Pick<
  BlockInspectorProps,
  'node' | 'draft' | 'knownBlockTypeIds' | 'onDraftChange' | 'onGenerateBlock' | 'onRevertBlock'
>) {
  const { t } = useLanguage()
  const blockTypeOptions = useMemo(
    () => buildBlockTypeOptions(knownBlockTypeIds, draft?.blockType ?? ''),
    [knownBlockTypeIds, draft?.blockType],
  )
  const exposedCount = draft?.entries.filter((entry) => entry.exposed).length ?? 0
  const selectedTypeLabel = draft
    ? blockTypeDefinitionById(draft.blockType)?.title ?? draft.blockType
    : ''

  if (!node || !draft) {
    return <p className={styles.empty}>{t(LangId.BlockInspectorEmptyHint)}</p>
  }

  const patchEntry = (index: number, entry: BlockInspectorDraftEntry) => {
    onDraftChange({
      ...draft,
      entries: draft.entries.map((current, entryIndex) => (entryIndex === index ? entry : current)),
    })
  }

  const typeHint = blockTypeDefinitionById(draft.blockType)
    ? t(LangId.BlockInspectorTypeRegistered, undefined, { type: selectedTypeLabel })
    : draft.blockType.trim()
      ? t(LangId.BlockInspectorTypeCustom, undefined, { type: draft.blockType.trim() })
      : t(LangId.BlockInspectorTypeSelectHint)

  return (
    <>
      <div className={styles.fieldRow}>
        <label htmlFor="block-inspector-type">{t(LangId.BlockInspectorTypeLabel)}</label>
        <input
          id="block-inspector-type"
          list={BLOCK_TYPE_DATALIST_ID}
          value={draft.blockType}
          placeholder={t(LangId.BlockInspectorTypePlaceholder)}
          spellCheck={false}
          onChange={(event) => onDraftChange({ ...draft, blockType: event.target.value })}
        />
        <datalist id={BLOCK_TYPE_DATALIST_ID}>
          {blockTypeOptions.map((type) => (
            <option key={type.id} value={type.id} label={type.title} />
          ))}
        </datalist>
        <span className={styles.fieldHint}>{typeHint}</span>
      </div>

      <div className={styles.fieldRow}>
        <label htmlFor="block-inspector-name">{t(LangId.BlockInspectorNameLabel)}</label>
        <input
          id="block-inspector-name"
          value={draft.blockName}
          onChange={(event) => onDraftChange({ ...draft, blockName: event.target.value })}
        />
      </div>

      <ul className={styles.paramList}>
        {draft.entries.map((entry, index) => (
          <li key={`${entry.ritualName}-${index}`}>
            <BlockInspectorParameterCard
              entry={entry}
              onChange={(next) => patchEntry(index, next)}
            />
          </li>
        ))}
      </ul>

      <div className={styles.actions}>
        <button
          type="button"
          className={styles.primary}
          disabled={exposedCount === 0}
          onClick={onGenerateBlock}
        >
          {t(LangId.BlockInspectorGenerate)}
        </button>
        {node.blockViewActive ? (
          <button type="button" className={styles.secondary} onClick={onRevertBlock}>
            {t(LangId.InspectorRevertToNode)}
          </button>
        ) : null}
      </div>
    </>
  )
}

export function BlockInspector({
  node,
  draft,
  knownBlockTypeIds,
  minimized,
  viewportDocked = false,
  dragHandleProps,
  onToggleMinimized,
  onDockToViewport,
  onUndockFromViewportToolbar,
  onDraftChange,
  onGenerateBlock,
  onRevertBlock,
}: BlockInspectorProps) {
  const { t } = useLanguage()
  const {
    surfaceThemeMenuAnchor,
    openSurfaceThemeContextMenu,
    closeSurfaceThemeContextMenu,
  } = useSurfaceThemeContextMenu()
  const stripRef = useRef<HTMLDivElement>(null)
  const [flyoutStyle, setFlyoutStyle] = useState<CSSProperties>({})
  const inspectorTitle = t(LangId.BlockInspectorTitle)
  const defaultEyebrow = t(LangId.BlockInspectorDefaultEyebrow)

  useLayoutEffect(() => {
    if (!viewportDocked || minimized || !stripRef.current) {
      return
    }
    const rect = stripRef.current.getBoundingClientRect()
    setFlyoutStyle({
      position: 'fixed',
      top: rect.bottom + 8,
      right: Math.max(16, window.innerWidth - rect.right),
      zIndex: 40,
    })
  }, [minimized, viewportDocked, node?.id])

  useEffect(() => {
    if (!viewportDocked || minimized) {
      return
    }
    const onResize = () => {
      if (!stripRef.current) {
        return
      }
      const rect = stripRef.current.getBoundingClientRect()
      setFlyoutStyle({
        position: 'fixed',
        top: rect.bottom + 8,
        right: Math.max(16, window.innerWidth - rect.right),
        zIndex: 40,
      })
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [minimized, viewportDocked])

  const dockPinButton =
    viewportDocked && onUndockFromViewportToolbar ? (
      <button
        type="button"
        className={styles.iconButton}
        aria-label={t(LangId.BlockInspectorUndockFromViewport)}
        onClick={(event) =>
          onUndockFromViewportToolbar({
            clientX: event.clientX,
            clientY: event.clientY,
          })
        }
        onPointerDown={(event) => event.stopPropagation()}
      >
        <ViewportDockPinIcon filled />
      </button>
    ) : onDockToViewport ? (
      <button
        type="button"
        className={styles.iconButton}
        aria-label={t(LangId.BlockInspectorDockToViewport)}
        onClick={onDockToViewport}
        onPointerDown={(event) => event.stopPropagation()}
      >
        <ViewportDockPinIcon filled={false} />
      </button>
    ) : null

  const chromeStripClassName = [
    styles.inspectorChromeStrip,
    !viewportDocked && dragHandleProps?.onPointerDown ? styles.inspectorChromeStripDraggable : '',
  ]
    .filter(Boolean)
    .join(' ')

  if (minimized) {
    const minimizedRowClassName = [
      styles.minimizedDockRow,
      !viewportDocked && dragHandleProps?.onPointerDown ? styles.minimizedDockRowDraggable : '',
    ]
      .filter(Boolean)
      .join(' ')

    return (
      <div className={minimizedRowClassName}>
        <button
          type="button"
          className={styles.minimizedButton}
          onClick={onToggleMinimized}
          {...(!viewportDocked ? dragHandleProps : {})}
        >
          <span className={styles.minimizedIcon}>B</span>
          <span>{inspectorTitle}</span>
        </button>
        {dockPinButton}
      </div>
    )
  }

  if (viewportDocked) {
    const flyout = (
      <aside
        aria-label={inspectorTitle}
        className={[styles.panel, styles.panelViewportFloatingBody].join(' ')}
        style={flyoutStyle}
        onContextMenu={openSurfaceThemeContextMenu}
      >
        <BlockInspectorBody
          node={node}
          draft={draft}
          knownBlockTypeIds={knownBlockTypeIds}
          onDraftChange={onDraftChange}
          onGenerateBlock={onGenerateBlock}
          onRevertBlock={onRevertBlock}
        />
      </aside>
    )

    return (
      <>
        <div className={chromeStripClassName} ref={stripRef} data-block-inspector-strip>
          <span className={styles.chromeStripEyebrow}>{node?.node.schema.title ?? defaultEyebrow}</span>
          <h2 className={styles.chromeStripTitle}>{inspectorTitle}</h2>
          <div className={styles.headerActions}>
            <button
              type="button"
              className={styles.iconButton}
              onClick={onToggleMinimized}
              onPointerDown={(event) => event.stopPropagation()}
              aria-label={t(LangId.InspectorMinimize)}
            >
              −
            </button>
            {dockPinButton}
          </div>
        </div>
        {createPortal(flyout, document.body)}
        {surfaceThemeMenuAnchor ? (
          <SurfaceThemeContextMenu
            anchor={surfaceThemeMenuAnchor}
            onClose={closeSurfaceThemeContextMenu}
          />
        ) : null}
      </>
    )
  }

  return (
    <aside className={styles.panel} aria-label={inspectorTitle} onContextMenu={openSurfaceThemeContextMenu}>
      <div className={chromeStripClassName} {...dragHandleProps}>
        <span className={styles.chromeStripEyebrow}>{node?.node.schema.title ?? defaultEyebrow}</span>
        <h2 className={styles.chromeStripTitle}>{inspectorTitle}</h2>
        <div className={styles.headerActions}>
          <button
            type="button"
            className={styles.iconButton}
            onClick={onToggleMinimized}
            onPointerDown={(event) => event.stopPropagation()}
            aria-label={t(LangId.InspectorMinimize)}
          >
            −
          </button>
          {dockPinButton}
        </div>
      </div>
      <BlockInspectorBody
        node={node}
        draft={draft}
        knownBlockTypeIds={knownBlockTypeIds}
        onDraftChange={onDraftChange}
        onGenerateBlock={onGenerateBlock}
        onRevertBlock={onRevertBlock}
      />
      {surfaceThemeMenuAnchor ? (
        <SurfaceThemeContextMenu
          anchor={surfaceThemeMenuAnchor}
          onClose={closeSurfaceThemeContextMenu}
        />
      ) : null}
    </aside>
  )
}
