import { describe, expect, it } from 'vitest'

import { staticCanvasScene } from '@/core/canvasScene'
import { DEFAULT_CANVAS_TOOLBAR_VISIBILITY } from '@/core/canvasToolbarVisibility'
import { parseSceneDocument, serializeScene } from '@/core/leagueBinScene'

describe('leagueBinScene', () => {
  it('faz round-trip completo sobre a demo estática', () => {
    const doc = serializeScene(staticCanvasScene)
    expect(doc.version).toBe(2)
    const roundTrip = parseSceneDocument(doc)

    expect(roundTrip?.nodes.length).toBe(staticCanvasScene.nodes.length)
    expect(roundTrip?.connections.length).toBe(staticCanvasScene.connections.length)
    expect(roundTrip?.nodes[0]?.node.schema.id).toBe(staticCanvasScene.nodes[0]?.node.schema.id)
  })

  it('export v2 preserva apresentação, câmera e sceneChrome', () => {
    const connection = staticCanvasScene.connections[0]
    const nodeId = staticCanvasScene.nodes[0]!.id
    const scene = {
      ...staticCanvasScene,
      camera: { pan: { x: 10, y: 20 }, scale: 0.9 },
      sceneChrome: {
        sceneNodes: { minimized: true, sortMode: 'type' as const },
        toolbarVisibility: DEFAULT_CANVAS_TOOLBAR_VISIBILITY,
      },
      nodes: staticCanvasScene.nodes.map((n) =>
        n.id === nodeId
          ? {
              ...n,
              bodyCollapsed: true,
              cardBodyLayout: 'freeform' as const,
              displayLabel: 'Test',
            }
          : n,
      ),
      ...(connection
        ? {
            connections: staticCanvasScene.connections.map((c) =>
              c.id === connection.id ? { ...c, routing: 'rigid' as const } : c,
            ),
            compactRoutingBackups: { [connection.id]: 'flex' },
          }
        : {}),
    }

    const doc = serializeScene(scene)
    expect(doc.version).toBe(2)
    expect(doc.camera).toEqual(scene.camera)
    expect(doc.sceneChrome?.sceneNodes?.sortMode).toBe('type')

    const stored = doc.nodes.find((n) => n.id === nodeId)
    expect(stored?.presentation.bodyCollapsed).toBe(true)
    expect(stored?.presentation.cardBodyLayout).toBe('freeform')
    expect(stored?.presentation.displayLabel).toBe('Test')

    const roundTrip = parseSceneDocument(doc)
    const restored = roundTrip?.nodes.find((n) => n.id === nodeId)
    expect(restored?.bodyCollapsed).toBe(true)
    expect(restored?.cardBodyLayout).toBe('freeform')
    expect(restored?.displayLabel).toBe('Test')
    expect(roundTrip?.camera).toEqual(scene.camera)
    expect(roundTrip?.sceneChrome?.sceneNodes?.minimized).toBe(true)
    if (connection) {
      expect(roundTrip?.connections.find((c) => c.id === connection.id)?.routing).toBe('rigid')
      expect(roundTrip?.compactRoutingBackups?.[connection.id]).toBe('flex')
    }
  })

  it('import v1 legado assume freeform por nó', () => {
    const v1 = {
      format: 'node-graphs-lol',
      version: 1,
      width: staticCanvasScene.width,
      height: staticCanvasScene.height,
      connections: staticCanvasScene.connections,
      nodes: staticCanvasScene.nodes.map((n) => ({
        id: n.id,
        position: n.position,
        node: {
          id: n.node.id,
          schema: n.node.schema,
          values: n.node.values,
        },
      })),
    }

    const restored = parseSceneDocument(v1)
    expect(restored?.nodes[0]?.cardBodyLayout).toBe('freeform')
    expect(restored?.nodes[0]?.cardSectionExpanded?.parameters).toBe(true)
  })

  it('preserva hashString quando referencia um parâmetro string válido', () => {
    const base = staticCanvasScene.nodes.find((n) => n.id === 'emitter-01')
    if (!base) {
      throw new Error('demo sem emitter-01')
    }

    const stringParameter = base.node.schema.parameters.find((p) => p.type === 'string')
    if (!stringParameter) {
      throw new Error('emitter-01 sem parâmetro string')
    }

    const scene = {
      ...staticCanvasScene,
      nodes: staticCanvasScene.nodes.map((n) =>
        n.id === base.id ? { ...n, node: { ...n.node, hashString: stringParameter.id } } : n,
      ),
    }

    const doc = serializeScene(scene)
    const roundTrip = parseSceneDocument(doc)
    const restored = roundTrip?.nodes.find((n) => n.id === base.id)

    expect(restored?.node.hashString).toBe(stringParameter.id)
  })

  it('rejeita JSON inválido', () => {
    expect(parseSceneDocument({ hello: true })).toBeNull()
  })
})
