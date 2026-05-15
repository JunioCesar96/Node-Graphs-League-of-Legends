import { describe, expect, it } from 'vitest'

import { staticCanvasScene } from '@/core/canvasScene'
import { parseSceneDocument, serializeScene } from '@/core/leagueBinScene'

describe('leagueBinScene', () => {
  it('faz round-trip completo sobre a demo estática', () => {
    const doc = serializeScene(staticCanvasScene)
    const roundTrip = parseSceneDocument(doc)

    expect(roundTrip?.nodes.length).toBe(staticCanvasScene.nodes.length)
    expect(roundTrip?.connections.length).toBe(staticCanvasScene.connections.length)
    expect(roundTrip?.nodes[0]?.node.schema.id).toBe(staticCanvasScene.nodes[0]?.node.schema.id)
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
