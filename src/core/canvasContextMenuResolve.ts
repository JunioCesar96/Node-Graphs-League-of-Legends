import type { MouseEvent as ReactMouseEvent } from 'react'

import {
  CANVAS_CONNECTION_ID_ATTR,
  CANVAS_CONTEXT_ELEMENT_ID_ATTR,
  CANVAS_CONTEXT_EMBED_ID_ATTR,
  CANVAS_CONTEXT_INSTANCE_ID_ATTR,
  CANVAS_CONTEXT_KIND_ATTR,
  CANVAS_CONTEXT_LIST2_EMBED_ID_ATTR,
  CANVAS_CONTEXT_LIST2_POINTER_ID_ATTR,
  CANVAS_CONTEXT_LIST_EMBED_ID_ATTR,
  CANVAS_CONTEXT_LIST_POINTER_ID_ATTR,
  CANVAS_CONTEXT_NODE_ID_ATTR,
  CANVAS_CONTEXT_POINTER_ID_ATTR,
  CANVAS_CONTEXT_ROOT_ATTR,
  CANVAS_CONTEXT_TARGET_ATTR,
} from '@/core/canvasContextMenuAttributes'
import type { CanvasContextTarget } from '@/core/canvasContextMenuTypes'
import type { NodeElementKind } from '@/core/listNodeElements'

function readOptionalAttr(el: Element, name: string): string | undefined {
  const value = el.getAttribute(name)
  return value && value.length > 0 ? value : undefined
}

export function resolveContextTarget(event: ReactMouseEvent): CanvasContextTarget | null {
  const target = event.target

  if (!(target instanceof Element)) {
    return { type: 'canvas' }
  }

  if (target.closest('[data-canvas-control="true"]')) {
    return null
  }

  const contextEl = target.closest(`[${CANVAS_CONTEXT_ROOT_ATTR}]`)

  if (contextEl) {
    const contextTarget = contextEl.getAttribute(CANVAS_CONTEXT_TARGET_ATTR)

    if (contextTarget === 'nodeInputPort') {
      const nodeId = contextEl.getAttribute(CANVAS_CONTEXT_NODE_ID_ATTR)

      if (nodeId) {
        return { type: 'nodeInputPort', nodeId }
      }

      return null
    }

    if (contextTarget === 'element') {
      const nodeId = contextEl.getAttribute(CANVAS_CONTEXT_NODE_ID_ATTR)
      const kindRaw = contextEl.getAttribute(CANVAS_CONTEXT_KIND_ATTR)
      const elementId = contextEl.getAttribute(CANVAS_CONTEXT_ELEMENT_ID_ATTR)

      if (!nodeId || !kindRaw || !elementId) {
        return null
      }

      const kinds = [
        'parameter',
        'internalStructure',
        'embedSlot',
        'embedBlock',
        'pointerSlot',
        'pointerBlock',
        'listEmbedSlot',
        'listEmbedBlock',
        'listPointerSlot',
        'listPointerBlock',
        'list2EmbedBlock',
        'list2PointerBlock',
        'list2EmbedInstance',
        'list2PointerInstance',
      ] as const

      if (!kinds.includes(kindRaw as (typeof kinds)[number])) {
        return null
      }

      return {
        type: 'element',
        nodeId,
        kind: kindRaw as NodeElementKind | 'list2EmbedBlock' | 'list2PointerBlock' | 'list2EmbedInstance' | 'list2PointerInstance',
        elementId,
        embedId: readOptionalAttr(contextEl, CANVAS_CONTEXT_EMBED_ID_ATTR),
        pointerId: readOptionalAttr(contextEl, CANVAS_CONTEXT_POINTER_ID_ATTR),
        listEmbedId: readOptionalAttr(contextEl, CANVAS_CONTEXT_LIST_EMBED_ID_ATTR),
        listPointerId: readOptionalAttr(contextEl, CANVAS_CONTEXT_LIST_POINTER_ID_ATTR),
        list2EmbedId: readOptionalAttr(contextEl, CANVAS_CONTEXT_LIST2_EMBED_ID_ATTR),
        list2PointerId: readOptionalAttr(contextEl, CANVAS_CONTEXT_LIST2_POINTER_ID_ATTR),
        instanceId: readOptionalAttr(contextEl, CANVAS_CONTEXT_INSTANCE_ID_ATTR),
      }
    }
  }

  const blockSlotEl = target.closest('[data-block-slot-id]')

  if (blockSlotEl) {
    const nodeId = blockSlotEl.getAttribute('data-block-slot-node-id')
    const slotId = blockSlotEl.getAttribute('data-block-slot-id')
    const direction = blockSlotEl.getAttribute('data-block-slot-direction')

    if (nodeId && slotId && (direction === 'input' || direction === 'output')) {
      return { type: 'blockSlot', nodeId, slotId, direction }
    }
  }

  const addonSlotEl = target.closest('[data-addon-slot-id]')

  if (addonSlotEl) {
    const nodeId = addonSlotEl.getAttribute('data-addon-slot-node-id')
    const slotId = addonSlotEl.getAttribute('data-addon-slot-id')
    const direction = addonSlotEl.getAttribute('data-addon-slot-direction')

    if (nodeId && slotId && (direction === 'input' || direction === 'output')) {
      return { type: 'addonSlot', nodeId, slotId, direction }
    }
  }

  const wireEl = target.closest('[data-canvas-wire="true"]')

  if (wireEl) {
    const connectionId = wireEl.getAttribute(CANVAS_CONNECTION_ID_ATTR)

    if (connectionId) {
      return { type: 'connection', connectionId }
    }
  }

  const inputPortEl = target.closest('[data-graph-port="input"]')
  const inputPortNodeEl = inputPortEl?.closest('[data-canvas-node="true"]')

  if (inputPortEl && inputPortNodeEl) {
    const nodeId = inputPortNodeEl.getAttribute('data-canvas-node-id')

    if (nodeId) {
      return { type: 'nodeInputPort', nodeId }
    }
  }

  const nodeEl = target.closest('[data-canvas-node="true"]')

  if (nodeEl) {
    const nodeId = nodeEl.getAttribute('data-canvas-node-id')

    if (nodeId) {
      return { type: 'node', nodeId }
    }
  }

  const viewportBody = target.closest('[aria-label="Graph viewport navigation area"]')

  if (viewportBody) {
    return { type: 'canvas' }
  }

  return null
}
