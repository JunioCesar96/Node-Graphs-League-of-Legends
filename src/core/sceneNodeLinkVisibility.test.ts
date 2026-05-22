import { describe, expect, it } from 'vitest'

import type { CanvasConnection, CanvasNode, CanvasScene } from '@/core/canvasScene'
import {
  applySceneHiddenToNodeIds,
  applyShowOnlyNodeIds,
  collectIncomingSlotBranchNodeIds,
  collectLinkVisibilityVisibleIds,
  collectLinkedChildNodeIds,
  collectNodeLinkBranchIds,
  collectSlotSubtreeNodeIds,
  reapplyLinkVisibilityFilter,
  resetAllNodesSceneVisibility,
} from '@/core/sceneNodeLinkVisibility'

function stubNode(id: string): CanvasNode {
  return {
    id,
    position: { x: 0, y: 0 },
    node: {
      schema: {
        id: `schema-${id}`,
        title: id,
        parameters: [],
        internalStructures: [],
      },
      values: [],
    },
  }
}

function connection(
  fromNodeId: string,
  fromInternalStructureId: string,
  toNodeId: string,
): CanvasConnection {
  return {
    id: `${fromNodeId}:${fromInternalStructureId}->${toNodeId}`,
    fromNodeId,
    fromInternalStructureId,
    toNodeId,
    routing: 'wireless',
  }
}

function sceneWithConnections(
  nodeIds: readonly string[],
  connections: readonly CanvasConnection[],
): CanvasScene {
  return {
    nodes: nodeIds.map((id) => stubNode(id)),
    connections: [...connections],
  }
}

describe('collectLinkedChildNodeIds', () => {
  it('devolve descendentes transitivos sem o pai (A→B→C)', () => {
    const scene = sceneWithConnections(
      ['a', 'b', 'c'],
      [
        connection('a', 'out-a', 'b'),
        connection('b', 'out-b', 'c'),
      ],
    )

    expect(collectLinkedChildNodeIds(scene, 'a')).toEqual(new Set(['b', 'c']))
    expect(collectLinkedChildNodeIds(scene, 'b')).toEqual(new Set(['c']))
  })

  it('devolve vazio quando não há ligações de saída', () => {
    const scene = sceneWithConnections(['leaf'], [])

    expect(collectLinkedChildNodeIds(scene, 'leaf')).toEqual(new Set())
  })
})

describe('applySceneHiddenToNodeIds', () => {
  it('oculta apenas os ids indicados', () => {
    const scene = sceneWithConnections(
      ['parent', 'child'],
      [connection('parent', 'out', 'child')],
    )

    const next = applySceneHiddenToNodeIds(scene, new Set(['child']), true)

    expect(next.nodes.find((n) => n.id === 'parent')?.sceneHidden).toBeUndefined()
    expect(next.nodes.find((n) => n.id === 'child')?.sceneHidden).toBe(true)
    expect(next.linkVisibilityFilter).toBeUndefined()
  })
})

describe('collectNodeLinkBranchIds', () => {
  it('percorre ancestrais e descendentes (cadeia A-B-C)', () => {
    const scene = sceneWithConnections(
      ['a', 'b', 'c'],
      [
        connection('a', 'out-a', 'b'),
        connection('b', 'out-b', 'c'),
      ],
    )

    expect(collectNodeLinkBranchIds(scene, 'b')).toEqual(new Set(['a', 'b', 'c']))
  })

  it('exclui ramos paralelos (outros emitters do Vfx)', () => {
    const scene = sceneWithConnections(
      ['main', 'vfx', 'e1', 'e2', 'vf1', 'vf2'],
      [
        connection('main', 'out', 'vfx'),
        connection('vfx', 'slot-0', 'e1'),
        connection('vfx', 'slot-1', 'e2'),
        connection('e1', 'rate', 'vf1'),
        connection('e2', 'rate', 'vf2'),
      ],
    )

    expect(collectNodeLinkBranchIds(scene, 'vf1')).toEqual(
      new Set(['main', 'vfx', 'e1', 'vf1']),
    )
  })

  it('segue cadeia profunda (emitter → ValueFloat → anim → prob)', () => {
    const scene = sceneWithConnections(
      ['main', 'vfx', 'emitter', 'vf', 'anim', 'prob'],
      [
        connection('main', 'out', 'vfx'),
        connection('vfx', 'list', 'emitter'),
        connection('emitter', 'rate', 'vf'),
        connection('vf', 'dyn', 'anim'),
        connection('anim', 'tbl', 'prob'),
      ],
    )

    expect(collectNodeLinkBranchIds(scene, 'vf')).toEqual(
      new Set(['main', 'vfx', 'emitter', 'vf', 'anim', 'prob']),
    )
  })
})

describe('collectSlotSubtreeNodeIds', () => {
  it('mantém só ramo do slot indicado no pai', () => {
    const scene = sceneWithConnections(
      ['vfx', 'e1', 'e2'],
      [
        connection('vfx', 'slot-0', 'e1'),
        connection('vfx', 'slot-1', 'e2'),
      ],
    )

    expect(collectSlotSubtreeNodeIds(scene, 'vfx', 'slot-0')).toEqual(new Set(['vfx', 'e1']))
  })
})

describe('collectIncomingSlotBranchNodeIds', () => {
  it('usa subárvore do slot de entrada (sem incluir Vfx acima do emitter)', () => {
    const scene = sceneWithConnections(
      ['vfx', 'emitter', 'vf'],
      [
        connection('vfx', 'list', 'emitter'),
        connection('emitter', 'rate', 'vf'),
      ],
    )

    expect(collectIncomingSlotBranchNodeIds(scene, 'vf')).toEqual(new Set(['emitter', 'vf']))
  })
})

describe('applyShowOnlyNodeIds', () => {
  it('oculta nós fora do conjunto e mantém visíveis os do conjunto', () => {
    const scene = sceneWithConnections(['keep', 'hide'], [])

    const next = applyShowOnlyNodeIds(scene, new Set(['keep']), {
      mode: 'branch',
      seedNodeId: 'keep',
    })

    expect(next.linkVisibilityFilter).toEqual({ mode: 'branch', seedNodeId: 'keep' })
    expect(next.nodes.find((n) => n.id === 'keep')?.sceneHidden).toBeUndefined()
    expect(next.nodes.find((n) => n.id === 'keep')?.branchForceVisible).toBeUndefined()
    expect(next.nodes.find((n) => n.id === 'hide')?.sceneHidden).toBe(true)
  })
})

describe('collectLinkVisibilityVisibleIds com filtro activo', () => {
  it('reavalia ramos ao mudar índice (só slot activo do list fica no ramo slot)', () => {
    const scene = applyShowOnlyNodeIds(
      sceneWithConnections(
        ['vfx', 'e1', 'e2', 'vf1'],
        [
          connection('vfx', 'slot-0', 'e1'),
          connection('vfx', 'slot-1', 'e2'),
          connection('e1', 'rate', 'vf1'),
        ],
      ),
      new Set(['vfx', 'e1', 'vf1']),
      { mode: 'slot', fromNodeId: 'vfx', slotId: 'slot-0' },
    )

    const allowed = collectLinkVisibilityVisibleIds(scene)
    expect(allowed).toEqual(new Set(['vfx', 'e1', 'vf1']))
    expect(allowed?.has('e2')).toBe(false)
  })

  it('reapplyLinkVisibilityFilter desoculta tudo e reoculta fora do ramo', () => {
    const scene = applyShowOnlyNodeIds(
      sceneWithConnections(
        ['keep', 'mid', 'hide'],
        [connection('keep', 'out', 'mid'), connection('mid', 'out', 'hide')],
      ),
      new Set(['keep', 'mid', 'hide']),
      { mode: 'branch', seedNodeId: 'mid' },
    )

    const messed = {
      ...scene,
      nodes: scene.nodes.map((node) =>
        node.id === 'keep' || node.id === 'hide'
          ? { ...node, sceneHidden: undefined, branchForceVisible: true }
          : node,
      ),
    }

    const next = reapplyLinkVisibilityFilter(messed)

    expect(next.nodes.find((n) => n.id === 'keep')?.sceneHidden).toBeUndefined()
    expect(next.nodes.find((n) => n.id === 'mid')?.sceneHidden).toBeUndefined()
    expect(next.nodes.find((n) => n.id === 'hide')?.sceneHidden).toBeUndefined()
    expect(next.nodes.find((n) => n.id === 'keep')?.branchForceVisible).toBeUndefined()
  })

  it('resetAllNodesSceneVisibility limpa sceneHidden em todos', () => {
    const scene = applyShowOnlyNodeIds(
      sceneWithConnections(['a', 'b'], []),
      new Set(['a']),
      { mode: 'branch', seedNodeId: 'a' },
    )

    const reset = resetAllNodesSceneVisibility(scene)

    expect(reset.nodes.every((n) => n.sceneHidden === undefined)).toBe(true)
    expect(reset.linkVisibilityFilter).toBeDefined()
  })
})
