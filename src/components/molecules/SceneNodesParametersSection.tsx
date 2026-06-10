import { useEffect, useMemo, useState } from 'react'

import { InputAddonChangeCell } from '@/components/molecules/InputAddonChangeCell'
import { ParameterValueInput } from '@/components/molecules/ParameterValueInput'
import { StructureIndexPager } from '@/components/molecules/StructureIndexPager'
import {
  SceneNodesParameterInputAddonContextMenu,
  type SceneNodesParameterInputAddonContextMenuAnchor,
} from '@/components/molecules/SceneNodesParameterInputAddonContextMenu'
import type { CanvasScene } from '@/core/canvasScene'
import { getNodeDisplayTitle } from '@/core/canvasNodePresentation'
import type { BlockElementViewKey } from '@/core/blockElementViewState'
import { writeInputAddonPreference } from '@/core/inputAddonPreferences'
import { LangId } from '@/core/language/languageIds'
import type { SceneNodesParameterKind } from '@/core/sceneNodesParametersView'
import {
  buildSceneNodesParameterRows,
  resolveSceneNodesParameterParentNodeId,
  shouldShowSceneNodesParametersPanel,
} from '@/core/sceneNodesParametersView'
import { useLanguage } from '@/language/LanguageProvider'

import styles from '@/components/molecules/SceneNodesParametersSection.module.css'

type SceneNodesParametersSectionProps = {
  primarySelectedId: string
  scene: CanvasScene
  selectedNodeIds: string[]
  onSelectNode: (nodeId: string) => void
  onCommitParameter: (
    nodeId: string,
    parameterId: string,
    value: string,
    kind: SceneNodesParameterKind,
  ) => void
  onSetBlockElementSelectedIndex?: (
    nodeId: string,
    elementKey: BlockElementViewKey,
    selectedIndex: number,
  ) => void
}

type InputAddonContextState = {
  rowId: string
  anchor: SceneNodesParameterInputAddonContextMenuAnchor
}

export function SceneNodesParametersSection({
  primarySelectedId,
  scene,
  selectedNodeIds,
  onSelectNode,
  onCommitParameter,
  onSetBlockElementSelectedIndex,
}: SceneNodesParametersSectionProps) {
  const { t } = useLanguage()
  const [viewNodeId, setViewNodeId] = useState(primarySelectedId)
  const [inputAddonOverrides, setInputAddonOverrides] = useState<Record<string, string>>({})
  const [inputAddonContextMenu, setInputAddonContextMenu] = useState<InputAddonContextState | null>(
    null,
  )

  useEffect(() => {
    setViewNodeId(primarySelectedId)
  }, [primarySelectedId])

  const canShowParameters = shouldShowSceneNodesParametersPanel(selectedNodeIds.length)

  const viewNode = useMemo(
    () => scene.nodes.find((node) => node.id === viewNodeId),
    [scene.nodes, viewNodeId],
  )

  const rows = useMemo(
    () => (viewNode ? buildSceneNodesParameterRows(scene, viewNode) : []),
    [scene, viewNode],
  )

  const parentNodeId = useMemo(
    () => resolveSceneNodesParameterParentNodeId(scene, viewNodeId),
    [scene, viewNodeId],
  )

  const parentNode = useMemo(
    () => (parentNodeId ? scene.nodes.find((node) => node.id === parentNodeId) : undefined),
    [parentNodeId, scene.nodes],
  )

  const backTargetId =
    parentNodeId ?? (viewNodeId !== primarySelectedId ? primarySelectedId : undefined)

  if (!canShowParameters) {
    return (
      <p className={styles.empty}>
        {selectedNodeIds.length === 0
          ? t(LangId.SceneNodesParametersEmptyNoSelection)
          : t(LangId.SceneNodesParametersEmptyMultiSelection)}
      </p>
    )
  }

  if (!viewNode) {
    return <p className={styles.empty}>{t(LangId.SceneNodesParametersEmptyNoSelection)}</p>
  }

  const backLabel =
    parentNodeId && parentNode
      ? t(LangId.SceneNodesParametersNavigateParent, undefined, {
          name: getNodeDisplayTitle(parentNode),
        })
      : t(LangId.SceneNodesParametersBack)

  return (
    <div className={styles.panel}>
      <div className={styles.headerRow}>
        {backTargetId ? (
          <button
            aria-label={backLabel}
            className={styles.backButton}
            onClick={() => {
              setViewNodeId(backTargetId)
              onSelectNode(backTargetId)
            }}
            title={backLabel}
            type="button"
          >
            ←
          </button>
        ) : (
          <span aria-hidden />
        )}
        <span className={styles.nodeTitle} title={getNodeDisplayTitle(viewNode)}>
          {getNodeDisplayTitle(viewNode)}
        </span>
      </div>

      {rows.length === 0 ? (
        <p className={styles.empty}>{t(LangId.SceneNodesParametersEmptyNode)}</p>
      ) : (
        <div className={styles.table} role="table">
          <div className={styles.tableHead} role="row">
            <span className={styles.colName} role="columnheader">
              {t(LangId.SceneNodesParametersColName)}
            </span>
            <span className={styles.colValue} role="columnheader">
              {t(LangId.SceneNodesParametersColValue)}
            </span>
            <span
              className={styles.colInputAddon}
              role="columnheader"
              title={t(LangId.SceneNodesParametersColInputAddon)}
            >
              (I.A)
            </span>
          </div>
          {rows.map((row) => {
            const showListIndex = Boolean(row.listIndex && row.listIndex.connectionCount > 1)
            const activeInputAddonId = inputAddonOverrides[row.id] ?? row.activeInputAddonId
            const activeManifest = row.inputAddonMatches?.find(
              (manifest) => manifest.id === activeInputAddonId,
            )
            const showInputAddon = row.editable && activeManifest && activeInputAddonId
            const canChooseInputAddon = Boolean(
              row.editable && row.inputAddonMatches && row.inputAddonMatches.length > 1,
            )

            const navigateButton =
              row.navigable && row.childNodeId ? (
                <button
                  aria-label={t(LangId.SceneNodesParametersNavigateChild, undefined, {
                    name: row.name,
                  })}
                  className={styles.navigateButton}
                  onClick={() => {
                    setViewNodeId(row.childNodeId!)
                    onSelectNode(row.childNodeId!)
                  }}
                  title={t(LangId.SceneNodesParametersNavigateChild, undefined, {
                    name: row.name,
                  })}
                  type="button"
                >
                  →
                </button>
              ) : null

            return (
              <div
                className={styles.tableRow}
                key={row.id}
                onContextMenu={
                  canChooseInputAddon
                    ? (event) => {
                        const target = event.target
                        if (
                          target instanceof Element &&
                          target.closest('button, input, select, textarea')
                        ) {
                          return
                        }
                        event.preventDefault()
                        setInputAddonContextMenu({
                          rowId: row.id,
                          anchor: { left: event.clientX, top: event.clientY },
                        })
                      }
                    : undefined
                }
                role="row"
              >
                <span className={styles.paramName} role="cell">
                  <span className={styles.paramNameText} title={row.name}>
                    {row.name}
                  </span>
                  {!showListIndex ? navigateButton : null}
                </span>
                <div className={styles.paramValueCell} role="cell">
                  {showListIndex && row.listIndex ? (
                    <div className={styles.paramValueWithIndex}>
                      <StructureIndexPager
                        className={styles.listIndexPager}
                        onSelectedIndexChange={(index) => {
                          const elementViewKey = row.listIndex?.elementViewKey
                          if (elementViewKey) {
                            onSetBlockElementSelectedIndex?.(viewNodeId, elementViewKey, index)
                          }
                        }}
                        selectedIndex={row.listIndex.connectionIndex}
                        total={row.listIndex.connectionCount}
                      />
                      {navigateButton}
                      <span
                        className={styles.paramValue}
                        title={row.fullValue || row.displayValue}
                      >
                        {row.displayValue}
                      </span>
                    </div>
                  ) : row.editable ? (
                    <ParameterValueInput
                      ariaLabel={`${row.name} value`}
                      className={styles.paramInput}
                      key={`${viewNodeId}:${row.id}`}
                      onCommit={(nextValue) =>
                        onCommitParameter(viewNodeId, row.id, nextValue, row.kind)
                      }
                      type={row.valueType}
                      value={row.editValue}
                    />
                  ) : (
                    <span className={styles.paramValue} title={row.fullValue || row.displayValue}>
                      {row.displayValue}
                    </span>
                  )}
                </div>
                <div className={styles.inputAddonCell} role="cell">
                  {showInputAddon ? (
                    <InputAddonChangeCell
                      inputAddonId={activeInputAddonId}
                      key={`${viewNodeId}:${row.id}:${activeInputAddonId}`}
                      manifest={activeManifest}
                      onCommit={(nextValue) =>
                        onCommitParameter(viewNodeId, row.id, nextValue, row.kind)
                      }
                      value={row.editValue}
                    />
                  ) : null}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {inputAddonContextMenu ? (
        (() => {
          const row = rows.find((entry) => entry.id === inputAddonContextMenu.rowId)
          if (!row?.inputAddonMatches?.length) {
            return null
          }
          return (
            <SceneNodesParameterInputAddonContextMenu
              activeInputAddonId={inputAddonOverrides[row.id] ?? row.activeInputAddonId}
              anchor={inputAddonContextMenu.anchor}
              manifests={row.inputAddonMatches}
              onClose={() => setInputAddonContextMenu(null)}
              onSelect={(inputAddonId) => {
                if (row.inputAddonPreferenceKey) {
                  writeInputAddonPreference(row.inputAddonPreferenceKey, inputAddonId)
                }
                setInputAddonOverrides((current) => ({
                  ...current,
                  [row.id]: inputAddonId,
                }))
              }}
            />
          )
        })()
      ) : null}
    </div>
  )
}
