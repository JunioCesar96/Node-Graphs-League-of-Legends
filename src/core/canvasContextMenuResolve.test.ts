import { describe, expect, it } from 'vitest'

import { BLOCK_CARD_CONTEXT_ZONE_ATTR } from '@/core/canvasContextMenuAttributes'
import {
  resolveContextTarget,
  shouldAllowBlockNodeContextMenu,
} from '@/core/canvasContextMenuResolve'

function mouseEventOn(element: Element): { target: Element; preventDefault: () => void; stopPropagation: () => void } {
  return {
    target: element,
    preventDefault: () => undefined,
    stopPropagation: () => undefined,
  }
}

describe('block card context menu zones', () => {
  it('não resolve nó ao clicar no corpo do card de bloco', () => {
    document.body.innerHTML = `
      <div data-canvas-node="true" data-canvas-node-id="block-1">
        <article data-block-card="1">
          <header ${BLOCK_CARD_CONTEXT_ZONE_ATTR}="header">Header</header>
          <div class="body">Body</div>
        </article>
      </div>
    `

    const body = document.querySelector('.body')!
    expect(resolveContextTarget(mouseEventOn(body) as never)).toBeNull()
  })

  it('resolve nó ao clicar no cabeçalho do card de bloco', () => {
    document.body.innerHTML = `
      <div data-canvas-node="true" data-canvas-node-id="block-1">
        <article data-block-card="1">
          <header ${BLOCK_CARD_CONTEXT_ZONE_ATTR}="header">Header</header>
        </article>
      </div>
    `

    const header = document.querySelector('header')!
    expect(resolveContextTarget(mouseEventOn(header) as never)).toEqual({
      type: 'node',
      nodeId: 'block-1',
    })
  })

  it('shouldAllowBlockNodeContextMenu bloqueia nó fora das zonas', () => {
    document.body.innerHTML = `
      <article data-block-card="1"><div class="body">Body</div></article>
    `
    const body = document.querySelector('.body')!
    expect(
      shouldAllowBlockNodeContextMenu(mouseEventOn(body), { type: 'node', nodeId: 'block-1' }),
    ).toBe(false)
  })
})
