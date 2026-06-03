import type { HTMLAttributes } from 'react'

import { ViewportDockPinIcon } from '@/components/atoms/ViewportDockPinIcon'
import { DockTabIcon } from '@/components/atoms/DockTabIcon'
import { GroupTypeIcon } from '@/components/atoms/GroupTypeIcon'
import { GroupInspectorParameterCard } from '@/components/molecules/GroupInspectorParameterCard'
import { InspectorViewportDockShell } from '@/components/molecules/InspectorViewportDockShell'
import { InspectorFloatingPanelShell } from '@/components/molecules/InspectorFloatingPanelShell'
import type { GroupInspectorDraft, GroupInspectorDraftEntry } from '@/core/groupSchema'
import type { CanvasNode } from '@/core/canvasScene'
import { LangId } from '@/core/language/languageIds'
import { groupTypeDefinitionById } from '@/core/groupStructureRegistry'
import { useLanguage } from '@/language/LanguageProvider'
import dockStyles from '@/styles/inspectorViewportDock.module.css'
import styles from './GroupInspector.module.css'



type GroupInspectorProps = {

  node?: CanvasNode

  draft: GroupInspectorDraft | null

  minimized: boolean

  viewportDocked?: boolean

  dragHandleProps?: HTMLAttributes<HTMLElement>

  onToggleMinimized: () => void

  onDockToViewport?: () => void

  onUndockFromViewportToolbar?: (anchor: { clientX: number; clientY: number }) => void

  onDraftChange: (draft: GroupInspectorDraft) => void

  onGenerateGroup: () => void

  onRevertGroup: () => void

}



function GroupInspectorBody({

  node,

  draft,

  onDraftChange,

  onGenerateGroup,

  onRevertGroup,

}: Pick<

  GroupInspectorProps,

  'node' | 'draft' | 'onDraftChange' | 'onGenerateGroup' | 'onRevertGroup'

>) {

  const { t } = useLanguage()

  const exposedCount = draft?.entries.filter((entry) => entry.exposed).length ?? 0

  const groupTypeDef = draft ? groupTypeDefinitionById(draft.groupType) : undefined

  const groupTypeLabel = groupTypeDef?.title ?? draft?.groupType ?? ''



  if (!node || !draft) {

    return <p className={styles.empty}>{t(LangId.GroupInspectorEmptyHint)}</p>

  }



  const patchEntry = (index: number, entry: GroupInspectorDraftEntry) => {

    onDraftChange({

      ...draft,

      entries: draft.entries.map((current, entryIndex) => (entryIndex === index ? entry : current)),

    })

  }



  return (

    <>

      <p className={styles.typeHint}>

        {groupTypeDef?.icon ? (

          <GroupTypeIcon icon={groupTypeDef.icon} color={groupTypeDef.color} />

        ) : null}

        <span>{t(LangId.GroupInspectorTypeHint, undefined, { type: groupTypeLabel })}</span>

      </p>



      <div className={styles.fieldRow}>

        <label htmlFor="group-inspector-name">{t(LangId.GroupInspectorNameLabel)}</label>

        <input

          id="group-inspector-name"

          value={draft.groupName}

          onChange={(event) => onDraftChange({ ...draft, groupName: event.target.value })}

        />

      </div>



      <ul className={styles.paramList}>

        {draft.entries.map((entry, index) => (

          <li key={`${entry.ritualName}-${index}`}>

            <GroupInspectorParameterCard

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

          onClick={onGenerateGroup}

        >

          {t(LangId.GroupInspectorGenerate)}

        </button>

        {node.groupViewActive ? (

          <button type="button" className={styles.secondary} onClick={onRevertGroup}>

            {t(LangId.InspectorRevertToNode)}

          </button>

        ) : null}

      </div>

    </>

  )

}



export function GroupInspector({
  node,
  draft,
  minimized,
  viewportDocked = false,
  dragHandleProps,
  onToggleMinimized,
  onDockToViewport,
  onUndockFromViewportToolbar,
  onDraftChange,
  onGenerateGroup,
  onRevertGroup,
}: GroupInspectorProps) {
  const { t } = useLanguage()
  const inspectorTitle = t(LangId.GroupInspectorTitle)
  const defaultEyebrow = t(LangId.GroupInspectorDefaultEyebrow)
  const groupTypeDef = draft ? groupTypeDefinitionById(draft.groupType) : undefined

  const dockPinButton =
    viewportDocked && onUndockFromViewportToolbar ? (
      <button
        type="button"
        className={styles.iconButton}
        aria-label={t(LangId.GroupInspectorUndockFromViewport)}
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
        aria-label={t(LangId.GroupInspectorDockToViewport)}
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
    <GroupInspectorBody
      node={node}
      draft={draft}
      onDraftChange={onDraftChange}
      onGenerateGroup={onGenerateGroup}
      onRevertGroup={onRevertGroup}
    />
  )

  const eyebrowContent = (
    <>
      {groupTypeDef?.icon ? (
        <GroupTypeIcon icon={groupTypeDef.icon} color={groupTypeDef.color} />
      ) : null}
      {node?.node.schema.title ?? defaultEyebrow}
    </>
  )

  if (viewportDocked) {
    return (
      <InspectorViewportDockShell
        body={inspectorBody}
        bodyClassName="inspectorScrollHost"
        expandAriaLabel={inspectorTitle}
        expandContent={<DockTabIcon kind="group" />}
        eyebrow={eyebrowContent}
        headerActions={headerActions}
        minimized={minimized}
        onExpand={onToggleMinimized}
        shellSurfaceClassName={dockStyles.dockedShellGroup}
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
          <span className={styles.minimizedIcon}>
            {groupTypeDef?.icon ? (
              <GroupTypeIcon icon={groupTypeDef.icon} color={groupTypeDef.color} />
            ) : (
              'G'
            )}
          </span>
          <span className={styles.minimizedLabel}>{inspectorTitle}</span>
        </button>
        <div className={styles.minimizedDockActions}>{dockPinButton}</div>
      </div>
    )
  }

  return (
    <InspectorFloatingPanelShell
      ariaLabel={inspectorTitle}
      body={inspectorBody}
      bodyClassName="inspectorScrollHost"
      dragHandleProps={dragHandleProps}
      eyebrow={eyebrowContent}
      headerActions={headerActions}
      shellSurfaceClassName={dockStyles.dockedShellGroup}
      title={inspectorTitle}
    />
  )
}


