import { describe, expect, it } from 'vitest'

import type { CanvasConnection, CanvasNode, CanvasScene } from '@/core/canvasScene'
import { demoCanvasScene } from '@/core/demoCanvasScene'
import { elementViewKeyForParameter, patchElementRetracted } from '@/core/elementViewState'
import { buildContextMenuItems } from '@/core/canvasContextMenuItems'
import type { CanvasContextTarget } from '@/core/canvasContextMenuTypes'
import { DEFAULT_CANVAS_TOOLBAR_VISIBILITY } from '@/core/canvasToolbarVisibility'
import type { BlockStructurePayload } from '@/core/blockSchema'

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

describe('buildContextMenuItems element retracted', () => {
  const baseCtx = {
    canRedo: false,
    canUndo: false,
    glueNodeId: null,
    hasSelectAll: false,
    scene: demoCanvasScene,
    selectedNodeIds: [],
    viewportNavigateMode: false,
    toolbarVisibility: DEFAULT_CANVAS_TOOLBAR_VISIBILITY,
    hasPendingLink: false,
    hasInspectorSlot: false,
    onPreviewBlockCardCode: () => {},
  }

  it('mostra Retrair elemento quando expandido', () => {
    const canvasNode = demoCanvasScene.nodes[0]!
    const param = canvasNode.node.schema.parameters[0]
    if (!param) {
      return
    }

    const target: CanvasContextTarget = {
      type: 'element',
      nodeId: canvasNode.id,
      kind: 'parameter',
      elementId: param.id,
    }

    const items = buildContextMenuItems(target, baseCtx)
    const retractItem = items.find((item) => item.id === 'element.toggleRetracted')
    expect(retractItem?.label).toBe('Retrair elemento')
  })

  it('mostra Expandir elemento quando retraído', () => {
    const canvasNode = demoCanvasScene.nodes[0]!
    const param = canvasNode.node.schema.parameters[0]
    if (!param) {
      return
    }

    const key = elementViewKeyForParameter(param.id)
    const scene = {
      ...demoCanvasScene,
      nodes: demoCanvasScene.nodes.map((n) =>
        n.id === canvasNode.id
          ? { ...n, node: patchElementRetracted(n.node, key, true) }
          : n,
      ),
    }

    const target: CanvasContextTarget = {
      type: 'element',
      nodeId: canvasNode.id,
      kind: 'parameter',
      elementId: param.id,
    }

    const items = buildContextMenuItems(target, { ...baseCtx, scene })
    const retractItem = items.find((item) => item.id === 'element.toggleRetracted')
    expect(retractItem?.label).toBe('Expandir elemento')
  })
})

describe('buildContextMenuItems node hide linked children', () => {
  const baseCtx = {
    canRedo: false,
    canUndo: false,
    glueNodeId: null,
    hasSelectAll: false,
    viewportNavigateMode: false,
    toolbarVisibility: DEFAULT_CANVAS_TOOLBAR_VISIBILITY,
    hasPendingLink: false,
    hasInspectorSlot: false,
    onPreviewBlockCardCode: () => {},
  }

  const scene: CanvasScene = {
    nodes: [stubNode('a'), stubNode('b')],
    connections: [connection('a', 'out', 'b')],
  }

  const target: CanvasContextTarget = { type: 'node', nodeId: 'a' }

  it('mostra Ocultar todos os nodes filhos quando há ligações de saída', () => {
    const items = buildContextMenuItems(target, { ...baseCtx, scene, selectedNodeIds: ['a'] })
    const hideItem = items.find((item) => item.id === 'node.hideLinkedChildNodes')
    expect(hideItem?.label).toBe('Ocultar todos os nodes filhos')
    expect(hideItem?.disabled).toBe(false)
  })

  it('desactiva o item quando o nó não está seleccionado', () => {
    const items = buildContextMenuItems(target, { ...baseCtx, scene, selectedNodeIds: [] })
    const hideItem = items.find((item) => item.id === 'node.hideLinkedChildNodes')
    expect(hideItem?.disabled).toBe(true)
  })
})

describe('buildContextMenuItems block card node menu', () => {
  const baseCtx = {
    canRedo: false,
    canUndo: false,
    glueNodeId: null,
    hasSelectAll: false,
    viewportNavigateMode: false,
    toolbarVisibility: DEFAULT_CANVAS_TOOLBAR_VISIBILITY,
    hasPendingLink: false,
    hasInspectorSlot: false,
    onPreviewBlockCardCode: () => {},
  }

  it('mostra somente opções essenciais para card de bloco', () => {
    const blockStructure: BlockStructurePayload = {
      blockType: 'IntegratedValueVector3',
      blockName: 'IntegratedValueVector3',
      parameters: [],
      identification_codes: [],
    }

    const blockNode: CanvasNode = {
      ...stubNode('block-node'),
      blockViewActive: true,
      blockStructure,
    }

    const scene: CanvasScene = {
      nodes: [blockNode],
      connections: [],
    }

    const target: CanvasContextTarget = { type: 'node', nodeId: 'block-node' }
    const items = buildContextMenuItems(target, {
      ...baseCtx,
      scene,
      selectedNodeIds: ['block-node'],
    })

    expect(items.map((item) => item.id)).toEqual([
      'node.focus',
      'node.select',
      'node.glue',
      'node.codigo',
      'node.delete',
    ])
    expect(items[1]?.label).toBe('Já seleccionado')
    expect(items[3]?.children?.map((item) => item.id)).toEqual(['node.codigoPreviewBlock'])
  })

  it('mostra submenu Parâmetros com adicionar, editar e remover', () => {
    const blockStructure: BlockStructurePayload = {
      blockType: 'IntegratedValueVector3',
      blockName: 'IntegratedValueVector3',
      parameters: [
        {
          idParameter: 'p1',
          nameParameter: 'velocity',
          typeParameter: 'vec3',
          defaultValue: '0,0,0',
        },
      ],
      identification_codes: [],
    }

    const blockNode: CanvasNode = {
      ...stubNode('block-node'),
      blockViewActive: true,
      blockStructure,
    }

    const scene: CanvasScene = {
      nodes: [blockNode],
      connections: [],
    }

    const target: CanvasContextTarget = { type: 'node', nodeId: 'block-node' }
    const items = buildContextMenuItems(target, {
      ...baseCtx,
      scene,
      selectedNodeIds: ['block-node'],
      onRequestBlockParameterPanel: () => {},
      blockParameterMenu: { canAdd: true, canEdit: true, canRemove: true },
    })

    const paramsMenu = items.find((item) => item.id === 'node.blockParameters')
    expect(paramsMenu?.label).toBe('Parâmetros')
    expect(paramsMenu?.children?.map((item) => item.id)).toEqual([
      'node.blockParameters.add',
      'node.blockParameters.edit',
      'node.blockParameters.remove',
    ])
    expect(paramsMenu?.children?.find((item) => item.id === 'node.blockParameters.edit')?.disabled).toBe(
      false,
    )
  })

  it('desactiva editar e remover quando o bloco não tem parâmetros', () => {
    const blockStructure: BlockStructurePayload = {
      blockType: 'IntegratedValueVector3',
      blockName: 'IntegratedValueVector3',
      parameters: [],
      identification_codes: [],
    }

    const blockNode: CanvasNode = {
      ...stubNode('block-node'),
      blockViewActive: true,
      blockStructure,
    }

    const scene: CanvasScene = {
      nodes: [blockNode],
      connections: [],
    }

    const items = buildContextMenuItems(
      { type: 'node', nodeId: 'block-node' },
      {
        ...baseCtx,
        scene,
        selectedNodeIds: ['block-node'],
        onRequestBlockParameterPanel: () => {},
        blockParameterMenu: { canAdd: true, canEdit: true, canRemove: true },
      },
    )

    const paramsMenu = items.find((item) => item.id === 'node.blockParameters')
    expect(paramsMenu?.children?.find((item) => item.id === 'node.blockParameters.edit')?.disabled).toBe(
      true,
    )
    expect(paramsMenu?.children?.find((item) => item.id === 'node.blockParameters.remove')?.disabled).toBe(
      true,
    )
  })
})

describe('buildContextMenuItems block slot', () => {
  const baseCtx = {
    canRedo: false,
    canUndo: false,
    glueNodeId: null,
    hasSelectAll: false,
    viewportNavigateMode: false,
    toolbarVisibility: DEFAULT_CANVAS_TOOLBAR_VISIBILITY,
    hasPendingLink: false,
    hasInspectorSlot: false,
    onSetConnectionRouting: () => {},
    onPreviewBlockCardCode: () => {},
  }

  it('mostra remover, focar e forma de ligação quando o slot tem conexão', () => {
    const blockConnection: CanvasConnection = {
      id: 'block:a:out->b:in',
      fromNodeId: 'a',
      fromInternalStructureId: '__block__:block-param:p1:output',
      toNodeId: 'b',
      toBlockSlotId: 'block-param:p2:input',
      fromBlockSlotId: 'block-param:p1:output',
      routing: 'wireless',
    }

    const scene: CanvasScene = {
      nodes: [stubNode('a'), stubNode('b')],
      connections: [blockConnection],
    }

    const target: CanvasContextTarget = {
      type: 'blockSlot',
      nodeId: 'a',
      slotId: 'block-param:p1:output',
      direction: 'output',
    }

    const items = buildContextMenuItems(target, { ...baseCtx, scene, selectedNodeIds: [] })

    expect(items.map((item) => item.id)).toEqual([
      'blockSlot.removeConnections',
      'blockSlot.focusPeerSlot',
      'slot.connectionRoutingMenu',
    ])
    expect(items[1]?.label).toBe('Focar no slot de entrada')
  })

  it('mostra menu para slot de addon ligado', () => {
    const addonConnection: CanvasConnection = {
      id: 'mix:block->addon',
      fromNodeId: 'block-a',
      fromInternalStructureId: '__block__:out',
      toNodeId: 'addon-a',
      fromBlockSlotId: 'block-param:p1:output',
      toAddonSlotId: 'addon:text:input',
      routing: 'wireless',
    }

    const scene: CanvasScene = {
      nodes: [stubNode('block-a'), stubNode('addon-a')],
      connections: [addonConnection],
    }

    const target: CanvasContextTarget = {
      type: 'addonSlot',
      nodeId: 'addon-a',
      slotId: 'addon:text:input',
      direction: 'input',
    }

    const items = buildContextMenuItems(target, { ...baseCtx, scene, selectedNodeIds: [] })

    expect(items.map((item) => item.id)).toEqual([
      'blockSlot.removeConnections',
      'blockSlot.focusPeerSlot',
      'slot.connectionRoutingMenu',
    ])
    expect(items[1]?.label).toBe('Focar no slot de saída')
  })
})
