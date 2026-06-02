import type { CanvasNode } from './canvasScene'

export type CanvasNodeViewMode = 'node' | 'block' | 'group'

export function resolveCanvasNodeViewMode(node: CanvasNode): CanvasNodeViewMode {
  if (node.groupViewActive && node.groupStructure) {
    return 'group'
  }
  if (node.blockViewActive && node.blockStructure) {
    return 'block'
  }
  return 'node'
}
