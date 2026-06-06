import { describe, expect, it } from 'vitest'

import type { ContextMenuItem } from '@/core/canvasContextMenuTypes'

import {
  contextMenuItemsToSnapActions,
  resolveSnapMenuFrame,
  SNAP_MENU_BACK_ACTION_ID,
} from './contextMenuSnapMenu'

const SAMPLE_ITEMS: ContextMenuItem[] = [
  {
    id: 'canvas.addNode',
    label: 'Adicionar nó',
    children: [
      { id: 'canvas.addNode.node', label: 'Nodes' },
      { id: 'canvas.addNode.block', label: 'Blocks' },
      { id: 'canvas.addNode.addon', label: 'Addons' },
    ],
  },
  {
    id: 'canvas.navegacao',
    label: 'Navegação',
    children: [
      { id: 'canvas.setInteractionMode.tweak', label: 'Tweak' },
      { id: 'canvas.setInteractionMode.navigate', label: 'Mover na grade' },
    ],
  },
  {
    id: 'canvas.exibir',
    label: 'Exibir ›',
    children: [{ id: 'canvas.toolbar.legend', label: 'Legenda' }],
  },
]

describe('contextMenuSnapMenu', () => {
  it('converte itens do menu de contexto em acções Snap com atalhos numéricos', () => {
    const actions = contextMenuItemsToSnapActions(SAMPLE_ITEMS)

    expect(actions).toHaveLength(3)
    expect(actions[0]).toMatchObject({ id: 'canvas.addNode', shortcut: '1', label: 'Adicionar nó' })
    expect(actions[0]?.submenu).toHaveLength(4)
    expect(actions[0]?.submenu?.[1]).toMatchObject({ id: 'canvas.addNode.node', shortcut: '1' })
    expect(actions[1]?.submenu).toHaveLength(3)
    expect(actions[1]?.submenu?.[0]).toMatchObject({
      id: SNAP_MENU_BACK_ACTION_ID,
      shortcut: '0',
      label: 'Voltar',
    })
    expect(actions[1]?.submenu?.[1]).toMatchObject({
      id: 'canvas.setInteractionMode.tweak',
      shortcut: '1',
    })
    expect(actions[2]?.label).toBe('Exibir')
  })

  it('resolve submenus aninhados em profundidade ilimitada', () => {
    const nestedItems: ContextMenuItem[] = [
      {
        id: 'canvas.addNode',
        label: 'Adicionar nó',
        children: [
          {
            id: 'canvas.addNode.node',
            label: 'Nodes',
            children: [
              { id: 'canvas.addNode.node.schema', label: 'Schema A' },
              { id: 'canvas.addNode.node.pack', label: 'Pack B' },
            ],
          },
        ],
      },
    ]

    const actions = contextMenuItemsToSnapActions(nestedItems)
    const nodeAction = actions[0]?.submenu?.[1]

    expect(nodeAction?.submenu).toHaveLength(3)
    expect(resolveSnapMenuFrame('Raiz', actions, []).title).toBe('Raiz')
    expect(resolveSnapMenuFrame('Raiz', actions, ['canvas.addNode']).title).toBe('Adicionar nó')
    expect(resolveSnapMenuFrame('Raiz', actions, ['canvas.addNode', 'canvas.addNode.node']).actions).toEqual(
      nodeAction?.submenu,
    )
  })

  it('limita a 9 itens no nível raiz', () => {
    const manyItems = Array.from({ length: 12 }, (_, index) => ({
      id: `canvas.item.${index}` as ContextMenuItem['id'],
      label: `Item ${index}`,
    }))

    expect(contextMenuItemsToSnapActions(manyItems)).toHaveLength(9)
  })
})
