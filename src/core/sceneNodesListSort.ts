import type { CanvasNode } from '@/core/canvasScene'
import { getNodeDisplayTitle } from '@/core/canvasNodePresentation'

export type SceneNodesSortMode = 'name' | 'position' | 'type'

export function sortSceneNodes(nodes: readonly CanvasNode[], mode: SceneNodesSortMode): CanvasNode[] {
  const copy = [...nodes]

  switch (mode) {
    case 'type':
      copy.sort((a, b) => a.node.schema.id.localeCompare(b.node.schema.id))
      break
    case 'position':
      copy.sort((a, b) => {
        if (a.position.y !== b.position.y) {
          return a.position.y - b.position.y
        }

        return a.position.x - b.position.x
      })
      break
    case 'name':
    default:
      copy.sort((a, b) => getNodeDisplayTitle(a).localeCompare(getNodeDisplayTitle(b)))
      break
  }

  return copy
}

export function filterSceneNodesByQuery(nodes: readonly CanvasNode[], query: string): CanvasNode[] {
  const needle = query.trim().toLowerCase()

  if (!needle) {
    return [...nodes]
  }

  return nodes.filter((canvasNode) => {
    const title = getNodeDisplayTitle(canvasNode).toLowerCase()
    const schemaTitle = canvasNode.node.schema.title.toLowerCase()
    const schemaId = canvasNode.node.schema.id.toLowerCase()

    return title.includes(needle) || schemaTitle.includes(needle) || schemaId.includes(needle)
  })
}
