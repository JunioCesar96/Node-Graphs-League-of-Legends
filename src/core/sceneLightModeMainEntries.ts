import type { CanvasScene } from '@/core/canvasScene'
import {
  elementViewKeyForParameter,
  getElementViewState,
  isEntriesParameter,
  patchElementViewMode,
} from '@/core/elementViewState'
import {
  hasMapHashEmbedStructure,
  parseMapHashEmbedString,
} from '@/core/mapHashEmbedValue'
import type { NodeInstance } from '@/core/nodeSchema'

export const MAIN_NODE_SCHEMA_ID = 'main'
export const MAIN_ENTRIES_VFX_TYPE_NAME = 'VfxSystemDefinitionData'

export function firstPopulatedMapHashEmbedIndexByTypeName(
  value: string,
  typeName: string,
): number | null {
  const entries = parseMapHashEmbedString(value).filter((entry) => hasMapHashEmbedStructure(entry))
  const index = entries.findIndex((entry) => entry.typeName === typeName)

  if (index < 0) {
    return null
  }

  return index
}

function entriesParameterValue(node: NodeInstance, parameterId: string, fallback = ''): string {
  const parameter = node.schema.parameters.find((p) => p.id === parameterId)
  const fallbackValue = parameter?.defaultValue ?? fallback

  return node.values.find((value) => value.parameterId === parameterId)?.value ?? fallbackValue
}

/** No nó Main, selecciona o primeiro `entries` do tipo VfxSystemDefinitionData em modo compacto. */
export function applyLightModeMainEntriesVfxIndexToNode(node: NodeInstance): NodeInstance {
  if (node.schema.id !== MAIN_NODE_SCHEMA_ID) {
    return node
  }

  const entriesParam = node.schema.parameters.find((parameter) => isEntriesParameter(parameter))

  if (!entriesParam || entriesParam.type !== 'mapHashEmbed') {
    return node
  }

  const value = entriesParameterValue(node, entriesParam.id, entriesParam.defaultValue ?? '')
  const vfxIndex = firstPopulatedMapHashEmbedIndexByTypeName(value, MAIN_ENTRIES_VFX_TYPE_NAME)

  if (vfxIndex === null) {
    return node
  }

  const key = elementViewKeyForParameter(entriesParam.id)
  const state = getElementViewState(node, key)

  if (state.mode === 'compact' && state.selectedIndex === vfxIndex) {
    return node
  }

  return patchElementViewMode(node, key, 'compact', vfxIndex)
}

export function applyLightModeMainEntriesVfxIndexToScene(scene: CanvasScene): CanvasScene {
  let changed = false

  const nodes = scene.nodes.map((canvasNode) => {
    const nextNode = applyLightModeMainEntriesVfxIndexToNode(canvasNode.node)

    if (nextNode === canvasNode.node) {
      return canvasNode
    }

    changed = true
    return { ...canvasNode, node: nextNode }
  })

  return changed ? { ...scene, nodes } : scene
}
