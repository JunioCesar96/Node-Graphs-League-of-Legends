import type { HTMLAttributes } from 'react'
import { useMemo } from 'react'

import { ViewportDockPinIcon } from '@/components/atoms/ViewportDockPinIcon'
import { DockTabIcon } from '@/components/atoms/DockTabIcon'
import { BlockInspectorParameterCard } from '@/components/molecules/BlockInspectorParameterCard'
import { InspectorViewportDockShell } from '@/components/molecules/InspectorViewportDockShell'
import { InspectorFloatingPanelShell } from '@/components/molecules/InspectorFloatingPanelShell'
import type { BlockInspectorDraft, BlockInspectorDraftEntry } from '@/core/blockSchema'
import type { CanvasNode } from '@/core/canvasScene'
import { LangId } from '@/core/language/languageIds'
import { blockTypeDefinitionById, blockTypeDefinitionsList } from '@/core/blockStructureRegistry'
import { useLanguage } from '@/language/LanguageProvider'
import dockStyles from '@/styles/inspectorViewportDock.module.css'
import styles from './BlockInspector.module.css'

type BlockInspectorProps = {
  autoBuildBusy?: boolean
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
  onAutoBuild: () => void
  onGenerateBlock: () => void
  onBuildParameters: () => void
  onBuildBlock: () => void
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
  autoBuildBusy = false,
  onDraftChange,
  onAutoBuild,
  onGenerateBlock,
  onBuildParameters,
  onBuildBlock,
  onRevertBlock,
}: Pick<
  BlockInspectorProps,
  | 'node'
  | 'draft'
  | 'knownBlockTypeIds'
  | 'autoBuildBusy'
  | 'onDraftChange'
  | 'onAutoBuild'
  | 'onGenerateBlock'
  | 'onBuildParameters'
  | 'onBuildBlock'
  | 'onRevertBlock'
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
          className={styles.secondary}
          disabled={!node || autoBuildBusy}
          onClick={onAutoBuild}
        >
          {t(LangId.BlockInspectorAutoBuild)}
        </button>
        <button
          type="button"
          className={styles.secondary}
          disabled={exposedCount === 0}
          onClick={onBuildParameters}
        >
          {t(LangId.BlockInspectorBuildParameter)}
        </button>
        <button
          type="button"
          className={styles.secondary}
          disabled={exposedCount === 0}
          onClick={onBuildBlock}
        >
          {t(LangId.BlockInspectorBuildBlock)}
        </button>
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
  autoBuildBusy = false,
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
  onAutoBuild,
  onGenerateBlock,
  onBuildParameters,
  onBuildBlock,
  onRevertBlock,
}: BlockInspectorProps) {
  const { t } = useLanguage()
  const inspectorTitle = t(LangId.BlockInspectorTitle)
  const defaultEyebrow = t(LangId.BlockInspectorDefaultEyebrow)

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

  const headerActions = (
    <>
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
    </>
  )

  const inspectorBody = (
    <BlockInspectorBody
      autoBuildBusy={autoBuildBusy}
      node={node}
      draft={draft}
      knownBlockTypeIds={knownBlockTypeIds}
      onDraftChange={onDraftChange}
      onAutoBuild={onAutoBuild}
      onGenerateBlock={onGenerateBlock}
      onBuildParameters={onBuildParameters}
      onBuildBlock={onBuildBlock}
      onRevertBlock={onRevertBlock}
    />
  )

  if (viewportDocked) {
    return (
      <InspectorViewportDockShell
        body={inspectorBody}
        bodyClassName="inspectorScrollHost"
        expandAriaLabel={t(LangId.BlockInspectorTitle)}
        expandContent={<DockTabIcon kind="block" />}
        eyebrow={node?.node.schema.title ?? defaultEyebrow}
        headerActions={headerActions}
        minimized={minimized}
        onExpand={onToggleMinimized}
        shellSurfaceClassName={dockStyles.dockedShellBlock}
        title={inspectorTitle}
      />
    )
  }

  if (minimized) {
    const minimizedRowClassName = [
      styles.minimizedDockRow,
      dragHandleProps?.onPointerDown ? styles.minimizedDockRowDraggable : '',
    ]
      .filter(Boolean)
      .join(' ')

    return (
      <div className={minimizedRowClassName}>
        <button
          type="button"
          className={styles.minimizedButton}
          onClick={onToggleMinimized}
          {...dragHandleProps}
        >
          <span className={styles.minimizedIcon}>B</span>
          <span>{inspectorTitle}</span>
        </button>
        {dockPinButton}
      </div>
    )
  }

  return (
    <InspectorFloatingPanelShell
      ariaLabel={inspectorTitle}
      body={inspectorBody}
      bodyClassName="inspectorScrollHost"
      dragHandleProps={dragHandleProps}
      eyebrow={node?.node.schema.title ?? defaultEyebrow}
      headerActions={headerActions}
      shellSurfaceClassName={dockStyles.dockedShellBlock}
      title={inspectorTitle}
    />
  )
}
