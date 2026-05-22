import { isNeekoSchemaId } from '@/core/neekoNodeTransform'

export type RitualDropTarget =
  | { kind: 'neeko'; canvasNodeId: string }
  | { kind: 'emptyCanvas' }
  | { kind: 'none' }

export function resolveRitualDropTargetFromPoint(
  clientX: number,
  clientY: number,
  options: {
    viewportBodyEl: HTMLElement | null
    neekoNodeIds: ReadonlySet<string>
  },
): RitualDropTarget {
  const el = document.elementFromPoint(clientX, clientY)
  if (!el) {
    return { kind: 'none' }
  }

  const dropZone = el.closest('[data-neeko-drop-zone]')
  if (dropZone instanceof HTMLElement) {
    const canvasNodeId = dropZone.dataset.canvasNodeId?.trim()
    if (canvasNodeId && options.neekoNodeIds.has(canvasNodeId)) {
      return { kind: 'neeko', canvasNodeId }
    }
  }

  const nodeShell = el.closest('[data-canvas-node-id]')
  if (nodeShell instanceof HTMLElement) {
    const canvasNodeId = nodeShell.dataset.canvasNodeId?.trim()
    if (canvasNodeId && options.neekoNodeIds.has(canvasNodeId)) {
      return { kind: 'neeko', canvasNodeId }
    }
    return { kind: 'none' }
  }

  if (options.viewportBodyEl?.contains(el)) {
    return { kind: 'emptyCanvas' }
  }

  return { kind: 'none' }
}

export function canAcceptNeekoRitualDrop(
  canvasNode: {
    node: { schema: { id: string } }
    locked?: boolean
    neekoTransformPhase?: string
  },
): boolean {
  if (canvasNode.locked) {
    return false
  }

  const isNeekoNode =
    isNeekoSchemaId(canvasNode.node.schema.id) || canvasNode.neekoTransformPhase !== undefined

  if (!isNeekoNode) {
    return false
  }

  return (
    isNeekoSchemaId(canvasNode.node.schema.id) || canvasNode.neekoTransformPhase === 'shell'
  )
}

export function collectNeekoRitualDropTargetIds(
  nodes: readonly {
    id: string
    node: { schema: { id: string } }
    locked?: boolean
    neekoTransformPhase?: string
  }[],
): Set<string> {
  const out = new Set<string>()
  for (const canvasNode of nodes) {
    if (canAcceptNeekoRitualDrop(canvasNode)) {
      out.add(canvasNode.id)
    }
  }
  return out
}
