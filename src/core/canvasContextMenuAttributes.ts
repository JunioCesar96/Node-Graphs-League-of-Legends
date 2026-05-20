import type { NodeElementKind } from '@/core/listNodeElements'

export const CANVAS_CONTEXT_ROOT_ATTR = 'data-canvas-context'
export const CANVAS_CONTEXT_TARGET_ATTR = 'data-canvas-context-target'
export const CANVAS_CONTEXT_NODE_ID_ATTR = 'data-canvas-context-node-id'
export const CANVAS_CONTEXT_KIND_ATTR = 'data-canvas-context-kind'
export const CANVAS_CONTEXT_ELEMENT_ID_ATTR = 'data-canvas-context-element-id'
export const CANVAS_CONTEXT_EMBED_ID_ATTR = 'data-canvas-context-embed-id'
export const CANVAS_CONTEXT_POINTER_ID_ATTR = 'data-canvas-context-pointer-id'
export const CANVAS_CONTEXT_LIST_EMBED_ID_ATTR = 'data-canvas-context-list-embed-id'
export const CANVAS_CONTEXT_LIST_POINTER_ID_ATTR = 'data-canvas-context-list-pointer-id'
export const CANVAS_CONTEXT_LIST2_EMBED_ID_ATTR = 'data-canvas-context-list2-embed-id'
export const CANVAS_CONTEXT_LIST2_POINTER_ID_ATTR = 'data-canvas-context-list2-pointer-id'
export const CANVAS_CONTEXT_INSTANCE_ID_ATTR = 'data-canvas-context-instance-id'
export const CANVAS_CONNECTION_ID_ATTR = 'data-canvas-connection-id'

export const ELEMENT_MENU_TRIGGER_ATTR = 'data-element-menu-trigger'

type ElementContextKind = NodeElementKind | 'list2EmbedBlock' | 'list2PointerBlock' | 'list2EmbedInstance' | 'list2PointerInstance'

type ElementContextPropsInput = {
  nodeId: string
  kind: ElementContextKind
  elementId: string
  embedId?: string
  pointerId?: string
  listEmbedId?: string
  listPointerId?: string
  list2EmbedId?: string
  list2PointerId?: string
  instanceId?: string
}

export function canvasContextElementProps(input: ElementContextPropsInput): Record<string, string> {
  const attrs: Record<string, string> = {
    [CANVAS_CONTEXT_ROOT_ATTR]: '',
    [CANVAS_CONTEXT_TARGET_ATTR]: 'element',
    [CANVAS_CONTEXT_NODE_ID_ATTR]: input.nodeId,
    [CANVAS_CONTEXT_KIND_ATTR]: input.kind,
    [CANVAS_CONTEXT_ELEMENT_ID_ATTR]: input.elementId,
  }

  if (input.embedId) {
    attrs[CANVAS_CONTEXT_EMBED_ID_ATTR] = input.embedId
  }
  if (input.pointerId) {
    attrs[CANVAS_CONTEXT_POINTER_ID_ATTR] = input.pointerId
  }
  if (input.listEmbedId) {
    attrs[CANVAS_CONTEXT_LIST_EMBED_ID_ATTR] = input.listEmbedId
  }
  if (input.listPointerId) {
    attrs[CANVAS_CONTEXT_LIST_POINTER_ID_ATTR] = input.listPointerId
  }
  if (input.list2EmbedId) {
    attrs[CANVAS_CONTEXT_LIST2_EMBED_ID_ATTR] = input.list2EmbedId
  }
  if (input.list2PointerId) {
    attrs[CANVAS_CONTEXT_LIST2_POINTER_ID_ATTR] = input.list2PointerId
  }
  if (input.instanceId) {
    attrs[CANVAS_CONTEXT_INSTANCE_ID_ATTR] = input.instanceId
  }

  return attrs
}
