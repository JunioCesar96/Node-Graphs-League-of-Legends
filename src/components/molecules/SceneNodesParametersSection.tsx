import { useEffect, useMemo, useState } from 'react'

import { ParameterValueInput } from '@/components/molecules/ParameterValueInput'
import type { CanvasScene } from '@/core/canvasScene'
import { getNodeDisplayTitle } from '@/core/canvasNodePresentation'
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
}

export function SceneNodesParametersSection({
  primarySelectedId,
  scene,
  selectedNodeIds,
  onSelectNode,
  onCommitParameter,
}: SceneNodesParametersSectionProps) {
  const { t } = useLanguage()
  const [viewNodeId, setViewNodeId] = useState(primarySelectedId)

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
            <span role="columnheader">{t(LangId.SceneNodesParametersColName)}</span>
            <span role="columnheader">{t(LangId.SceneNodesParametersColValue)}</span>
            <span aria-hidden />
          </div>
          {rows.map((row) => (
            <div className={styles.tableRow} key={row.id} role="row">
              <span className={styles.paramName} role="cell" title={row.name}>
                {row.name}
              </span>
              <div className={styles.paramValueCell} role="cell">
                {row.editable ? (
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
              {row.navigable && row.childNodeId ? (
                <button
                  aria-label={t(LangId.SceneNodesParametersNavigateChild, undefined, { name: row.name })}
                  className={styles.navigateButton}
                  onClick={() => {
                    setViewNodeId(row.childNodeId!)
                    onSelectNode(row.childNodeId!)
                  }}
                  title={t(LangId.SceneNodesParametersNavigateChild, undefined, { name: row.name })}
                  type="button"
                >
                  →
                </button>
              ) : (
                <span aria-hidden />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
