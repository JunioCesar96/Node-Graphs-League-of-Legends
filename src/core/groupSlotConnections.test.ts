import { describe, expect, it } from 'vitest'

import type { CanvasConnection, CanvasNode } from './canvasScene'
import {
  canConnectGroupSlots,
  createGroupDraftConnectionPath,
  findGroupSlotAtPoint,
  listGroupSlotEndpoints,
  resolveGroupConnectionPath,
  resolveGroupSlotCanvasPoint,
} from './groupSlotConnections'
import { groupHeaderSlotId, groupParameterSlotId } from './groupSchema'
import { makeVfxEmitterCanvasNode } from './groupTestFixtures'

function makeGroupNode(id: string, x: number, y: number): CanvasNode {
  return makeVfxEmitterCanvasNode({
    id,
    position: { x, y },
    groupViewActive: true,
    groupStructure: {
      groupType: 'VfxEmitterDefinitionData',
      groupName: 'Emitter',
      parameters: [
        {
          idParameter: 'Emitter01',
          nameParameter: 'color',
          typeParameter: 'vec4',
          defaultValue: '0.55,0.95,1,1',
          slotRules: { outputs: ['vec4', 'vec4list'], inputs: ['multiplyVec4'] },
          iconHint: null,
          sourcePath: { kind: 'parameter', parameterId: 'p-color' },
        },
      ],
      identification_codes: [],
    },
  })
}

describe('GroupSlotConnections', () => {
  it('lists header and parameter slot endpoints', () => {
    const node = makeGroupNode('a', 0, 0)
    const endpoints = listGroupSlotEndpoints(node)
    expect(endpoints.some((entry) => entry.kind === 'header' && entry.direction === 'output')).toBe(true)
    expect(endpoints.some((entry) => entry.slotId === groupParameterSlotId('Emitter01', 'output'))).toBe(true)
    expect(endpoints.some((entry) => entry.slotId === groupParameterSlotId('Emitter01', 'input'))).toBe(true)
  })

  it('allows vec4 output to multiplyVec4 input across nodes', () => {
    const from = {
      nodeId: 'a',
      slotId: 'out',
      direction: 'output' as const,
      types: ['vec4'],
      kind: 'parameter' as const,
    }
    const to = {
      nodeId: 'b',
      slotId: 'in',
      direction: 'input' as const,
      types: ['multiplyVec4'],
      kind: 'parameter' as const,
    }
    expect(canConnectGroupSlots(from, to)).toBe(true)
  })

  it('resolves canvas coordinates for Group slots', () => {
    const node = makeGroupNode('a', 100, 50)
    const outputSlot = groupParameterSlotId('Emitter01', 'output')
    const point = resolveGroupSlotCanvasPoint(node, outputSlot, 'output')
    expect(point).not.toBeNull()
    expect(point!.x).toBeGreaterThan(node.position.x)
    expect(point!.y).toBeGreaterThan(node.position.y)
  })

  it('finds nearest input slot at canvas point', () => {
    const node = makeGroupNode('a', 100, 50)
    const inputSlot = groupParameterSlotId('Emitter01', 'input')
    const target = resolveGroupSlotCanvasPoint(node, inputSlot, 'input')
    expect(target).not.toBeNull()

    const hit = findGroupSlotAtPoint([node], target!)
    expect(hit?.nodeId).toBe('a')
    expect(hit?.slotId).toBe(inputSlot)
    expect(hit?.direction).toBe('input')
  })

  it('builds SVG path between Group slots', () => {
    const fromNode = makeGroupNode('a', 80, 40)
    const toNode = makeGroupNode('b', 420, 120)
    const connection: CanvasConnection = {
      id: 'Group:a->b',
      fromNodeId: 'a',
      fromInternalStructureId: '__group__:out',
      toNodeId: 'b',
      routing: 'wireless',
      fromGroupSlotId: groupParameterSlotId('Emitter01', 'output'),
      toGroupSlotId: groupParameterSlotId('Emitter01', 'input'),
      fromGroupParameterId: 'Emitter01',
      toGroupParameterId: 'Emitter01',
    }

    const path = resolveGroupConnectionPath(connection, [fromNode, toNode])
    expect(path).not.toBeNull()
    expect(path!.d.startsWith('M ')).toBe(true)
  })

  it('creates draft path for in-progress Group link', () => {
    const d = createGroupDraftConnectionPath(10, 20, 200, 80)
    expect(d).toContain('M 10 20')
    expect(d).toContain('200 80')
  })

  it('matches header slot ids for VfxEmitterDefinitionData', () => {
    const node = makeGroupNode('a', 0, 0)
    const headerSlot = groupHeaderSlotId('VfxEmitterDefinitionData', 0)
    const point = resolveGroupSlotCanvasPoint(node, headerSlot, 'output')
    expect(point).not.toBeNull()
  })
})
