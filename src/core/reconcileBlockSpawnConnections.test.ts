import { describe, expect, it } from 'vitest'

import { blockParameterSlotId } from './blockSchema'
import type { CanvasConnection, CanvasNode } from './canvasScene'
import { buildBlockWirelessDisplayByNode } from './blockConnectionDisplay'
import { findConnectionsForBlockOutputSlot } from './blockSlotConnections'
import { listEmbedSlotId } from './listEmbedSlots'
import { mergeBlockHierarchyIntoScene } from './blockHierarchySpawn'
import { reconcileBlockSpawnConnections } from './reconcileBlockSpawnConnections'

function makeBlockNode(
  id: string,
  structure: NonNullable<CanvasNode['blockStructure']>,
): CanvasNode {
  return {
    id,
    node: {
      schema: { id: 'schema', title: structure.blockType, parameters: [] },
      values: [],
    },
    position: { x: 0, y: 0 },
    blockStructure: structure,
    blockViewActive: true,
  }
}

describe('reconcileBlockSpawnConnections', () => {
  it('preenche fromBlockParameterId em ligações list[embed] indexadas', () => {
    const birthColorId = 'birthColor'
    const indexedSlot = listEmbedSlotId(birthColorId, 0)

    const parent = makeBlockNode('vfx-emitter-definition-data__root', {
      blockType: 'VfxEmitterDefinitionData',
      blockName: 'Emitter',
      parameters: [
        {
          idParameter: birthColorId,
          nameParameter: 'birthColor',
          typeParameter: 'ValueColor',
          defaultValue: '',
          listParameter: true,
          slotRules: { outputs: ['ValueColor'] },
          sourcePath: {
            kind: 'embedChild',
            embedId: 'leb-1',
            slotId: indexedSlot,
            childParameterId: 'child-1',
          },
        },
      ],
      identification_codes: [],
    })

    const child = makeBlockNode('value-color__root-birth-color-slot-0', {
      blockType: 'ValueColor',
      blockName: 'ValueColor',
      parameters: [],
      identification_codes: [],
      appearance: {
        color: '#40ff56',
        headerSlots: ['in[birthColor]', 'out[ValueColorPreview]'],
        parentBlockField: 'birthColor',
      },
    })

    const rawConnection: CanvasConnection = {
      id: 'block:parent->child',
      fromNodeId: parent.id,
      fromInternalStructureId: 'legacy-internal',
      toNodeId: child.id,
      routing: 'wireless',
      fromBlockSlotId: indexedSlot,
      toBlockSlotId: 'block-header:ValueColor:0:birthColor',
    }

    const reconciled = reconcileBlockSpawnConnections([parent, child], [rawConnection])

    expect(reconciled).toHaveLength(1)
    expect(reconciled[0]?.fromBlockParameterId).toBe(birthColorId)
    expect(reconciled[0]?.fromInternalStructureId).toBe(`__block__:${indexedSlot}`)

    const displayByNode = buildBlockWirelessDisplayByNode(reconciled, [parent, child])
    expect(displayByNode.get(parent.id)?.slots.get(blockParameterSlotId(birthColorId, 'output'))).toBeDefined()
    expect(
      findConnectionsForBlockOutputSlot(
        { connections: reconciled, nodes: [parent, child] },
        parent.id,
        blockParameterSlotId(birthColorId, 'output'),
      ),
    ).toHaveLength(1)
  })

  it('cria ligação em falta entre pai e filho após merge do spawn', () => {
    const dynamicsId = 'dynamics'
    const parent = makeBlockNode('value-color__root-birth-color-slot-0', {
      blockType: 'ValueColor',
      blockName: 'ValueColor',
      parameters: [
        {
          idParameter: dynamicsId,
          nameParameter: 'dynamics',
          typeParameter: 'VfxAnimatedColorVariableData',
          defaultValue: '',
          slotRules: { outputs: ['VfxAnimatedColorVariableData'] },
          sourcePath: {
            kind: 'pointerChild',
            pointerId: 'ptr-1',
            slotId: 'ptr-slot',
          },
        },
      ],
      identification_codes: [],
    })

    const child = makeBlockNode('vfx-animated-color-variable-data__root-birth-color-slot-0-dynamics', {
      blockType: 'VfxAnimatedColorVariableData',
      blockName: 'VfxAnimatedColorVariableData',
      parameters: [],
      identification_codes: [],
      appearance: {
        color: '#40ff56',
        headerSlots: ['in[dynamics]', 'out[VfxAnimatedColorVariableDataPreview]'],
        parentBlockField: 'dynamics',
      },
    })

    const scene = {
      width: 1200,
      height: 800,
      nodes: [parent],
      connections: [],
    }

    const merged = mergeBlockHierarchyIntoScene(scene, {
      rootNodeId: child.id,
      nodes: [child],
      connections: [],
    })

    expect(merged.connections).toHaveLength(1)
    expect(merged.connections[0]?.fromNodeId).toBe(parent.id)
    expect(merged.connections[0]?.toNodeId).toBe(child.id)
    expect(merged.connections[0]?.fromBlockSlotId).toBe(blockParameterSlotId(dynamicsId, 'output'))
  })
})
