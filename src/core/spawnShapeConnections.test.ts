import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

import { codeToBlockScene } from './codeToBlockScene'
import { schemaRegistry } from './nodeStructureRegistry'

describe('codeToBlockScene SpawnShape com múltiplos VfxSystemDefinitionData', () => {
  it('liga SpawnShape ao tipo correcto (VfxShapeSphere vs VfxShapeCylinder) por emissor', () => {
    const ritual = readFileSync('_codigo 2 com 2 VFXSDD.md', 'utf8')
    const result = codeToBlockScene(ritual, schemaRegistry)
    expect(result.ok).toBe(true)
    if (!result.ok) {
      return
    }

    const scene = result.scene
    const shapes = scene.nodes.filter((node) =>
      node.blockStructure?.blockType?.startsWith('VfxShape'),
    )
    const shapesWithoutConn = shapes.filter(
      (shape) => !scene.connections.some((connection) => connection.toNodeId === shape.id),
    )

    expect(shapes.length).toBeGreaterThan(0)
    expect(shapesWithoutConn).toEqual([])

    const fireSphere = shapes.find((shape) =>
      shape.id.includes('fire-hand-extension') && shape.blockStructure?.blockType === 'VfxShapeSphere',
    )
    expect(fireSphere).toBeDefined()

    const parentConn = scene.connections.find((connection) => connection.toNodeId === fireSphere!.id)
    expect(parentConn).toBeDefined()
    const emitter = scene.nodes.find((node) => node.id === parentConn!.fromNodeId)
    const spawnParam = emitter?.blockStructure?.parameters.find(
      (param) => param.nameParameter === 'SpawnShape',
    )
    expect(spawnParam?.typeParameter).toBe('VfxShapeSphere')
  })
})
