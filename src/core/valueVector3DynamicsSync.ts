import type { CanvasNode, CanvasScene } from '@/core/canvasScene'
import { parseListF32String } from '@/core/listF32Value'
import { normalizeListVector3String } from '@/core/listVector3Value'
import { normalizeVector3String } from '@/core/vector3Value'

const VFX_ANIMATED_VECTOR3_TITLE = 'VfxAnimatedVector3fVariableData'

function parameterValue(node: CanvasNode['node'], parameterId: string, fallback = ''): string {
  return node.values.find((entry) => entry.parameterId === parameterId)?.value ?? fallback
}

function patchParameterValue(
  values: CanvasNode['node']['values'],
  parameterId: string,
  value: string,
): CanvasNode['node']['values'] {
  const hasEntry = values.some((entry) => entry.parameterId === parameterId)
  if (!hasEntry) {
    return [...values, { parameterId, value }]
  }
  return values.map((entry) =>
    entry.parameterId === parameterId ? { ...entry, value } : entry,
  )
}

function dynamicsChildFromValueVector3(
  scene: CanvasScene,
  valueVector3Node: CanvasNode,
): CanvasNode | null {
  const dynamicsBlock = valueVector3Node.node.schema.pointer?.find(
    (block) => block.title.toLowerCase() === 'dynamics',
  )
  if (!dynamicsBlock?.slots?.[0]) {
    return null
  }

  const slotId = dynamicsBlock.slots[0].id
  const connection = scene.connections.find(
    (entry) =>
      entry.fromNodeId === valueVector3Node.id &&
      entry.fromInternalStructureId === slotId &&
      entry.routing === 'wireless',
  )
  if (!connection) {
    return null
  }

  const child = scene.nodes.find((entry) => entry.id === connection.toNodeId)
  if (!child || child.node.schema.title !== VFX_ANIMATED_VECTOR3_TITLE) {
    return null
  }
  return child
}

/** Keyframe único em t=0 — alinhado ao constantValue do embed. */
export function isSingleKeyframeDynamicsAtZero(timesRaw: string): boolean {
  const times = parseListF32String(timesRaw.trim())
  return times.length === 1 && Math.abs(times[0] ?? 0) < 1e-6
}

/**
 * Quando `constantValue` de ValueVector3 muda, replica no filho dynamics (values @ t=0)
 * para o export Preview não divergir do cartão.
 */
export function syncValueVector3ConstantToDynamicsChild(
  scene: CanvasScene,
  valueVector3NodeId: string,
  constantValue: string,
): CanvasScene {
  const parent = scene.nodes.find((entry) => entry.id === valueVector3NodeId)
  if (!parent || parent.node.schema.title !== 'ValueVector3') {
    return scene
  }

  const child = dynamicsChildFromValueVector3(scene, parent)
  if (!child) {
    return scene
  }

  const timesParam = child.node.schema.parameters.find((entry) => entry.name === 'times')
  const valuesParam = child.node.schema.parameters.find((entry) => entry.name === 'values')
  if (!timesParam || !valuesParam) {
    return scene
  }

  const timesRaw = parameterValue(child.node, timesParam.id, timesParam.defaultValue)
  if (!isSingleKeyframeDynamicsAtZero(timesRaw)) {
    return scene
  }

  const normalized = normalizeVector3String(constantValue)
  const listValues = normalizeListVector3String(normalized)

  const nextChildValues = patchParameterValue(
    patchParameterValue(child.node.values, valuesParam.id, listValues),
    timesParam.id,
    timesRaw,
  )

  return {
    ...scene,
    nodes: scene.nodes.map((entry) =>
      entry.id === child.id
        ? {
            ...entry,
            node: {
              ...entry.node,
              values: nextChildValues,
            },
          }
        : entry,
    ),
  }
}

function constantValueForValueVector3(node: CanvasNode): string | null {
  if (node.node.schema.title !== 'ValueVector3') {
    return null
  }
  const constantParam = node.node.schema.parameters.find((entry) => entry.name === 'constantValue')
  if (!constantParam) {
    return null
  }
  const raw =
    node.node.values.find((entry) => entry.parameterId === constantParam.id)?.value ??
    constantParam.defaultValue
  const trimmed = raw.trim()
  return trimmed.length > 0 ? trimmed : null
}

/**
 * Alinha todos os ValueVector3 com keyframe único em t=0 antes de exportar ritual
 * (Preview VFX / «Ver código») — cobre cenas já desalinhadas sem re-editar o cartão.
 */
export function syncAllValueVector3ConstantsToDynamicsInScene(scene: CanvasScene): CanvasScene {
  let next = scene
  for (const node of scene.nodes) {
    const constantValue = constantValueForValueVector3(node)
    if (!constantValue) {
      continue
    }
    next = syncValueVector3ConstantToDynamicsChild(next, node.id, constantValue)
  }
  return next
}

export function applyValueVector3ConstantSyncOnParameterUpdate(
  scene: CanvasScene,
  nodeId: string,
  parameterId: string,
  value: string,
): CanvasScene {
  const node = scene.nodes.find((entry) => entry.id === nodeId)
  if (!node || node.node.schema.title !== 'ValueVector3') {
    return scene
  }

  const constantParam = node.node.schema.parameters.find((entry) => entry.name === 'constantValue')
  if (!constantParam || constantParam.id !== parameterId) {
    return scene
  }

  return syncValueVector3ConstantToDynamicsChild(scene, nodeId, value)
}
