import type { CSSProperties, HTMLAttributes, ReactNode, RefObject } from 'react'
import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

import {
  SceneNodeEyeIcon,
  SceneNodeFocusIcon,
  SceneNodeLockIcon,
} from '@/components/atoms/SceneNodesRowIcons'
import { ViewportDockPinIcon } from '@/components/atoms/ViewportDockPinIcon'
import { SceneNodesOptionsMenu } from '@/components/molecules/SceneNodesOptionsMenu'
import { SceneNodesStatesSection } from '@/components/molecules/SceneNodesStatesSection'
import type { CanvasNode, CanvasScene } from '@/core/canvasScene'
import type { SceneNodesStatePreset } from '@/core/sceneNodesStatePresets'
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

import styles from '@/components/organisms/SceneNodesPanel.module.css'

const SCENE_NODES_FLOAT_Z = 17

export type SceneNodesPanelTab = 'nodes' | 'states'

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

function readCssSpacePx(vars: string[]): number | null {
  if (typeof document === 'undefined') {
    return null
  }

  const probe = document.createElement('div')
  probe.style.visibility = 'hidden'
  probe.style.position = 'absolute'
  document.body.appendChild(probe)

  let value: number | null = null

  for (const varName of vars) {
    probe.style.padding = `var(${varName})`
    const computed = getComputedStyle(probe).paddingTop
    const parsed = Number.parseFloat(computed)

    if (Number.isFinite(parsed)) {
      value = parsed
      break
    }
  }

  document.body.removeChild(probe)
  return value
}

function useDockedFloatingLayout(viewportDocked: boolean, minimized: boolean) {
  const stripRef = useRef<HTMLDivElement | null>(null)
  const [flyoutStyle, setFlyoutStyle] = useState<CSSProperties>({})

  useLayoutEffect(() => {
    if (!viewportDocked || minimized) {
      setFlyoutStyle({})
      return
    }

    let raf = 0

    const syncPosition = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        const strip = stripRef.current
        const toolbar = strip?.closest('[data-canvas-toolbar]')

        if (!strip || !(toolbar instanceof HTMLElement)) {
          return
        }

        const toolbarRect = toolbar.getBoundingClientRect()
        const stripRect = strip.getBoundingClientRect()
        const space = readCssSpacePx(['--space-3']) ?? 12
        const marginX = readCssSpacePx(['--space-4']) ?? 16
        const bottomPad = readCssSpacePx(['--space-5']) ?? 20
        const panelWidth = Math.min(380, window.innerWidth - 32)
        let left = stripRect.right - panelWidth
        left = Math.min(Math.max(marginX, left), Math.max(marginX, window.innerWidth - marginX - panelWidth))
        const top = toolbarRect.bottom + space
        const maxHeight = Math.max(180, window.innerHeight - top - bottomPad)

        setFlyoutStyle({
          position: 'fixed',
          top,
          left,
          width: panelWidth,
          maxHeight,
          zIndex: SCENE_NODES_FLOAT_Z,
        })
      })
    }

    syncPosition()
    window.addEventListener('resize', syncPosition)
    window.addEventListener('scroll', syncPosition, true)

    return () => {
      window.removeEventListener('resize', syncPosition)
      window.removeEventListener('scroll', syncPosition, true)
      cancelAnimationFrame(raf)
    }
  }, [minimized, viewportDocked])

  return { flyoutStyle, stripRef }
}

function renderFloatingBody(flyout: ReactNode) {
  if (typeof document === 'undefined') {
    return null
  }

  return createPortal(flyout, document.body)
}

function PanelBody({
  activeTab,
  canDeleteSelected,
  headerActions,
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
  selectedNodeIds,
  sceneNodesStatePresets,
  onSaveNewSceneNodesState,
  onLoadSceneNodesState,
  onDeleteSceneNodesState,
  onOverwriteSceneNodesState,
  onExportSceneNodesStatesJson,
  onImportSceneNodesStatesJson,
}: {
  activeTab: SceneNodesPanelTab
  headerActions?: ReactNode
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
  selectedNodeIds: string[]
  sceneNodesStatePresets: SceneNodesStatePreset[]
  onSaveNewSceneNodesState: () => void
  onLoadSceneNodesState: (presetId: string) => void
  onDeleteSceneNodesState: (presetId: string) => void
  onOverwriteSceneNodesState: (presetId: string) => void
  onExportSceneNodesStatesJson: () => void
  onImportSceneNodesStatesJson: (file: File) => void
}) {
  const nodesTabActive = activeTab === 'nodes'
  return (
    <div
      className={[styles.bodyLayout, !nodesTabActive ? styles.bodyLayoutFull : ''].filter(Boolean).join(' ')}
    >
      <div className={styles.mainColumn}>
        <div className={styles.header}>
          <div className={styles.headerMain}>
            <span className={styles.eyebrow} {...panelDragHandleProps}>
              Cena
            </span>
            <h2 className={styles.title}>Nodes em cena</h2>
          </div>
          <div className={styles.headerActions}>{headerActions}</div>
        </div>

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
            Nós ({sortedNodes.length})
          </button>
          <button
            aria-selected={!nodesTabActive}
            className={[styles.tab, !nodesTabActive ? styles.tabActive : ''].filter(Boolean).join(' ')}
            id="scene-nodes-tab-states"
            onClick={() => onTabChange('states')}
            role="tab"
            type="button"
          >
            Estados ({sceneNodesStatePresets.length})
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

  const { flyoutStyle, stripRef } = useDockedFloatingLayout(viewportDocked, minimized)
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
    onDockToViewport || onUndockFromViewportToolbar ? (
      <button
        aria-label={
          viewportDocked ? 'Desacoplar lista de nós da barra da vista' : 'Acoplar lista de nós à barra da vista'
        }
        className={styles.dockToggle}
        onClick={() => {
          if (viewportDocked) {
            onUndockFromViewportToolbar?.()
          } else {
            onDockToViewport?.()
          }
        }}
        type="button"
      >
        <ViewportDockPinIcon filled={viewportDocked} />
      </button>
    ) : null

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

  if (minimized) {
    return (
      <div
        className={[
          styles.inspectorMinimizedDockRow,
          viewportDocked ? styles.inspectorMinimizedDockRowDocked : '',
        ]
          .filter(Boolean)
          .join(' ')}
        data-scene-nodes-viewport-docked={viewportDocked ? 'true' : undefined}
      >
        <button
          aria-label="Expandir nodes em cena"
          className={[styles.minimized, styles.minimizedReveal].join(' ')}
          onClick={onToggleMinimized}
          type="button"
        >
          <span className={styles.minimizedText}>Nodes em cena ({scene.nodes.length})</span>
        </button>
        {dockPinButton}
      </div>
    )
  }

  const panelContent = (
    <PanelBody
      activeTab={activeTab}
      canDeleteSelected={canDeleteSelected}
      headerActions={toolbarActions}
      onDeleteSelected={onDeleteSelected}
      onFocusNode={onFocusNode}
      onPatchNodeOverlay={onPatchNodeOverlay}
      onOpenOptions={() => setOptionsOpen((open) => !open)}
      onRequestAddNode={onRequestAddNode}
      onTabChange={handleTabChange}
      optionsButtonRef={optionsButtonRef}
      optionsOpen={optionsOpen}
      panelDragHandleProps={panelDragHandleProps}
      query={query}
      setQuery={setQuery}
      setSortMode={onSortModeChange}
      sortMode={sortMode}
      sortedNodes={sortedNodes}
      compactVisibility={compactVisibility}
      sceneVisibilityContext={sceneVisibilityContext}
      onSelectNode={onSelectNode}
      selectedNodeIds={selectedNodeIds}
      sceneNodesStatePresets={sceneNodesStatePresets}
      onSaveNewSceneNodesState={() => {
        onSaveNewSceneNodesState()
        handleTabChange('states')
      }}
      onLoadSceneNodesState={onLoadSceneNodesState}
      onDeleteSceneNodesState={onDeleteSceneNodesState}
      onOverwriteSceneNodesState={onOverwriteSceneNodesState}
      onExportSceneNodesStatesJson={onExportSceneNodesStatesJson}
      onImportSceneNodesStatesJson={onImportSceneNodesStatesJson}
    />
  )

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
    const flyoutAside = (
      <aside
        aria-label="Nodes em cena"
        className={[styles.panel, styles.panelViewportFloatingBody].join(' ')}
        style={flyoutStyle}
      >
        {panelContent}
        {optionsMenu}
      </aside>
    )

    return (
      <>
        <div className={styles.inspectorChromeStrip} data-scene-nodes-viewport-strip ref={stripRef}>
          <span
            className={[styles.chromeStripEyebrow, styles.chromeStripEyebrowDocked].join(' ')}
          >
            Nós
          </span>
          <h2 className={styles.chromeStripTitle}>Nodes em cena</h2>
          <div className={styles.headerActions}>{toolbarActions}</div>
        </div>
        {renderFloatingBody(flyoutAside)}
      </>
    )
  }

  return (
    <aside aria-label="Nodes em cena" className={styles.panel}>
      {panelContent}
      {optionsMenu}
    </aside>
  )
}
