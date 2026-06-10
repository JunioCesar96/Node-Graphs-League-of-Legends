import { describe, expect, it } from 'vitest'

import {
  makeVfxEmitterCanvasNode,
  makeVfxEmitterScene,
  vfxEmitterSampleParameters,
  VFX_EMITTER_COLOR_TOKEN,
} from '@/core/blockTestFixtures'
import {
  makeVfxEmitterCanvasNode as makeGroupCanvasNode,
  makeVfxEmitterScene as makeGroupScene,
  vfxEmitterSampleParameters as groupSampleParameters,
  VFX_EMITTER_COLOR_TOKEN as GROUP_COLOR_TOKEN,
} from '@/core/groupTestFixtures'
import { blockParameterSlotId } from '@/core/blockSchema'
import { demoCanvasScene } from '@/core/demoCanvasScene'
import { DEFAULT_CANVAS_TOOLBAR_VISIBILITY } from '@/core/canvasToolbarVisibility'
import { parseSceneDocument, serializeScene } from '@/core/leagueBinScene'

describe('leagueBinScene', () => {
  it('faz round-trip completo sobre a demo estática', () => {
    const doc = serializeScene(demoCanvasScene)
    expect(doc.version).toBe(2)
    const roundTrip = parseSceneDocument(doc)

    expect(roundTrip?.nodes.length).toBe(demoCanvasScene.nodes.length)
    expect(roundTrip?.connections.length).toBe(demoCanvasScene.connections.length)
    expect(roundTrip?.nodes[0]?.node.schema.id).toBe(demoCanvasScene.nodes[0]?.node.schema.id)
  })

  it('export v2 preserva apresentação, câmera e sceneChrome', () => {
    const connection = demoCanvasScene.connections[0]
    const nodeId = demoCanvasScene.nodes[0]!.id
    const scene = {
      ...demoCanvasScene,
      camera: { pan: { x: 10, y: 20 }, scale: 0.9 },
      sceneChrome: {
        sceneNodes: { minimized: true, sortMode: 'type' as const },
        toolbarVisibility: DEFAULT_CANVAS_TOOLBAR_VISIBILITY,
      },
      nodes: demoCanvasScene.nodes.map((n) =>
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
            connections: demoCanvasScene.connections.map((c) =>
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
      width: demoCanvasScene.width,
      height: demoCanvasScene.height,
      connections: demoCanvasScene.connections,
      nodes: demoCanvasScene.nodes.map((n) => ({
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
    const base = demoCanvasScene.nodes.find((n) => n.id === 'emitter-01')
    if (!base) {
      throw new Error('demo sem emitter-01')
    }

    const stringParameter = base.node.schema.parameters.find((p) => p.type === 'string')
    if (!stringParameter) {
      throw new Error('emitter-01 sem parâmetro string')
    }

    const scene = {
      ...demoCanvasScene,
      nodes: demoCanvasScene.nodes.map((n) =>
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

  it('exporta blocks[] lean sem identification_codes e restaura BlockCard', () => {
    const canvasNode = makeVfxEmitterCanvasNode({
      blockViewActive: true,
      blockStructure: {
        blockType: 'VfxEmitterDefinitionData',
        blockName: 'Emitter',
        parameters: vfxEmitterSampleParameters,
        identification_codes: [VFX_EMITTER_COLOR_TOKEN],
      },
      node: {
        ...makeVfxEmitterCanvasNode().node,
        values: [
          { parameterId: 'p-color', value: VFX_EMITTER_COLOR_TOKEN },
          { parameterId: 'p-lifetime', value: '1.15' },
          { parameterId: 'p-texture', value: 'ASSETS/Characters/Brand/Skins/Base/Particles/spark_soft.tex' },
        ],
      },
    })
    const scene = makeVfxEmitterScene(canvasNode)

    const doc = serializeScene(scene)
    expect(doc.blocks).toHaveLength(1)
    expect(doc.blocks?.[0]).toMatchObject({
      nodeId: 'n-vfx',
      type: 'VfxEmitterDefinitionData',
      name: 'Emitter',
    })
    expect(doc.blocks?.[0]?.parameters[0]).toMatchObject({
      id: 'Emitter01',
      source: { kind: 'parameter', parameterId: 'p-color' },
      name: 'color',
    })
    expect(JSON.stringify(doc.blocks)).not.toContain('identification_codes')
    expect(JSON.stringify(doc.blocks)).not.toContain('_blockType&')

    const roundTrip = parseSceneDocument(doc)
    const restored = roundTrip?.nodes.find((node) => node.id === 'n-vfx')
    expect(restored?.blockViewActive).toBe(true)
    expect(restored?.blockStructure?.blockType).toBe('VfxEmitterDefinitionData')
    expect(restored?.blockStructure?.parameters).toHaveLength(3)
    expect(restored?.blockStructure?.identification_codes[0]).toContain('Emitter01')
  })

  it('exporta groups[] lean sem identification_codes e restaura GroupCard', () => {
    const canvasNode = makeGroupCanvasNode({
      groupViewActive: true,
      groupStructure: {
        groupType: 'VfxEmitterDefinitionData',
        groupName: 'Emitter',
        parameters: groupSampleParameters,
        identification_codes: [GROUP_COLOR_TOKEN],
      },
      node: {
        ...makeGroupCanvasNode().node,
        values: [
          { parameterId: 'p-color', value: GROUP_COLOR_TOKEN },
          { parameterId: 'p-lifetime', value: '1.15' },
          { parameterId: 'p-texture', value: 'ASSETS/Characters/Brand/Skins/Base/Particles/spark_soft.tex' },
        ],
      },
    })
    const scene = makeGroupScene(canvasNode)

    const doc = serializeScene(scene)
    expect(doc.groups).toHaveLength(1)
    expect(doc.groups?.[0]).toMatchObject({
      nodeId: 'n-vfx',
      type: 'VfxEmitterDefinitionData',
      name: 'Emitter',
    })
    expect(JSON.stringify(doc.groups)).not.toContain('identification_codes')
    expect(JSON.stringify(doc.groups)).not.toContain('_groupType&')

    const roundTrip = parseSceneDocument(doc)
    const restored = roundTrip?.nodes.find((node) => node.id === 'n-vfx')
    expect(restored?.groupViewActive).toBe(true)
    expect(restored?.groupStructure?.groupType).toBe('VfxEmitterDefinitionData')
    expect(restored?.groupStructure?.parameters).toHaveLength(3)
  })

  it('preserva ligações entre slots de bloco', () => {
    const fromNode = makeVfxEmitterCanvasNode({
      id: 'from',
      blockViewActive: true,
      blockStructure: {
        blockType: 'VfxEmitterDefinitionData',
        blockName: 'Emitter',
        parameters: vfxEmitterSampleParameters.slice(0, 1),
        identification_codes: [VFX_EMITTER_COLOR_TOKEN],
      },
    })
    const toNode = makeVfxEmitterCanvasNode({
      id: 'to',
      position: { x: 420, y: 80 },
      blockViewActive: true,
      blockStructure: {
        blockType: 'VfxEmitterDefinitionData',
        blockName: 'EmitterB',
        parameters: vfxEmitterSampleParameters.slice(1, 2),
        identification_codes: [],
      },
    })
    const scene = {
      ...makeVfxEmitterScene(fromNode),
      nodes: [fromNode, toNode],
      connections: [
        {
          id: 'block-link',
          fromNodeId: 'from',
          fromInternalStructureId: '__block__:block-param:Emitter01:output',
          toNodeId: 'to',
          fromBlockSlotId: blockParameterSlotId('Emitter01', 'output'),
          fromBlockParameterId: 'Emitter01',
          toBlockSlotId: blockParameterSlotId('Emitter02', 'input'),
          toBlockParameterId: 'Emitter02',
          routing: 'wireless' as const,
        },
      ],
    }

    const doc = serializeScene(scene)
    const roundTrip = parseSceneDocument(doc)
    const connection = roundTrip?.connections.find((entry) => entry.id === 'block-link')

    expect(connection?.fromBlockSlotId).toBe(blockParameterSlotId('Emitter01', 'output'))
    expect(connection?.toBlockSlotId).toBe(blockParameterSlotId('Emitter02', 'input'))
    expect(connection?.routing).toBe('wireless')
  })

  it('rejeita blocks[] com nodeId inexistente', () => {
    const doc = serializeScene(demoCanvasScene)
    const invalid = {
      ...doc,
      blocks: [
        {
          nodeId: 'missing-node',
          type: 'VfxEmitterDefinitionData',
          name: 'Emitter',
          parameters: [],
        },
      ],
    }

    expect(parseSceneDocument(invalid)).toBeNull()
  })

  it('exporta labels[] lean e restaura LabelCard', () => {
    const parent = makeVfxEmitterCanvasNode({
      id: 'n-parent',
      blockViewActive: true,
      blockStructure: {
        blockType: 'VfxEmitterDefinitionData',
        blockName: 'Emitter',
        parameters: vfxEmitterSampleParameters,
        identification_codes: [VFX_EMITTER_COLOR_TOKEN],
      },
    })
    const labelNode = makeVfxEmitterCanvasNode({
      id: 'n-label',
      position: { x: 520, y: 80 },
      labelViewActive: true,
      labelStructure: {
        labelName: 'Teste',
        color: '#f5d000',
        parentBlockNodeId: 'n-parent',
        catalogBlockType: 'VfxEmitterDefinitionData',
        parameters: [
          { parameterId: 'Emitter01' },
          { parameterId: 'Emitter02', hiddenInParent: true },
        ],
      },
    })
    const scene = {
      ...makeVfxEmitterScene(parent),
      nodes: [parent, labelNode],
    }

    const doc = serializeScene(scene)
    expect(doc.labels).toHaveLength(1)
    expect(doc.labels?.[0]).toMatchObject({
      nodeId: 'n-label',
      labelName: 'Teste',
      color: '#f5d000',
      parentBlockNodeId: 'n-parent',
      catalogBlockType: 'VfxEmitterDefinitionData',
    })

    const stored = doc.nodes.find((node) => node.id === 'n-label')
    expect(stored?.presentation.labelViewActive).toBe(true)

    const roundTrip = parseSceneDocument(doc)
    const restored = roundTrip?.nodes.find((node) => node.id === 'n-label')
    expect(restored?.labelViewActive).toBe(true)
    expect(restored?.labelStructure).toMatchObject({
      labelName: 'Teste',
      color: '#f5d000',
      parentBlockNodeId: 'n-parent',
      parameters: [
        { parameterId: 'Emitter01' },
        { parameterId: 'Emitter02', hiddenInParent: true },
      ],
    })
  })

  it('rejeita labels[] com nodeId inexistente', () => {
    const doc = serializeScene(demoCanvasScene)
    const invalid = {
      ...doc,
      labels: [
        {
          nodeId: 'missing-label',
          labelName: 'Teste',
          color: '#f5d000',
          parentBlockNodeId: 'n-vfx',
          parameters: [],
        },
      ],
    }

    expect(parseSceneDocument(invalid)).toBeNull()
  })
})
