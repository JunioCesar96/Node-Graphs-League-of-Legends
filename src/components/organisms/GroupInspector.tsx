import type { HTMLAttributes } from 'react'

import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react'

import { createPortal } from 'react-dom'



import { ViewportDockPinIcon } from '@/components/atoms/ViewportDockPinIcon'

import { GroupTypeIcon } from '@/components/atoms/GroupTypeIcon'

import { GroupInspectorParameterCard } from '@/components/molecules/GroupInspectorParameterCard'
import { SurfaceThemeContextMenu } from '@/components/molecules/SurfaceThemeContextMenu'

import type { GroupInspectorDraft, GroupInspectorDraftEntry } from '@/core/groupSchema'

import type { CanvasNode } from '@/core/canvasScene'

import { LangId } from '@/core/language/languageIds'

import { groupTypeDefinitionById } from '@/core/groupStructureRegistry'
import { useLanguage } from '@/language/LanguageProvider'
import { useSurfaceThemeContextMenu } from '@/hooks/useSurfaceThemeContextMenu'



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
  const {
    surfaceThemeMenuAnchor,
    openSurfaceThemeContextMenu,
    closeSurfaceThemeContextMenu,
  } = useSurfaceThemeContextMenu()

  const stripRef = useRef<HTMLDivElement>(null)

  const [flyoutStyle, setFlyoutStyle] = useState<CSSProperties>({})

  const inspectorTitle = t(LangId.GroupInspectorTitle)

  const defaultEyebrow = t(LangId.GroupInspectorDefaultEyebrow)



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

          <span className={styles.minimizedIcon}>

            {groupTypeDef?.icon ? (

              <GroupTypeIcon icon={groupTypeDef.icon} color={groupTypeDef.color} />

            ) : (

              'G'

            )}

          </span>

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

        <GroupInspectorBody

          node={node}

          draft={draft}

          onDraftChange={onDraftChange}

          onGenerateGroup={onGenerateGroup}

          onRevertGroup={onRevertGroup}

        />

      </aside>

    )



    return (

      <>

        <div className={chromeStripClassName} ref={stripRef} data-group-inspector-strip>

          <span className={styles.chromeStripEyebrow}>

            {groupTypeDef?.icon ? (

              <GroupTypeIcon icon={groupTypeDef.icon} color={groupTypeDef.color} />

            ) : null}

            {node?.node.schema.title ?? defaultEyebrow}

          </span>

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

      <GroupInspectorBody

        node={node}

        draft={draft}

        onDraftChange={onDraftChange}

        onGenerateGroup={onGenerateGroup}

        onRevertGroup={onRevertGroup}

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


