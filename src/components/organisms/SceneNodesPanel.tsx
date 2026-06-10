import type { HTMLAttributes, ReactNode, RefObject } from 'react'
import { useMemo, useRef, useState } from 'react'

import {
  SceneNodeEyeIcon,
  SceneNodeFocusIcon,
  SceneNodeLockIcon,
} from '@/components/atoms/SceneNodesRowIcons'
import { ViewportDockPinIcon } from '@/components/atoms/ViewportDockPinIcon'
import { DockTabIcon } from '@/components/atoms/DockTabIcon'
import { InspectorViewportDockShell } from '@/components/molecules/InspectorViewportDockShell'
import { InspectorFloatingPanelShell } from '@/components/molecules/InspectorFloatingPanelShell'
import { SceneNodesOptionsMenu } from '@/components/molecules/SceneNodesOptionsMenu'
import { SceneNodesParametersSection } from '@/components/molecules/SceneNodesParametersSection'
import { SceneNodesStatesSection } from '@/components/molecules/SceneNodesStatesSection'
import type { CanvasNode, CanvasScene } from '@/core/canvasScene'
import type { BlockElementViewKey } from '@/core/blockElementViewState'
import { LangId } from '@/core/language/languageIds'
import { useLanguage } from '@/language/LanguageProvider'
import type { SceneNodesStatePreset } from '@/core/sceneNodesStatePresets'
import type { SceneNodesParameterKind } from '@/core/sceneNodesParametersView'
import {
  createCompactElementCanvasVisibility,
  getNodeDisplayTitle,
  isNodeVisibleOnCanvas,
  type NodeVisibilitySceneContext,
  resolveCanvasNodeBodyCssColor,
  type CompactElementCanvasVisibility,
} from '@/core/canvasNodePresentation'
import {
  filterSceneNodesByQuery,
  sortSceneNodes,
  type SceneNodesSortMode,
} from '@/core/sceneNodesListSort'

import dockStyles from '@/styles/inspectorViewportDock.module.css'
import styles from '@/components/organisms/SceneNodesPanel.module.css'

export type SceneNodesPanelTab = 'nodes' | 'parameters' | 'states'

type SceneNodesPanelProps = {
  dragHandleProps: HTMLAttributes<HTMLElement>
  canDeleteSelected: boolean
  minimized: boolean
  onDeleteSelected: () => void
  onDockToViewport?: () => void
  onHideAll: () => void
  onLockAll: () => void
  onPatchNodeOverlay: (
    nodeId: string,
    patch: Partial<
      Pick<
        CanvasNode,
        | 'displayLabel'
        | 'bodyColor'
        | 'bodyColorEnabled'
        | 'sceneHidden'
        | 'branchForceVisible'
        | 'locked'
      >
    >,
  ) => void
  onFocusNode: (nodeId: string) => void
  onRequestAddNode: () => void
  onResetSelectedPosition: () => void
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
  onShowAll: () => void
  onToggleMinimized: () => void
  onUndockFromViewportToolbar?: () => void
  onUnlockAll: () => void
  sceneNodesStatePresets: SceneNodesStatePreset[]
  onSaveNewSceneNodesState: () => void
  onLoadSceneNodesState: (presetId: string) => void
  onDeleteSceneNodesState: (presetId: string) => void
  onOverwriteSceneNodesState: (presetId: string) => void
  onExportSceneNodesStatesJson: () => void
  onImportSceneNodesStatesJson: (file: File) => void
  primarySelectedId: string
  scene: CanvasScene
  selectedNodeIds: string[]
  sortMode: SceneNodesSortMode
  onSortModeChange: (mode: SceneNodesSortMode) => void
  viewportDocked?: boolean
  activeTab?: SceneNodesPanelTab
  onActiveTabChange?: (tab: SceneNodesPanelTab) => void
}

function PanelBody({
  activeTab,
  canDeleteSelected,
  headerActions,
  hideHeader = false,
  onDeleteSelected,
  onFocusNode,
  onOpenOptions,
  onPatchNodeOverlay,
  onRequestAddNode,
  onTabChange,
  optionsOpen,
  optionsButtonRef,
  panelDragHandleProps,
  query,
  setQuery,
  setSortMode,
  sortMode,
  sortedNodes,
  compactVisibility,
  sceneVisibilityContext,
  onSelectNode,
  onCommitParameter,
  onSetBlockElementSelectedIndex,
  selectedNodeIds,
  sceneNodesStatePresets,
  onSaveNewSceneNodesState,
  onLoadSceneNodesState,
  onDeleteSceneNodesState,
  onOverwriteSceneNodesState,
  onExportSceneNodesStatesJson,
  onImportSceneNodesStatesJson,
  primarySelectedId,
  scene,
}: {
  activeTab: SceneNodesPanelTab
  headerActions?: ReactNode
  hideHeader?: boolean
  canDeleteSelected: boolean
  onDeleteSelected: () => void
  onFocusNode: (nodeId: string) => void
  onOpenOptions: () => void
  onPatchNodeOverlay: SceneNodesPanelProps['onPatchNodeOverlay']
  onRequestAddNode: () => void
  onTabChange: (tab: SceneNodesPanelTab) => void
  optionsOpen: boolean
  optionsButtonRef: RefObject<HTMLButtonElement | null>
  panelDragHandleProps: HTMLAttributes<HTMLElement>
  query: string
  setQuery: (value: string) => void
  setSortMode: (mode: SceneNodesSortMode) => void
  sortMode: SceneNodesSortMode
  sortedNodes: CanvasNode[]
  compactVisibility: CompactElementCanvasVisibility
  sceneVisibilityContext: NodeVisibilitySceneContext
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
  selectedNodeIds: string[]
  sceneNodesStatePresets: SceneNodesStatePreset[]
  onSaveNewSceneNodesState: () => void
  onLoadSceneNodesState: (presetId: string) => void
  onDeleteSceneNodesState: (presetId: string) => void
  onOverwriteSceneNodesState: (presetId: string) => void
  onExportSceneNodesStatesJson: () => void
  onImportSceneNodesStatesJson: (file: File) => void
  primarySelectedId: string
  scene: CanvasScene
}) {
  const { t } = useLanguage()
  const nodesTabActive = activeTab === 'nodes'
  const parametersTabActive = activeTab === 'parameters'
  const statesTabActive = activeTab === 'states'
  return (
    <div
      className={[styles.bodyLayout, !nodesTabActive ? styles.bodyLayoutFull : ''].filter(Boolean).join(' ')}
    >
      <div className={styles.mainColumn}>
        {hideHeader ? null : (
          <div className={styles.header}>
            <div className={styles.headerMain}>
              <span className={styles.eyebrow} {...panelDragHandleProps}>
                Cena
              </span>
              <h2 className={styles.title}>{t(LangId.SceneNodesTitle)}</h2>
            </div>
            <div className={styles.headerActions}>{headerActions}</div>
          </div>
        )}

        <div
          aria-label="Secções do painel"
          className={styles.tabBar}
          role="tablist"
        >
          <button
            aria-selected={nodesTabActive}
            className={[styles.tab, nodesTabActive ? styles.tabActive : ''].filter(Boolean).join(' ')}
            id="scene-nodes-tab-nodes"
            onClick={() => onTabChange('nodes')}
            role="tab"
            type="button"
          >
            {t(LangId.SceneNodesTabNodes, undefined, { count: sortedNodes.length })}
          </button>
          <button
            aria-selected={parametersTabActive}
            className={[styles.tab, parametersTabActive ? styles.tabActive : ''].filter(Boolean).join(' ')}
            id="scene-nodes-tab-parameters"
            onClick={() => onTabChange('parameters')}
            role="tab"
            type="button"
          >
            {t(LangId.SceneNodesTabParameters)}
          </button>
          <button
            aria-selected={statesTabActive}
            className={[styles.tab, statesTabActive ? styles.tabActive : ''].filter(Boolean).join(' ')}
            id="scene-nodes-tab-states"
            onClick={() => onTabChange('states')}
            role="tab"
            type="button"
          >
            {t(LangId.SceneNodesTabStates, undefined, { count: sceneNodesStatePresets.length })}
          </button>
        </div>

        {nodesTabActive ? (
          <div
            aria-labelledby="scene-nodes-tab-nodes"
            className={styles.tabPanel}
            role="tabpanel"
          >
        <ul className={styles.list} role="listbox" aria-label="Lista de nós na cena">
          {sortedNodes.length === 0 ? (
            <li className={styles.empty}>Nenhum nó corresponde à pesquisa.</li>
          ) : (
            sortedNodes.map((canvasNode) => {
              const selected = selectedNodeIds.includes(canvasNode.id)
              const visibleOnCanvas = isNodeVisibleOnCanvas(
                canvasNode,
                compactVisibility,
                sceneVisibilityContext,
              )
              const hidden = !visibleOnCanvas
              const policyHidden =
                compactVisibility.hiddenNodeIds?.has(canvasNode.id) === true &&
                canvasNode.sceneHidden !== true
              const locked = canvasNode.locked === true
              const orbColor = resolveCanvasNodeBodyCssColor(canvasNode)

              return (
                <li
                  aria-selected={selected}
                  className={[
                    styles.listItem,
                    selected ? styles.listItemSelected : '',
                    hidden ? styles.listItemHidden : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  key={canvasNode.id}
                  role="option"
                >
                  <button
                    className={styles.rowSelect}
                    onClick={() => onSelectNode(canvasNode.id)}
                    type="button"
                  >
                    <span
                      aria-hidden
                      className={styles.nodeOrb}
                      style={orbColor ? { background: orbColor } : undefined}
                    />
                    <span className={styles.rowTitle}>{getNodeDisplayTitle(canvasNode)}</span>
                  </button>
                  <div className={styles.rowActions}>
                    <button
                      aria-label={locked ? 'Destravar nó' : 'Travar nó'}
                      aria-pressed={locked}
                      className={[
                        styles.rowAction,
                        locked ? styles.rowActionActive : '',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                      onClick={(event) => {
                        event.stopPropagation()
                        onPatchNodeOverlay(canvasNode.id, locked ? { locked: undefined } : { locked: true })
                      }}
                      title={locked ? 'Destravar' : 'Travar'}
                      type="button"
                    >
                      <SceneNodeLockIcon active={locked} />
                    </button>
                    <button
                      aria-label="Focar nó na vista"
                      className={styles.rowAction}
                      onClick={(event) => {
                        event.stopPropagation()
                        onFocusNode(canvasNode.id)
                      }}
                      title="Focar na vista"
                      type="button"
                    >
                      <SceneNodeFocusIcon />
                    </button>
                    <button
                      aria-label={hidden ? 'Mostrar nó na cena' : 'Ocultar nó na cena'}
                      aria-pressed={!hidden}
                      className={[
                        styles.rowAction,
                        hidden ? styles.rowActionMuted : styles.rowActionActive,
                      ]
                        .filter(Boolean)
                        .join(' ')}
                      onClick={(event) => {
                        event.stopPropagation()
                        onPatchNodeOverlay(
                          canvasNode.id,
                          hidden
                            ? {
                                sceneHidden: undefined,
                                ...(policyHidden ? { branchForceVisible: true } : {}),
                              }
                            : { sceneHidden: true, branchForceVisible: undefined },
                        )
                      }}
                      title={hidden ? 'Mostrar' : 'Ocultar'}
                      type="button"
                    >
                      <SceneNodeEyeIcon active={!hidden} />
                    </button>
                  </div>
                </li>
              )
            })
          )}
        </ul>

        <footer className={styles.footer}>
          <input
            aria-label="Pesquisar nós"
            className={styles.search}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Pesquisar…"
            type="search"
            value={query}
          />
          <select
            aria-label="Ordenar nós"
            className={styles.sort}
            onChange={(event) => setSortMode(event.target.value as SceneNodesSortMode)}
            title="Ordenar lista"
            value={sortMode}
          >
            <option value="name">Az</option>
            <option value="type">Tipo</option>
            <option value="position">Posição</option>
          </select>
        </footer>
          </div>
        ) : parametersTabActive ? (
          <div
            aria-labelledby="scene-nodes-tab-parameters"
            className={[styles.tabPanel, styles.tabPanelStates].join(' ')}
            role="tabpanel"
          >
            <SceneNodesParametersSection
              onCommitParameter={onCommitParameter}
              onSelectNode={onSelectNode}
              onSetBlockElementSelectedIndex={onSetBlockElementSelectedIndex}
              primarySelectedId={primarySelectedId}
              scene={scene}
              selectedNodeIds={selectedNodeIds}
            />
          </div>
        ) : (
          <div
            aria-labelledby="scene-nodes-tab-states"
            className={[styles.tabPanel, styles.tabPanelStates].join(' ')}
            role="tabpanel"
          >
            <SceneNodesStatesSection
              onDelete={onDeleteSceneNodesState}
              onExportLibrary={onExportSceneNodesStatesJson}
              onImportLibrary={onImportSceneNodesStatesJson}
              onLoad={onLoadSceneNodesState}
              onOverwrite={onOverwriteSceneNodesState}
              onSaveNew={onSaveNewSceneNodesState}
              presets={sceneNodesStatePresets}
            />
          </div>
        )}
      </div>

      {nodesTabActive ? (
      <aside
        aria-label="Acções da lista"
        className={[styles.sideRail, styles.sideRailOffsetNodes].join(' ')}
      >
            <button
              aria-label="Adicionar nó"
              className={styles.railButton}
              onClick={onRequestAddNode}
              type="button"
            >
              +
            </button>
            <button
              aria-label="Remover nó seleccionado"
              className={[styles.railButton, styles.railButtonDanger].join(' ')}
              disabled={!canDeleteSelected}
              onClick={onDeleteSelected}
              type="button"
            >
              −
            </button>
            <button
              aria-expanded={optionsOpen}
              aria-haspopup="menu"
              aria-label="Opções da ferramenta"
              className={styles.railButton}
              onClick={onOpenOptions}
              ref={optionsButtonRef}
              type="button"
            >
              ⋯
            </button>
      </aside>
      ) : null}
    </div>
  )
}

export function SceneNodesPanel({
  dragHandleProps,
  canDeleteSelected,
  minimized,
  onDeleteSelected,
  onDockToViewport,
  onHideAll,
  onLockAll,
  onPatchNodeOverlay,
  onFocusNode,
  onRequestAddNode,
  onResetSelectedPosition,
  onSelectNode,
  onCommitParameter,
  onSetBlockElementSelectedIndex,
  onShowAll,
  onToggleMinimized,
  onUndockFromViewportToolbar,
  onUnlockAll,
  sceneNodesStatePresets,
  onSaveNewSceneNodesState,
  onLoadSceneNodesState,
  onDeleteSceneNodesState,
  onOverwriteSceneNodesState,
  onExportSceneNodesStatesJson,
  onImportSceneNodesStatesJson,
  primarySelectedId,
  scene,
  selectedNodeIds,
  sortMode,
  onSortModeChange,
  viewportDocked = false,
  activeTab: activeTabProp,
  onActiveTabChange,
}: SceneNodesPanelProps) {
  const { t } = useLanguage()
  const [query, setQuery] = useState('')
  const [optionsOpen, setOptionsOpen] = useState(false)
  const [internalTab, setInternalTab] = useState<SceneNodesPanelTab>('nodes')
  const activeTab = activeTabProp ?? internalTab
  const optionsButtonRef = useRef<HTMLButtonElement>(null)

  const handleTabChange = (tab: SceneNodesPanelTab) => {
    if (activeTabProp === undefined) {
      setInternalTab(tab)
    }
    onActiveTabChange?.(tab)
  }

  const panelDragHandleProps = viewportDocked ? {} : dragHandleProps

  const filteredNodes = useMemo(
    () => filterSceneNodesByQuery(scene.nodes, query),
    [query, scene.nodes],
  )

  const sortedNodes = useMemo(
    () => sortSceneNodes(filteredNodes, sortMode),
    [filteredNodes, sortMode],
  )

  const compactVisibility = useMemo(
    () => createCompactElementCanvasVisibility(scene),
    [scene],
  )

  const sceneVisibilityContext = useMemo(
    (): NodeVisibilitySceneContext => ({
      linkVisibilityFilter: scene.linkVisibilityFilter,
      connections: scene.connections,
      nodes: scene.nodes,
    }),
    [scene.linkVisibilityFilter, scene.connections, scene.nodes],
  )

  const selectedNode = useMemo(
    () => scene.nodes.find((node) => node.id === primarySelectedId),
    [primarySelectedId, scene.nodes],
  )

  const dockPinButton =
    viewportDocked && onUndockFromViewportToolbar ? (
      <button
        aria-label="Desacoplar lista de nós da barra da vista"
        className={styles.dockToggle}
        onClick={(event) => {
          event.stopPropagation()
          onUndockFromViewportToolbar()
        }}
        onPointerDown={(event) => event.stopPropagation()}
        type="button"
      >
        <ViewportDockPinIcon filled />
      </button>
    ) : onDockToViewport ? (
      <button
        aria-label="Acoplar lista de nós à barra da vista"
        className={styles.dockToggle}
        onClick={(event) => {
          event.stopPropagation()
          onDockToViewport()
        }}
        onPointerDown={(event) => event.stopPropagation()}
        type="button"
      >
        <ViewportDockPinIcon filled={false} />
      </button>
    ) : null

  const dockedHeaderActions = (
    <>
      <button
        aria-label="Minimizar nodes em cena"
        className={styles.toggle}
        onClick={onToggleMinimized}
        onPointerDown={(event) => event.stopPropagation()}
        type="button"
      >
        −
      </button>
      {dockPinButton}
    </>
  )

  const toolbarActions = (
    <>
      <button
        aria-label={minimized ? 'Expandir nodes em cena' : 'Minimizar nodes em cena'}
        className={styles.toggle}
        onClick={onToggleMinimized}
        type="button"
      >
        {minimized ? '▸' : '▾'}
      </button>
      {dockPinButton}
    </>
  )

  const panelBodyProps = {
    activeTab,
    canDeleteSelected,
    onDeleteSelected,
    onFocusNode,
    onPatchNodeOverlay,
    onOpenOptions: () => setOptionsOpen((open) => !open),
    onRequestAddNode,
    onTabChange: handleTabChange,
    optionsButtonRef,
    optionsOpen,
    panelDragHandleProps,
    query,
    setQuery,
    setSortMode: onSortModeChange,
    sortMode,
    sortedNodes,
    compactVisibility,
    sceneVisibilityContext,
    onSelectNode,
    onCommitParameter,
    onSetBlockElementSelectedIndex,
    selectedNodeIds,
    sceneNodesStatePresets,
    onSaveNewSceneNodesState: () => {
      onSaveNewSceneNodesState()
      handleTabChange('states')
    },
    onLoadSceneNodesState,
    onDeleteSceneNodesState,
    onOverwriteSceneNodesState,
    onExportSceneNodesStatesJson,
    onImportSceneNodesStatesJson,
    primarySelectedId,
    scene,
  }

  const optionsMenu =
    optionsOpen && optionsButtonRef.current ? (
      <SceneNodesOptionsMenu
        anchorRef={optionsButtonRef}
        hasSelection={Boolean(primarySelectedId && selectedNode)}
        onClose={() => setOptionsOpen(false)}
        onHideAll={() => {
          onHideAll()
          setOptionsOpen(false)
        }}
        onLockAll={() => {
          onLockAll()
          setOptionsOpen(false)
        }}
        onPatchSelected={(patch) => {
          if (primarySelectedId) {
            onPatchNodeOverlay(primarySelectedId, patch)
          }
        }}
        onResetSelectedPosition={() => {
          onResetSelectedPosition()
        }}
        onShowAll={() => {
          onShowAll()
          setOptionsOpen(false)
        }}
        onUnlockAll={() => {
          onUnlockAll()
          setOptionsOpen(false)
        }}
        selectedNode={selectedNode}
      />
    ) : null

  if (viewportDocked) {
    return (
      <InspectorViewportDockShell
        body={
          <>
            <PanelBody hideHeader {...panelBodyProps} />
            {optionsMenu}
          </>
        }
        bodyClassName="inspectorScrollHost"
        expandAriaLabel="Expandir nodes em cena"
        expandContent={<DockTabIcon kind="scene" />}
        eyebrow={`${scene.nodes.length} nós`}
        headerActions={dockedHeaderActions}
        minimized={minimized}
        onExpand={onToggleMinimized}
        shellSurfaceClassName={dockStyles.dockedShellNode}
        title={t(LangId.SceneNodesTitle)}
      />
    )
  }

  if (minimized) {
    const minimizedRowClassName = [
      styles.minimizedDockRow,
      panelDragHandleProps?.onPointerDown ? styles.minimizedDockRowDraggable : '',
    ]
      .filter(Boolean)
      .join(' ')

    return (
      <div className={minimizedRowClassName}>
        <button
          aria-label="Expandir nodes em cena"
          className={styles.minimizedButton}
          onClick={onToggleMinimized}
          {...panelDragHandleProps}
          type="button"
        >
          <span className={styles.minimizedIcon}>N</span>
          <span className={styles.minimizedLabel}>
            {t(LangId.SceneNodesTitle)} ({scene.nodes.length})
          </span>
        </button>
        <div className={styles.minimizedDockActions}>{dockPinButton}</div>
      </div>
    )
  }

  const panelContent = (
    <PanelBody headerActions={toolbarActions} hideHeader {...panelBodyProps} />
  )

  return (
    <>
      <InspectorFloatingPanelShell
        ariaLabel="Nodes em cena"
        body={
          <>
            {panelContent}
            {optionsMenu}
          </>
        }
        bodyClassName="inspectorScrollHost"
        dragHandleProps={dragHandleProps}
        eyebrow={`${scene.nodes.length} nós`}
        headerActions={dockedHeaderActions}
        shellSurfaceClassName={dockStyles.dockedShellNode}
        title={t(LangId.SceneNodesTitle)}
      />
    </>
  )
}
