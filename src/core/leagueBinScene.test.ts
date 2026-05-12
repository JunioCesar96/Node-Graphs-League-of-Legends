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

  it('rejeita JSON inválido', () => {
    expect(parseSceneDocument({ hello: true })).toBeNull()
  })
})
