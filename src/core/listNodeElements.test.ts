import { describe, expect, it } from 'vitest'

import { demoCanvasScene } from '@/core/demoCanvasScene'
import {
  countElementDependencies,
  formatElementDependencyWarning,
  listNodeElements,
  listRemovableNodeElements,
} from '@/core/listNodeElements'

describe('listNodeElements', () => {
  it('combina parâmetros e internal structures na ordem parameters → structures', () => {
    const emitter = demoCanvasScene.nodes.find((n) => n.id === 'emitter-01')
    if (!emitter) {
      throw new Error('demo sem emitter-01')
    }

    const items = listNodeElements(emitter.node)
    const parameterCount = emitter.node.schema.parameters.length
    const structureCount = emitter.node.schema.internalStructures.length

    expect(items).toHaveLength(parameterCount + structureCount)
    expect(items.slice(0, parameterCount).every((item) => item.kind === 'parameter')).toBe(true)
    expect(items.slice(parameterCount).every((item) => item.kind === 'internalStructure')).toBe(true)
  })

  it('conta conexões de grafo para internal structure', () => {
    const connection = demoCanvasScene.connections[0]
    if (!connection) {
      throw new Error('demo sem conexões')
    }

    const count = countElementDependencies(
      demoCanvasScene,
      connection.fromNodeId,
      connection.fromInternalStructureId,
      'internalStructure',
    )

    expect(count).toBeGreaterThanOrEqual(1)
  })

  it('conta conexões para listEmbedSlot', () => {
    const connection = demoCanvasScene.connections[0]
    if (!connection) {
      throw new Error('demo sem conexões')
    }

    const count = countElementDependencies(
      demoCanvasScene,
      connection.fromNodeId,
      connection.fromInternalStructureId,
      'listEmbedSlot',
    )

    expect(count).toBeGreaterThanOrEqual(1)
  })

  it('conta vínculos parameter_value_links para parâmetro', () => {
    const emitter = demoCanvasScene.nodes.find((n) => n.id === 'emitter-01')
    if (!emitter) {
      throw new Error('demo sem emitter-01')
    }

    const linkedNode = {
      ...emitter.node,
      parameter_value_links: [['spawn-rate', 'lifetime']] as [string, string][],
    }

    const scene = {
      ...demoCanvasScene,
      nodes: demoCanvasScene.nodes.map((n) =>
        n.id === emitter.id ? { ...n, node: linkedNode } : n,
      ),
    }

    expect(countElementDependencies(scene, emitter.id, 'spawn-rate', 'parameter')).toBe(1)
    expect(countElementDependencies(scene, emitter.id, 'tint', 'parameter')).toBe(0)
  })

  it('exclui internal structures top-level da lista removível', () => {
    const emitter = demoCanvasScene.nodes.find((n) => n.id === 'emitter-01')
    if (!emitter) {
      throw new Error('demo sem emitter-01')
    }

    const removable = listRemovableNodeElements(emitter.node)
    expect(removable.some((item) => item.kind === 'internalStructure')).toBe(false)
    if (emitter.node.schema.internalStructures.length > 0) {
      expect(
        removable.length,
      ).toBeLessThan(
        emitter.node.schema.parameters.length + emitter.node.schema.internalStructures.length,
      )
    }
  })

  it('exclui parâmetros obrigatórios da lista removível', () => {
    const emitter = demoCanvasScene.nodes.find((n) => n.id === 'emitter-01')
    if (!emitter) {
      throw new Error('demo sem emitter-01')
    }

    const requiredId = emitter.node.schema.parameters[0]?.id
    if (!requiredId) {
      throw new Error('emitter-01 sem parâmetros')
    }

    const nodeWithRequired = {
      ...emitter.node,
      required_parameter: [requiredId],
      schema: {
        ...emitter.node.schema,
        required_parameter: [requiredId],
      },
    }

    const removable = listRemovableNodeElements(nodeWithRequired)
    expect(removable.some((item) => item.kind === 'parameter' && item.id === requiredId)).toBe(false)

    const otherParameterIds = emitter.node.schema.parameters
      .map((p) => p.id)
      .filter((id) => id !== requiredId)
    for (const id of otherParameterIds) {
      expect(removable.some((item) => item.kind === 'parameter' && item.id === id)).toBe(true)
    }
  })

  it('formata aviso de dependências apenas quando count > 0', () => {
    expect(formatElementDependencyWarning(0)).toBe('')
    expect(formatElementDependencyWarning(1)).toContain('1 conexão')
    expect(formatElementDependencyWarning(3)).toContain('3 conexões')
  })
})
