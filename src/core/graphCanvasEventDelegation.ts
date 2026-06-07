/** Atributo em cada cartão montado no canvas (delegação de eventos no viewport). */
export const CANVAS_NODE_ID_ATTR = 'data-canvas-node-id'

/**
 * Resolve o id do nó a partir de um evento de ponteiro (delegação no ancestral comum).
 * @see https://www.youtube.com/watch?v=iyDtCq-sqe0
 */
export function resolveCanvasNodeIdFromPointerEvent(
  event: Pick<PointerEvent, 'target'>,
  root: ParentNode,
): string | null {
  if (!(event.target instanceof Element)) {
    return null
  }

  const nodeShell = event.target.closest(`[${CANVAS_NODE_ID_ATTR}]`)

  if (!nodeShell || !root.contains(nodeShell)) {
    return null
  }

  return nodeShell.getAttribute(CANVAS_NODE_ID_ATTR)
}
