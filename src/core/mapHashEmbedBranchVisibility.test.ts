import { describe, expect, it } from 'vitest'

import type { CanvasScene } from '@/core/canvasScene'
import {
  collectDescendantNodeIds,
  computeCompactHiddenNodeIds,
  computeListModeCollapsedBodyNodeIds,
  computeMapHashEmbedHiddenNodeIds,
  computeMapHashEmbedListCollapsedNodeIds,
} from '@/core/compactElementBranchVisibility'
import { mapHashPointerSlotId } from '@/core/mapHashPointerSlots'
import { formatMapHashPointerString, parseMapHashPointerString } from '@/core/mapHashPointerValue'
import { listEmbedSlotId } from '@/core/listEmbedSlots'
import { listPointerSlotId } from '@/core/listPointerSlots'
import { mapHashEmbedSlotId } from '@/core/mapHashEmbedSlots'
import { formatMapHashEmbedString, parseMapHashEmbedString } from '@/core/mapHashEmbedValue'
import {
  elementViewKeyForListEmbed,
  elementViewKeyForListPointer,
  elementViewKeyForParameter,
  patchElementSelectedIndex,
  patchElementViewMode,
} from '@/core/elementViewState'
import type { NodeInstance } from '@/core/nodeSchema'

const PARAM_ID = 'param-entries'

function buildScene(node: NodeInstance): CanvasScene {
  const mapValue =
    node.values.find((v) => v.parameterId === PARAM_ID)?.value ??
    node.schema.parameters.find((p) => p.id === PARAM_ID)?.defaultValue ??
    ''
  const entries = parseMapHashEmbedString(mapValue)
  const slot0 = mapHashEmbedSlotId(PARAM_ID, entries[0]!.key)
  const slot1 = mapHashEmbedSlotId(PARAM_ID, entries[1]!.key)

  return {
    width: 800,
    height: 600,
    nodes: [
      {
        id: 'main',
        position: { x: 0, y: 0 },
        node,
      },
      { id: 'child-a', position: { x: 200, y: 0 }, node: childNode('child-a') },
      { id: 'child-b', position: { x: 400, y: 0 }, node: childNode('child-b') },
      {
        id: 'grandchild-b',
        position: { x: 600, y: 0 },
        node: childNode('grandchild-b'),
      },
    ],
    connections: [
      {
        id: 'link-a',
        fromNodeId: 'main',
        fromInternalStructureId: slot0,
        toNodeId: 'child-a',
      },
      {
        id: 'link-b',
        fromNodeId: 'main',
        fromInternalStructureId: slot1,
        toNodeId: 'child-b',
      },
      {
        id: 'link-b-chain',
        fromNodeId: 'child-b',
        fromInternalStructureId: 'child-b-out',
        toNodeId: 'grandchild-b',
      },
    ],
  }
}

function childNode(id: string): NodeInstance {
  return {
    id,
    schema: {
      id: 'child.schema',
      title: 'Child',
      parameters: [],
      internalStructures: [{ id: 'child-b-out', name: 'out', schemaId: 'x' }],
    },
    values: [],
  }
}

function mainNode(elementView: NodeInstance['elementView']): NodeInstance {
  return {
    id: 'main',
    schema: {
      id: 'main.schema',
      title: 'Main',
      parameters: [
        {
          id: PARAM_ID,
          name: 'entries',
          type: 'mapHashEmbed',
          defaultValue: '',
        },
      ],
      internalStructures: [],
    },
    values: [
      {
        parameterId: PARAM_ID,
        value: formatMapHashEmbedString([
          { key: '0xaaa', typeName: 'TypeA', schemaId: 'type-a' },
          { key: '0xbbb', typeName: 'TypeB', schemaId: 'type-b' },
        ]),
      },
    ],
    elementView,
  }
}

describe('mapHashEmbedBranchVisibility', () => {
  it('collectDescendantNodeIds percorre toda a cadeia de saída', () => {
    const scene = buildScene(mainNode({}))
    const descendants = collectDescendantNodeIds(scene, 'child-b')
    expect([...descendants].sort()).toEqual(['grandchild-b'])
  })

  it('modo compacto índice 0 oculta ramo da entrada 1 e descendentes', () => {
    const key = elementViewKeyForParameter(PARAM_ID)
    let node = mainNode({})
    node = patchElementViewMode(node, key, 'compact', 0)
    const hidden = computeMapHashEmbedHiddenNodeIds(buildScene(node))
    expect(hidden.has('child-a')).toBe(false)
    expect(hidden.has('child-b')).toBe(true)
    expect(hidden.has('grandchild-b')).toBe(true)
  })

  it('mudar índice compacto inverte ramos visíveis', () => {
    const key = elementViewKeyForParameter(PARAM_ID)
    let node = mainNode({})
    node = patchElementViewMode(node, key, 'compact', 0)
    node = patchElementSelectedIndex(node, key, 1)
    const hidden = computeMapHashEmbedHiddenNodeIds(buildScene(node))
    expect(hidden.has('child-a')).toBe(true)
    expect(hidden.has('child-b')).toBe(false)
    expect(hidden.has('grandchild-b')).toBe(false)
  })

  it('mapHashPointer compacto oculta ramo fora do índice', () => {
    const paramId = 'param-map'
    const key = elementViewKeyForParameter(paramId)
    const mapValue = formatMapHashPointerString([
      { key: '0xaaa', typeName: 'TypeA', schemaId: 'type-a' },
      { key: '0xbbb', typeName: 'TypeB', schemaId: 'type-b' },
    ])
    let node = mainNode({
      [key]: { mode: 'compact', selectedIndex: 0 },
    })
    node = {
      ...node,
      schema: {
        ...node.schema,
        parameters: [{ id: paramId, name: 'map', type: 'mapHashPointer', defaultValue: '' }],
      },
      values: [{ parameterId: paramId, value: mapValue }],
    }
    const entries = parseMapHashPointerString(mapValue)
    const scene: CanvasScene = {
      width: 800,
      height: 600,
      nodes: [
        { id: 'main', position: { x: 0, y: 0 }, node },
        { id: 'child-a', position: { x: 200, y: 0 }, node: childNode('child-a') },
        { id: 'child-b', position: { x: 400, y: 0 }, node: childNode('child-b') },
      ],
      connections: [
        {
          id: 'pa',
          fromNodeId: 'main',
          fromInternalStructureId: mapHashPointerSlotId(paramId, entries[0]!.key),
          toNodeId: 'child-a',
        },
        {
          id: 'pb',
          fromNodeId: 'main',
          fromInternalStructureId: mapHashPointerSlotId(paramId, entries[1]!.key),
          toNodeId: 'child-b',
        },
      ],
    }
    const hidden = computeCompactHiddenNodeIds(scene)
    expect(hidden.has('child-b')).toBe(true)
    expect(hidden.has('child-a')).toBe(false)
  })

  it('listEmbed compacto oculta slot fora do índice', () => {
    const blockId = 'list-embed-block'
    const key = elementViewKeyForListEmbed(blockId)
    const node: NodeInstance = {
      id: 'parent',
      schema: {
        id: 'parent.schema',
        title: 'Parent',
        parameters: [],
        listEmbed: [
          {
            id: blockId,
            title: 'Items',
            internalStructures: [
              { id: 'cat-a', name: 'TypeA', schemaId: 'schema-a' },
              { id: 'cat-b', name: 'TypeB', schemaId: 'schema-b' },
            ],
            slots: [
              { id: listEmbedSlotId(blockId, 0), name: 'TypeA', schemaId: 'schema-a' },
              { id: listEmbedSlotId(blockId, 1), name: 'TypeB', schemaId: 'schema-b' },
            ],
          },
        ],
        internalStructures: [],
      },
      values: [],
      elementView: { [key]: { mode: 'compact', selectedIndex: 0 } },
    }
    const scene: CanvasScene = {
      width: 800,
      height: 600,
      nodes: [
        { id: 'parent', position: { x: 0, y: 0 }, node },
        { id: 'child-a', position: { x: 200, y: 0 }, node: childNode('child-a') },
        { id: 'child-b', position: { x: 400, y: 0 }, node: childNode('child-b') },
      ],
      connections: [
        {
          id: 'la',
          fromNodeId: 'parent',
          fromInternalStructureId: listEmbedSlotId(blockId, 0),
          toNodeId: 'child-a',
        },
        {
          id: 'lb',
          fromNodeId: 'parent',
          fromInternalStructureId: listEmbedSlotId(blockId, 1),
          toNodeId: 'child-b',
        },
      ],
    }
    const hidden = computeCompactHiddenNodeIds(scene)
    expect(hidden.has('child-a')).toBe(false)
    expect(hidden.has('child-b')).toBe(true)
  })

  it('listPointer compacto oculta slots fora do índice', () => {
    const blockId = 'list-pointer-block'
    const catalogId = 'legacy-catalog-slot-5'
    const key = elementViewKeyForListPointer(blockId)
    const node: NodeInstance = {
      id: 'parent',
      schema: {
        id: 'parent.schema',
        title: 'Parent',
        parameters: [],
        listPointer: [
          {
            id: blockId,
            title: 'complexEmitterDefinitionData',
            internalStructures: [
              { id: 'cat-0', name: 'TypeA', schemaId: 'schema-a' },
              { id: catalogId, name: 'TypeB', schemaId: 'schema-b' },
            ],
            slots: [
              { id: listPointerSlotId(blockId, 0), name: 'TypeA', schemaId: 'schema-a' },
              { id: listPointerSlotId(blockId, 1), name: 'TypeB', schemaId: 'schema-b' },
            ],
          },
        ],
        internalStructures: [],
      },
      values: [],
      elementView: { [key]: { mode: 'compact', selectedIndex: 0 } },
    }
    const scene: CanvasScene = {
      width: 800,
      height: 600,
      nodes: [
        { id: 'parent', position: { x: 0, y: 0 }, node },
        { id: 'child-a', position: { x: 200, y: 0 }, node: childNode('child-a') },
        { id: 'child-b', position: { x: 400, y: 0 }, node: childNode('child-b') },
      ],
      connections: [
        {
          id: 'la',
          fromNodeId: 'parent',
          fromInternalStructureId: listPointerSlotId(blockId, 0),
          toNodeId: 'child-a',
        },
        {
          id: 'lb',
          fromNodeId: 'parent',
          fromInternalStructureId: catalogId,
          toNodeId: 'child-b',
        },
      ],
    }
    const hidden = computeCompactHiddenNodeIds(scene)
    expect(hidden.has('child-a')).toBe(false)
    expect(hidden.has('child-b')).toBe(true)
  })

  it('modo lista não oculta ramos e marca corpo retraído na cadeia', () => {
    const node = mainNode({
      [elementViewKeyForParameter(PARAM_ID)]: { mode: 'list' },
    })
    const scene = buildScene(node)
    expect(computeMapHashEmbedHiddenNodeIds(scene).size).toBe(0)
    const collapsed = computeListModeCollapsedBodyNodeIds(scene)
    expect(collapsed.has('child-a')).toBe(true)
    expect(collapsed.has('child-b')).toBe(true)
    expect(collapsed.has('grandchild-b')).toBe(true)
  })
})
