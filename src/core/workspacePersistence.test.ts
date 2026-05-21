import { describe, expect, it } from 'vitest'

import { demoCanvasScene } from '@/core/demoCanvasScene'
import { DEFAULT_CANVAS_TOOLBAR_VISIBILITY } from '@/core/canvasToolbarVisibility'
import { elementViewKeyForParameter, patchElementRetracted } from '@/core/elementViewState'
import {
  isWorkspaceBundleEmpty,
  isWorkspaceBundleValid,
  mergeWorkspaceToScene,
  splitSceneToWorkspace,
  WORKSPACE_FORMAT_VERSION,
} from '@/core/workspacePersistence'

describe('workspacePersistence', () => {
  it('faz round-trip split → merge sobre a demo estática', () => {
    const bundle = splitSceneToWorkspace(demoCanvasScene)
    const restored = mergeWorkspaceToScene(bundle)

    expect(restored).not.toBeNull()
    expect(restored?.nodes.length).toBe(demoCanvasScene.nodes.length)
    expect(restored?.connections.length).toBe(demoCanvasScene.connections.length)
    expect(restored?.nodes[0]?.node.schema.id).toBe(demoCanvasScene.nodes[0]?.node.schema.id)
    expect(restored?.nodes[0]?.position).toEqual(demoCanvasScene.nodes[0]?.position)
  })

  it('persiste overlay de apresentação dos nós no layout', () => {
    const withOverlay = {
      ...demoCanvasScene,
      nodes: demoCanvasScene.nodes.map((node, index) =>
        index === 0
          ? {
              ...node,
              sceneHidden: true,
              displayLabel: 'Alias',
              bodyColor: 'rgba(10, 20, 30, 0.8)',
              bodyColorEnabled: true,
              locked: true,
            }
          : node,
      ),
    }
    const bundle = splitSceneToWorkspace(withOverlay)
    const entry = bundle.layout.nodes[withOverlay.nodes[0]!.id]
    expect(entry?.sceneHidden).toBe(true)
    expect(entry?.displayLabel).toBe('Alias')
    expect(entry?.bodyColor).toBe('rgba(10, 20, 30, 0.8)')
    expect(entry?.bodyColorEnabled).toBe(true)
    expect(entry?.locked).toBe(true)

    const restored = mergeWorkspaceToScene(bundle)
    const restoredNode = restored?.nodes.find((node) => node.id === withOverlay.nodes[0]!.id)
    expect(restoredNode?.sceneHidden).toBe(true)
    expect(restoredNode?.displayLabel).toBe('Alias')
    expect(restoredNode?.bodyColor).toBe('rgba(10, 20, 30, 0.8)')
    expect(restoredNode?.bodyColorEnabled).toBe(true)
    expect(restoredNode?.locked).toBe(true)
  })

  it('persiste cardBodyLayout freeform no layout', () => {
    const withFreeform = {
      ...demoCanvasScene,
      nodes: demoCanvasScene.nodes.map((node, index) =>
        index === 0 ? { ...node, cardBodyLayout: 'freeform' as const } : node,
      ),
    }
    const bundle = splitSceneToWorkspace(withFreeform)
    expect(bundle.layout.nodes[withFreeform.nodes[0]!.id]?.cardBodyLayout).toBe('freeform')

    const restored = mergeWorkspaceToScene(bundle)
    const restoredNode = restored?.nodes.find((node) => node.id === withFreeform.nodes[0]!.id)
    expect(restoredNode?.cardBodyLayout).toBe('freeform')
    expect(restoredNode?.cardSectionExpanded?.parameters).toBe(true)
  })

  it('persiste elementView.retracted no logic', () => {
    const canvasNode = demoCanvasScene.nodes[0]!
    const param = canvasNode.node.schema.parameters[0]
    if (!param) {
      return
    }

    const key = elementViewKeyForParameter(param.id)
    const withRetracted = {
      ...demoCanvasScene,
      nodes: demoCanvasScene.nodes.map((n) =>
        n.id === canvasNode.id
          ? { ...n, node: patchElementRetracted(n.node, key, true) }
          : n,
      ),
    }

    const bundle = splitSceneToWorkspace(withRetracted)
    const logicNode = bundle.logic.nodes[canvasNode.id]
    expect(logicNode?.elementView?.[key]?.retracted).toBe(true)

    const restored = mergeWorkspaceToScene(bundle)
    const restoredNode = restored?.nodes.find((node) => node.id === canvasNode.id)
    expect(restoredNode?.node.elementView?.[key]?.retracted).toBe(true)
  })

  it('persiste bodyCollapsed no layout', () => {
    const withCollapsed = {
      ...demoCanvasScene,
      nodes: demoCanvasScene.nodes.map((node, index) =>
        index === 0 ? { ...node, bodyCollapsed: true } : node,
      ),
    }
    const bundle = splitSceneToWorkspace(withCollapsed)
    expect(bundle.layout.nodes[withCollapsed.nodes[0]!.id]?.bodyCollapsed).toBe(true)

    const restored = mergeWorkspaceToScene(bundle)
    const restoredNode = restored?.nodes.find((node) => node.id === withCollapsed.nodes[0]!.id)
    expect(restoredNode?.bodyCollapsed).toBe(true)
  })

  it('persiste bodyColorEnabled false no layout', () => {
    const withColorOff = {
      ...demoCanvasScene,
      nodes: demoCanvasScene.nodes.map((node, index) =>
        index === 0
          ? { ...node, bodyColor: 'rgba(0,0,0,0.5)', bodyColorEnabled: false }
          : node,
      ),
    }
    const bundle = splitSceneToWorkspace(withColorOff)
    expect(bundle.layout.nodes[withColorOff.nodes[0]!.id]?.bodyColorEnabled).toBe(false)

    const restored = mergeWorkspaceToScene(bundle)
    const restoredNode = restored?.nodes.find((node) => node.id === withColorOff.nodes[0]!.id)
    expect(restoredNode?.bodyColorEnabled).toBe(false)
  })

  it('merge sem cardBodyLayout assume freeform', () => {
    const nodeId = demoCanvasScene.nodes[0]!.id
    const bundle = splitSceneToWorkspace(demoCanvasScene)
    const entry = bundle.layout.nodes[nodeId]
    if (!entry) {
      throw new Error('layout entry em falta')
    }
    const { cardBodyLayout: _removed, ...entryWithoutLayout } = entry
    bundle.layout.nodes[nodeId] = entryWithoutLayout

    const restored = mergeWorkspaceToScene(bundle)
    const restoredNode = restored?.nodes.find((node) => node.id === nodeId)
    expect(restoredNode?.cardBodyLayout).toBe('freeform')
    expect(restoredNode?.cardSectionExpanded?.parameters).toBe(true)
  })

  it('persiste connection.routing e compactRoutingBackups no graph', () => {
    const connection = demoCanvasScene.connections[0]
    if (!connection) {
      return
    }

    const withRouting = {
      ...demoCanvasScene,
      connections: demoCanvasScene.connections.map((c) =>
        c.id === connection.id ? { ...c, routing: 'wireless' as const } : c,
      ),
      compactRoutingBackups: { [connection.id]: 'flex' },
    }
    const bundle = splitSceneToWorkspace(withRouting)
    const stored = bundle.graph.connections.find((c) => c.id === connection.id)
    expect(stored?.routing).toBe('wireless')
    expect(bundle.graph.compactRoutingBackups?.[connection.id]).toBe('flex')

    const restored = mergeWorkspaceToScene(bundle)
    const restoredConn = restored?.connections.find((c) => c.id === connection.id)
    expect(restoredConn?.routing).toBe('wireless')
    expect(restored?.compactRoutingBackups?.[connection.id]).toBe('flex')
  })

  it('persiste sceneChrome no layout', () => {
    const withChrome = {
      ...demoCanvasScene,
      sceneChrome: {
        sceneNodes: { minimized: false, sortMode: 'position' as const },
        toolbarVisibility: {
          ...DEFAULT_CANVAS_TOOLBAR_VISIBILITY,
          sceneNodes: false,
        },
      },
    }
    const bundle = splitSceneToWorkspace(withChrome)
    expect(bundle.layout.sceneChrome?.sceneNodes?.minimized).toBe(false)
    expect(bundle.layout.sceneChrome?.sceneNodes?.sortMode).toBe('position')
    expect(bundle.layout.sceneChrome?.toolbarVisibility?.sceneNodes).toBe(false)

    const restored = mergeWorkspaceToScene(bundle)
    expect(restored?.sceneChrome?.sceneNodes?.minimized).toBe(false)
    expect(restored?.sceneChrome?.sceneNodes?.sortMode).toBe('position')
    expect(restored?.sceneChrome?.toolbarVisibility?.sceneNodes).toBe(false)
  })

  it('persiste câmera da cena no layout', () => {
    const withCamera = {
      ...demoCanvasScene,
      camera: { pan: { x: 120, y: -48 }, scale: 1.25 },
    }
    const bundle = splitSceneToWorkspace(withCamera)
    expect(bundle.layout.camera).toEqual({ pan: { x: 120, y: -48 }, scale: 1.25 })

    const restored = mergeWorkspaceToScene(bundle)
    expect(restored?.camera).toEqual({ pan: { x: 120, y: -48 }, scale: 1.25 })
  })

  it('valida bundle com versão e estrutura corretas', () => {
    const bundle = splitSceneToWorkspace(demoCanvasScene)
    expect(isWorkspaceBundleValid(bundle)).toBe(true)
    expect(isWorkspaceBundleEmpty(bundle)).toBe(false)
  })

  it('rejeita bundle inválido', () => {
    expect(isWorkspaceBundleValid({ logic: {}, layout: {}, graph: {} })).toBe(false)
    expect(
      mergeWorkspaceToScene({
        logic: { version: WORKSPACE_FORMAT_VERSION, nodes: {} },
        layout: { version: WORKSPACE_FORMAT_VERSION, width: 100, height: 100, nodes: {} },
        graph: { version: WORKSPACE_FORMAT_VERSION, connections: [] },
      }),
    ).toBeNull()
  })

  it('bundle vazio é considerado empty e merge retorna null', () => {
    const empty = {
      logic: { version: WORKSPACE_FORMAT_VERSION, nodes: {} },
      layout: { version: WORKSPACE_FORMAT_VERSION, width: 1120, height: 760, nodes: {} },
      graph: { version: WORKSPACE_FORMAT_VERSION, connections: [] },
    }
    expect(isWorkspaceBundleValid(empty)).toBe(false)
    expect(isWorkspaceBundleEmpty(empty as never)).toBe(true)
    expect(mergeWorkspaceToScene(empty as never)).toBeNull()
  })
})
