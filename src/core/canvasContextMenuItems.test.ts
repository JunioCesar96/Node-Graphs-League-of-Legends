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
    canvasInteractionMode: 'tweak' as const,
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
    canvasInteractionMode: 'tweak' as const,
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
    canvasInteractionMode: 'tweak' as const,
    toolbarVisibility: DEFAULT_CANVAS_TOOLBAR_VISIBILITY,
    hasPendingLink: false,
    hasInspectorSlot: false,
    onPreviewBlockCardCode: () => {},
    onRebuildBlockVfx: () => {},
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
    expect(items[3]?.children?.map((item) => item.id)).toEqual([
      'node.codigoPreviewBlock',
      'node.rebuildBlockVfx',
    ])
  })

  it('mostra Ocultar todos os blocos filhos quando há ligações de slot de bloco', () => {
    const blockStructure: BlockStructurePayload = {
      blockType: 'VfxSystemDefinitionData',
      blockName: 'System',
      parameters: [],
      identification_codes: [],
    }

    const parent: CanvasNode = {
      ...stubNode('parent'),
      blockViewActive: true,
      blockStructure,
    }

    const child: CanvasNode = {
      ...stubNode('child'),
      blockViewActive: true,
      blockStructure: {
        ...blockStructure,
        blockName: 'Emitter',
      },
    }

    const scene: CanvasScene = {
      nodes: [parent, child],
      connections: [
        {
          id: 'block:parent->child',
          fromNodeId: 'parent',
          toNodeId: 'child',
          fromInternalStructureId: '__block__:out',
          fromBlockSlotId: 'block-param:p1:output',
          toBlockSlotId: 'block-header:Emitter:0',
        },
      ],
    }

    const items = buildContextMenuItems(
      { type: 'node', nodeId: 'parent' },
      { ...baseCtx, scene, selectedNodeIds: ['parent'] },
    )

    const hideItem = items.find((item) => item.id === 'node.hideLinkedChildNodes')
    expect(hideItem?.label).toBe('Ocultar todos os blocos filhos')
    expect(hideItem?.disabled).toBe(false)

    const showItem = items.find((item) => item.id === 'node.showLinkedChildNodes')
    expect(showItem?.label).toBe('Mostrar todos os blocos filhos')
    expect(showItem?.disabled).toBe(false)
  })

  it('mostra Ocultar todos os índices deseleccionados para list[pointer] com fan-out', () => {
    const listParamId = 'complexEmitterDefinitionData_list_pointer'
    const outputSlot = `block-param:${listParamId}:output`

    const parent: CanvasNode = {
      ...stubNode('system'),
      blockViewActive: true,
      blockStructure: {
        blockType: 'VfxSystemDefinitionData',
        blockName: 'System',
        parameters: [
          {
            idParameter: listParamId,
            nameParameter: 'complexEmitterDefinitionData',
            typeParameter: 'VfxEmitterDefinitionData',
            defaultValue: '',
            listParameter: true,
            sourcePath: {
              kind: 'pointerChild',
              pointerId: 'catalog-ptr',
              slotId: 'catalog-ptr-slot',
            },
          },
        ],
        identification_codes: [],
      },
      blockElementView: {
        [`slot:${outputSlot}`]: { mode: 'list', selectedIndex: 0 },
      },
    }

    const emitterA: CanvasNode = {
      ...stubNode('emitter-a'),
      blockViewActive: true,
      blockStructure: {
        blockType: 'VfxEmitterDefinitionData',
        blockName: 'EmitterA',
        parameters: [],
        identification_codes: [],
      },
    }

    const emitterB: CanvasNode = {
      ...stubNode('emitter-b'),
      blockViewActive: true,
      blockStructure: {
        blockType: 'VfxEmitterDefinitionData',
        blockName: 'EmitterB',
        parameters: [],
        identification_codes: [],
      },
    }

    const scene: CanvasScene = {
      nodes: [parent, emitterA, emitterB],
      connections: [
        {
          id: 'c0',
          fromNodeId: 'system',
          fromInternalStructureId: `__block__:${outputSlot}`,
          fromBlockSlotId: outputSlot,
          toNodeId: 'emitter-a',
          toBlockSlotId: 'block-header:in:0',
        },
        {
          id: 'c1',
          fromNodeId: 'system',
          fromInternalStructureId: `__block__:${outputSlot}`,
          fromBlockSlotId: outputSlot,
          toNodeId: 'emitter-b',
          toBlockSlotId: 'block-header:in:0',
        },
      ],
    }

    const items = buildContextMenuItems(
      { type: 'node', nodeId: 'system' },
      { ...baseCtx, scene, selectedNodeIds: ['system'] },
    )

    const hideItem = items.find((item) => item.id === 'node.hideInactiveBlockIndexBranches')
    expect(hideItem?.label).toBe('Ocultar todos os índices deseleccionados')
    expect(hideItem?.disabled).toBe(false)
  })

  it('mostra Organização com Alinhar e Distribuir quando 2+ blocos seleccionados', () => {
    const blockStructure: BlockStructurePayload = {
      blockType: 'VfxEmitterDefinitionData',
      blockName: 'Emitter',
      parameters: [],
      identification_codes: [],
    }

    const parent: CanvasNode = {
      ...stubNode('block-a'),
      blockViewActive: true,
      blockStructure,
    }

    const sibling: CanvasNode = {
      ...stubNode('block-b'),
      blockViewActive: true,
      blockStructure: { ...blockStructure, blockName: 'EmitterB' },
    }

    const scene: CanvasScene = {
      nodes: [parent, sibling],
      connections: [],
    }

    const items = buildContextMenuItems(
      { type: 'node', nodeId: 'block-a' },
      { ...baseCtx, scene, selectedNodeIds: ['block-a', 'block-b'] },
    )

    const orgItem = items.find((item) => item.id === 'node.blockOrganization')
    expect(orgItem?.label).toBe('Organização')
    expect(orgItem?.children?.map((item) => item.id)).toEqual([
      'node.blockOrganization.align',
      'node.blockOrganization.distribute',
    ])
    expect(orgItem?.children?.[0]?.children?.map((item) => item.id)).toEqual([
      'node.blockOrganization.align.left',
      'node.blockOrganization.align.centerHorizontal',
      'node.blockOrganization.align.right',
      'node.blockOrganization.align.top',
      'node.blockOrganization.align.centerVertical',
      'node.blockOrganization.align.bottom',
    ])
    expect(orgItem?.children?.[1]?.disabled).toBe(true)
  })

  it('mostra submenu Slash Commands com adicionar e remover', () => {
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
      onRequestBlockSlashCommand: () => {},
    })

    const slashMenu = items.find((item) => item.id === 'node.slashCommands')
    expect(slashMenu?.children?.map((item) => item.id)).toEqual([
      'node.slashCommands.add',
      'node.slashCommands.remove',
    ])
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
    canvasInteractionMode: 'tweak' as const,
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

describe('buildContextMenuItems canvas navegacao', () => {
  const baseCtx = {
    canRedo: false,
    canUndo: false,
    glueNodeId: null,
    hasSelectAll: true,
    toolbarVisibility: DEFAULT_CANVAS_TOOLBAR_VISIBILITY,
    hasPendingLink: false,
    hasInspectorSlot: false,
    scene: demoCanvasScene,
    selectedNodeIds: [] as string[],
  }

  it('agrupa Tweak, Select box e Mover na grade no submenu Navegação', () => {
    const items = buildContextMenuItems({ type: 'canvas' }, {
      ...baseCtx,
      canvasInteractionMode: 'tweak',
    })

    const navegacao = items.find((item) => item.id === 'canvas.navegacao')
    expect(navegacao?.label).toBe('Navegação')
    expect(navegacao?.children?.map((item) => item.id)).toEqual([
      'canvas.setInteractionMode.tweak',
      'canvas.setInteractionMode.selectBox',
      'canvas.setInteractionMode.navigate',
    ])
    expect(navegacao?.children?.find((item) => item.id === 'canvas.setInteractionMode.tweak')?.selected).toBe(
      true,
    )
    expect(items.some((item) => item.id === 'canvas.toggleNavigateMode')).toBe(false)
  })

  it('marca Select box como activo no submenu', () => {
    const items = buildContextMenuItems({ type: 'canvas' }, {
      ...baseCtx,
      canvasInteractionMode: 'selectBox',
    })

    const navegacao = items.find((item) => item.id === 'canvas.navegacao')
    expect(
      navegacao?.children?.find((item) => item.id === 'canvas.setInteractionMode.selectBox')?.selected,
    ).toBe(true)
  })
})

describe('buildContextMenuItems canvas exibir', () => {
  const baseCtx = {
    canRedo: false,
    canUndo: false,
    glueNodeId: null,
    hasSelectAll: true,
    toolbarVisibility: DEFAULT_CANVAS_TOOLBAR_VISIBILITY,
    hasPendingLink: false,
    hasInspectorSlot: false,
    scene: demoCanvasScene,
    selectedNodeIds: [] as string[],
  }

  it('inclui Grade no submenu Exibir', () => {
    const items = buildContextMenuItems({ type: 'canvas' }, baseCtx)
    const exibir = items.find((item) => item.id === 'canvas.exibir')

    expect(exibir?.children?.some((item) => item.id === 'canvas.openGridControl')).toBe(true)
  })
})
