import { describe, expect, it } from 'vitest'

import {
  applyBlockSlashCommandToScene,
  collectBlockSlashCommandNodeIds,
  extractBlockSlashCommandFragment,
  remapWorkspaceBundleIds,
} from '@/core/blockSlashCommand'
import {
  makeVfxEmitterCanvasNode,
  makeVfxEmitterScene,
  vfxEmitterSampleParameters,
} from '@/core/blockTestFixtures'
import { splitSceneToWorkspace } from '@/core/workspacePersistence'

describe('blockSlashCommand', () => {
  it('captura subgrafo com posição normalizada no root', () => {
    const blockNode = makeVfxEmitterCanvasNode({
      blockViewActive: true,
      blockStructure: {
        blockType: 'VfxEmitterDefinitionData',
        blockName: 'Emitter',
        parameters: vfxEmitterSampleParameters,
        identification_codes: [],
      },
      position: { x: 200, y: 150 },
    })

    const scene = makeVfxEmitterScene(blockNode)
    const extracted = extractBlockSlashCommandFragment(scene, 'n-vfx', 'EmitterPreset')

    expect(extracted.ok).toBe(true)
    if (!extracted.ok) {
      return
    }

    expect(extracted.document.command).toBe('EmitterPreset')
    expect(extracted.document.payload.layout.nodes['n-vfx']?.position).toEqual({ x: 0, y: 0 })
  })

  it('inclui apenas o nó raiz quando não há ligações', () => {
    const scene = makeVfxEmitterScene()
    const ids = collectBlockSlashCommandNodeIds(scene, 'n-vfx')
    expect([...ids]).toEqual(['n-vfx'])
  })

  it('aplica slash command com novos ids na cena destino', () => {
    const blockNode = makeVfxEmitterCanvasNode({
      blockViewActive: true,
      blockStructure: {
        blockType: 'VfxEmitterDefinitionData',
        blockName: 'Emitter',
        parameters: vfxEmitterSampleParameters,
        identification_codes: [],
      },
    })
    const scene = makeVfxEmitterScene(blockNode)
    const extracted = extractBlockSlashCommandFragment(scene, 'n-vfx', 'SpawnTest')
    expect(extracted.ok).toBe(true)
    if (!extracted.ok) {
      return
    }

    const targetScene = makeVfxEmitterScene()
    const applied = applyBlockSlashCommandToScene(targetScene, extracted.document, { x: 40, y: 60 })

    expect(applied.ok).toBe(true)
    if (!applied.ok) {
      return
    }

    expect(applied.scene.nodes.length).toBe(2)
    expect(applied.rootNodeId).not.toBe('n-vfx')
    const spawned = applied.scene.nodes.find((node) => node.id === applied.rootNodeId)
    expect(spawned?.blockStructure?.blockName).toBe('Emitter')
    expect(spawned?.blockViewActive).toBe(true)
    expect(spawned?.position).toEqual({ x: 40, y: 60 })
  })

  it('remapeia ids do workspace bundle', () => {
    const blockNode = makeVfxEmitterCanvasNode({
      blockViewActive: true,
      blockStructure: {
        blockType: 'VfxEmitterDefinitionData',
        blockName: 'Emitter',
        parameters: vfxEmitterSampleParameters,
        identification_codes: [],
      },
    })
    const bundle = splitSceneToWorkspace(makeVfxEmitterScene(blockNode))
    const remapped = remapWorkspaceBundleIds(bundle, [], 'n-vfx')

    expect(remapped).not.toBeNull()
    expect(remapped?.rootNodeId).not.toBe('n-vfx')
    expect(Object.keys(remapped?.bundle.logic.nodes ?? {})).toHaveLength(1)
  })
})
