import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties, PointerEvent } from 'react'

import { AppMenuBar } from '@/components/organisms/AppMenuBar'
import { CodeDock } from '@/components/organisms/CodeDock'
import { GraphCanvas } from '@/components/organisms/GraphCanvas'
import { NodeInspector } from '@/components/organisms/NodeInspector'
import { stubBinStructureDocument } from '@/core/binImportStub'
import { parseSceneDocument, serializeScene } from '@/core/leagueBinScene'
import { schemaRegistry } from '@/core/canvasScene'
import { flattenEntityTemplates, flattenParameterTemplates } from '@/core/schemaCatalog'
import { STORAGE_LAST_STRUCTURE_META, triggerJsonDownload } from '@/core/workspaceStorage'
import {
  ROOT_NODE_ID,
  isCanvasScene,
  useSceneHistory,
} from '@/hooks/useSceneHistory'

import styles from './App.module.css'

type TooltipDictionary = Record<string, string>

type InspectorOffset = {
  x: number
  y: number
}

type InspectorDragGesture = {
  element: HTMLElement
  moved: boolean
  offset: InspectorOffset
  origin: InspectorOffset
  pointerId: number
}

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false
  }

  return Boolean(target.closest('input, textarea, select, button, [contenteditable="true"]'))
}

function App() {
  const inspectorMovedDuringPointer = useRef(false)
  const inspectorDragGesture = useRef<InspectorDragGesture | null>(null)

  const {
    cycleConnectionRouting,
    redoScene,
    resetScene,
    sceneHistory,
    moveNode,
    connectNodes,
    removeConnection,
    createChildNode,
    createRootNode,
    deleteSelectedNodes,
    updateSelectedParameter,
    commitMarqueeSelection,
    undoScene,
    scene,
    selectedNodeIds,
    primarySelectedId,
    selectNode,
    selectAllNodes,
    replaceScene,
    addDynamicEntitySlot,
    addDynamicParameter,
  } = useSceneHistory()

  const availableSchemas = useMemo(() => Object.values(schemaRegistry), [])
  const parameterCatalog = useMemo(
    () => flattenParameterTemplates(availableSchemas),
    [availableSchemas],
  )
  const entityCatalog = useMemo(() => flattenEntityTemplates(availableSchemas), [availableSchemas])

  const [inspectorMinimized, setInspectorMinimized] = useState(false)
  const [inspectorOffset, setInspectorOffset] = useState<InspectorOffset>({ x: 0, y: 0 })
  const [codeDockOpen, setCodeDockOpen] = useState(false)
  const [codeDockWidth, setCodeDockWidth] = useState(360)
  const [codeText, setCodeText] = useState('// Stub do editor League-Bin\n// Sincronização bidirecional chega na fase E.\n')
  const [paletteSignal, setPaletteSignal] = useState(0)
  const [tooltipHints, setTooltipHints] = useState<TooltipDictionary>({})

  useEffect(() => {
    const loadTooltips = async () => {
      try {
        const response = await fetch('/tooltips.json')

        if (!response.ok) {
          return
        }

        const payload: unknown = await response.json()

        if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
          setTooltipHints(payload as TooltipDictionary)
        }
      } catch {
        /** ignore */
      }
    }

    void loadTooltips()
  }, [])

  const requestPalette = () => {
    setPaletteSignal((ticket) => ticket + 1)
  }

  const handleExportGraph = () => {
    const documentPayload = serializeScene(scene)
    const timestampLabel = Date.now()

    triggerJsonDownload(documentPayload, `node-structure-${timestampLabel}.json`)
  }

  const handleImportWorkspaceFile = async (file: File) => {
    if (file.name.toLowerCase().endsWith('.bin')) {
      const structure = stubBinStructureDocument({ label: file.name })

      triggerJsonDownload(structure, `json_structure_${Date.now()}.json`)

      const parsedStub = parseSceneDocument(structure)

      if (!parsedStub) {
        window.alert('Falha ao materializar estrutura stub.')
        return
      }

      replaceScene(parsedStub, {
        exportedAt: new Date().toISOString(),
        filename: file.name,
      })

      return
    }

    try {
      const textContent = await file.text()
      const parsedUnknown: unknown = JSON.parse(textContent)

      const graphCandidate =
        typeof parsedUnknown === 'object' && parsedUnknown !== null && 'nodes' in parsedUnknown
          ? parseSceneDocument(parsedUnknown)
          : isCanvasScene(parsedUnknown)
            ? parsedUnknown
            : null

      if (!graphCandidate) {
        window.alert('Ficheiro JSON inválido para o formato de grafo.')
        return
      }

      replaceScene(graphCandidate)
    } catch {
      window.alert('Não foi possível ler o JSON.')
    }
  }

  const handleStubPipeline = () => {
    const structure = stubBinStructureDocument()

    triggerJsonDownload(structure, `json_structure_${Date.now()}.json`)

    try {
      window.sessionStorage.setItem(
        STORAGE_LAST_STRUCTURE_META,
        JSON.stringify({ generatedAt: new Date().toISOString(), kind: 'stub-bin' }),
      )
    } catch {
      /** ignore */
    }
  }

  const startInspectorDrag = (event: PointerEvent<HTMLElement>) => {
    if (event.button !== 0) {
      return
    }

    inspectorMovedDuringPointer.current = false
    inspectorDragGesture.current = {
      element: event.currentTarget,
      moved: false,
      offset: inspectorOffset,
      origin: {
        x: event.clientX,
        y: event.clientY,
      },
      pointerId: event.pointerId,
    }
    event.currentTarget.setPointerCapture(event.pointerId)
    event.stopPropagation()
  }

  const moveInspectorDrag = (event: PointerEvent<HTMLElement>) => {
    const gesture = inspectorDragGesture.current

    if (!gesture) {
      return
    }

    const nextOffset = {
      x: gesture.offset.x + event.clientX - gesture.origin.x,
      y: gesture.offset.y + event.clientY - gesture.origin.y,
    }
    const moved = Math.abs(nextOffset.x - gesture.offset.x) > 3 || Math.abs(nextOffset.y - gesture.offset.y) > 3

    gesture.moved = gesture.moved || moved
    setInspectorOffset(nextOffset)
  }

  const stopInspectorDrag = (event: PointerEvent<HTMLElement>) => {
    const gesture = inspectorDragGesture.current

    if (gesture?.pointerId !== event.pointerId) {
      return
    }

    inspectorMovedDuringPointer.current = gesture.moved
    inspectorDragGesture.current = null

    if (gesture.element.hasPointerCapture(event.pointerId)) {
      gesture.element.releasePointerCapture(event.pointerId)
    }
  }

  const toggleInspectorMinimized = () => {
    if (inspectorMovedDuringPointer.current) {
      inspectorMovedDuringPointer.current = false
      return
    }

    setInspectorMinimized((isMinimized) => !isMinimized)
  }

  const inspectorDockClassName = [
    styles.inspectorDock,
    inspectorMinimized ? styles.inspectorDockMinimized : styles.inspectorDockExpanded,
  ]
    .filter(Boolean)
    .join(' ')

  const inspectorDockStyle = {
    transform: `translate(${inspectorOffset.x}px, ${inspectorOffset.y}px)`,
  } satisfies CSSProperties

  const handleCloseCodeDock = useCallback(() => {
    setCodeDockOpen(false)
  }, [])

  useEffect(() => {
    const handleKeyboardShortcut = (event: KeyboardEvent) => {
      if (isEditableTarget(event.target)) {
        return
      }

      const key = event.key.toLowerCase()

      if ((event.ctrlKey || event.metaKey) && key === 'z') {
        event.preventDefault()

        if (event.shiftKey) {
          redoScene()
          return
        }

        undoScene()
        return
      }

      if ((event.ctrlKey || event.metaKey) && key === 'y') {
        event.preventDefault()
        redoScene()
        return
      }

      if (event.key === 'Delete' || event.key === 'Backspace') {
        const hasProtectedOnly =
          selectedNodeIds.length === 1 && selectedNodeIds[0] === ROOT_NODE_ID && primarySelectedId === ROOT_NODE_ID

        if (hasProtectedOnly) {
          return
        }

        event.preventDefault()
        deleteSelectedNodes()
      }
    }

    window.addEventListener('keydown', handleKeyboardShortcut)

    return () => {
      window.removeEventListener('keydown', handleKeyboardShortcut)
    }
  }, [
    deleteSelectedNodes,
    primarySelectedId,
    redoScene,
    selectedNodeIds,
    undoScene,
  ])

  const inspectorTarget =
    scene.nodes.find((node) => node.id === primarySelectedId) ?? scene.nodes[0]

  if (!inspectorTarget) {
    return (
      <main className={styles.shell}>
        <AppMenuBar
          onDeleteSelection={() => deleteSelectedNodes()}
          onExportGraph={handleExportGraph}
          onImportGraph={handleImportWorkspaceFile}
          onOpenStubBin={handleStubPipeline}
          onRequestAddNode={requestPalette}
          onToggleCodeDock={() => setCodeDockOpen((isOpen) => !isOpen)}
        />
        <p className={styles.empty}>Nenhum nó disponível. Use File → Stub .bin ou add node.</p>
      </main>
    )
  }

  return (
    <main className={styles.shell}>
      <AppMenuBar
        onDeleteSelection={() => deleteSelectedNodes()}
        onExportGraph={handleExportGraph}
        onImportGraph={handleImportWorkspaceFile}
        onOpenStubBin={handleStubPipeline}
        onRequestAddNode={requestPalette}
        onToggleCodeDock={() => setCodeDockOpen((isOpen) => !isOpen)}
      />

      <div className={styles.workspace}>
        <div className={styles.graphColumn}>
          <GraphCanvas
            availableSchemas={availableSchemas}
            canRedo={sceneHistory.future.length > 0}
            canUndo={sceneHistory.past.length > 0}
            entityCatalog={entityCatalog}
            hints={tooltipHints}
            onCatalogEntityAppend={(canvasNodeId, entity) =>
              addDynamicEntitySlot(canvasNodeId, entity)
            }
            onCatalogParameterAppend={(canvasNodeId, definition) =>
              addDynamicParameter(canvasNodeId, definition)
            }
            onCloseCodePanelShortcut={handleCloseCodeDock}
            onConnectNodes={connectNodes}
            onCreateChildNode={createChildNode}
            onCreateRootNode={createRootNode}
            onCycleConnectionRouting={cycleConnectionRouting}
            onMarqueeCommit={commitMarqueeSelection}
            onMoveNode={moveNode}
            onRedo={redoScene}
            onRemoveConnection={removeConnection}
            onResetScene={resetScene}
            onSelectAllNodesShortcut={selectAllNodes}
            onSelectNode={(nodeId, options) => selectNode(nodeId, options)}
            onUndo={undoScene}
            parameterCatalog={parameterCatalog}
            paletteRequestSignal={paletteSignal}
            scene={scene}
            selectedNodeId={primarySelectedId}
            selectedNodeIds={selectedNodeIds}
          />
          <div className={inspectorDockClassName} style={inspectorDockStyle}>
            <NodeInspector
              canDelete={
                !(selectedNodeIds.length === 1 && selectedNodeIds[0] === ROOT_NODE_ID && primarySelectedId === ROOT_NODE_ID)
              }
              dragHandleProps={{
                onPointerCancel: stopInspectorDrag,
                onPointerDown: startInspectorDrag,
                onPointerMove: moveInspectorDrag,
                onPointerUp: stopInspectorDrag,
              }}
              minimized={inspectorMinimized}
              node={inspectorTarget}
              onDelete={() => deleteSelectedNodes()}
              onToggleMinimized={toggleInspectorMinimized}
              onUpdateParameter={updateSelectedParameter}
            />
          </div>
        </div>

        {codeDockOpen ? (
          <CodeDock
            onChange={setCodeText}
            onClose={handleCloseCodeDock}
            onWidthChange={setCodeDockWidth}
            value={codeText}
            width={codeDockWidth}
          />
        ) : null}
      </div>
    </main>
  )
}

export default App
