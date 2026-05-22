import type { CanvasConnection, CanvasNode, CanvasScene } from '@/core/canvasScene'
import { MAIN_SCHEMA_ID } from '@/core/classGroupRitualStackParser'
import { findEmbedBySlotId } from '@/core/embedSlots'
import { findList2EmbedByInstanceSlotId } from '@/core/list2EmbedSlots'
import { findList2PointerByInstanceSlotId } from '@/core/list2PointerSlots'
import { findListEmbedBySlotId } from '@/core/listEmbedSlots'
import { findListPointerBySlotId } from '@/core/listPointerSlots'
import {
  findMapHashEmbedEntryBySlotId,
  isMapHashEmbedSlotId,
  parseMapHashEmbedSlotId,
} from '@/core/mapHashEmbedSlots'
import { isMapHashPointerSlotId, parseMapHashPointerSlotId } from '@/core/mapHashPointerSlots'
import { isMapU64PointerSlotId, parseMapU64PointerSlotId } from '@/core/mapU64PointerSlots'
import { isMapHashParameterType } from '@/core/nodeDataTypeToRitType'
import type { NodeInstance, NodeSchemaDefinition } from '@/core/nodeSchema'
import { parseMapHashEmbedString } from '@/core/mapHashEmbedValue'
import { findPointerBySlotId } from '@/core/pointerSlots'
import {
  formatMapEntryKey,
  formatRitualScalarAssignment,
} from '@/core/ritualValueFormat'
import { ritualExportBlockTitle, ritualExportFieldName } from '@/core/ritualFieldNames'

const INDENT_STEP = 4
const PROGRESS_BATCH = 25

export type CanvasToClassGroupRitualResult =
  | { ok: true; text: string; warnings: string[] }
  | { ok: false; error: string }

export type CanvasToRitualProgress = { label: string; ratio: number }

export type OutgoingLink =
  | { kind: 'internal'; fieldName: string; childCanvasId: string }
  | { kind: 'embed'; fieldName: string; childCanvasId: string }
  | { kind: 'pointer'; fieldName: string; childCanvasId: string }
  | { kind: 'listEmbed'; fieldName: string; index: number; childCanvasId: string }
  | { kind: 'listPointer'; fieldName: string; index: number; childCanvasId: string }
  | { kind: 'list2Embed'; fieldName: string; instanceIndex: number; childCanvasId: string }
  | { kind: 'list2Pointer'; fieldName: string; instanceIndex: number; childCanvasId: string }
  | { kind: 'mapHashEmbed'; parameterName: string; entryKey: string; childCanvasId: string }
  | { kind: 'mapHashPointer'; parameterName: string; entryKey: string; childCanvasId: string }
  | { kind: 'mapU64Pointer'; parameterName: string; entryKey: string; childCanvasId: string }

function indent(level: number): string {
  return ' '.repeat(level)
}

function normalizeMapKey(key: string): string {
  return key.trim().replace(/\s+/g, '_')
}

function parameterValue(node: NodeInstance, parameterId: string, fallback = ''): string {
  return node.values.find((entry) => entry.parameterId === parameterId)?.value ?? fallback
}

function valuesByParameterId(node: NodeInstance): Record<string, string> {
  const out: Record<string, string> = {}
  for (const parameter of node.schema.parameters) {
    out[parameter.id] = parameterValue(node, parameter.id, parameter.defaultValue)
  }
  return out
}

function findCanvasNode(scene: CanvasScene, nodeId: string): CanvasNode | undefined {
  return scene.nodes.find((entry) => entry.id === nodeId)
}

function findMainNodes(scene: CanvasScene): CanvasNode[] {
  return scene.nodes.filter((entry) => entry.node.schema.id === MAIN_SCHEMA_ID)
}

function collectSubtreeNodeIds(scene: CanvasScene, rootId: string): Set<string> {
  const reached = new Set<string>()
  const queue = [rootId]

  while (queue.length > 0) {
    const current = queue.shift()!
    if (reached.has(current)) {
      continue
    }
    reached.add(current)

    for (const connection of scene.connections) {
      if (connection.fromNodeId === current && !reached.has(connection.toNodeId)) {
        queue.push(connection.toNodeId)
      }
    }
  }

  return reached
}

function classifyOutgoingLink(parent: CanvasNode, connection: CanvasConnection): OutgoingLink | null {
  const slotId = connection.fromInternalStructureId
  const schema = parent.node.schema
  const values = valuesByParameterId(parent.node)

  if (isMapHashEmbedSlotId(slotId)) {
    const hit = findMapHashEmbedEntryBySlotId(schema, slotId, values)
    if (hit) {
      return {
        kind: 'mapHashEmbed',
        parameterName: hit.parameter.name,
        entryKey: hit.entry.key,
        childCanvasId: connection.toNodeId,
      }
    }
    const parsed = parseMapHashEmbedSlotId(slotId)
    if (parsed) {
      const param = schema.parameters.find((p) => p.id === parsed.parameterId)
      if (param) {
        return {
          kind: 'mapHashEmbed',
          parameterName: param.name,
          entryKey: parsed.key.replace(/_/g, '/'),
          childCanvasId: connection.toNodeId,
        }
      }
    }
  }

  if (isMapHashPointerSlotId(slotId)) {
    const parsed = parseMapHashPointerSlotId(slotId)
    if (parsed) {
      const param = schema.parameters.find((p) => p.id === parsed.parameterId)
      if (param) {
        return {
          kind: 'mapHashPointer',
          parameterName: param.name,
          entryKey: parsed.key,
          childCanvasId: connection.toNodeId,
        }
      }
    }
  }

  if (isMapU64PointerSlotId(slotId)) {
    const parsed = parseMapU64PointerSlotId(slotId)
    if (parsed) {
      const param = schema.parameters.find((p) => p.id === parsed.parameterId)
      if (param) {
        return {
          kind: 'mapU64Pointer',
          parameterName: param.name,
          entryKey: parsed.key,
          childCanvasId: connection.toNodeId,
        }
      }
    }
  }

  const list2Embed = findList2EmbedByInstanceSlotId(schema, slotId)
  if (list2Embed) {
    const instanceIndex = list2Embed.block.instances.findIndex((i) => i.id === list2Embed.instance.id)
    return {
      kind: 'list2Embed',
      fieldName: list2Embed.block.title,
      instanceIndex: instanceIndex >= 0 ? instanceIndex : 0,
      childCanvasId: connection.toNodeId,
    }
  }

  const list2Pointer = findList2PointerByInstanceSlotId(schema, slotId)
  if (list2Pointer) {
    const instanceIndex = list2Pointer.block.instances.findIndex(
      (i) => i.id === list2Pointer.instance.id,
    )
    return {
      kind: 'list2Pointer',
      fieldName: list2Pointer.block.title,
      instanceIndex: instanceIndex >= 0 ? instanceIndex : 0,
      childCanvasId: connection.toNodeId,
    }
  }

  const listEmbed = findListEmbedBySlotId(schema, slotId)
  if (listEmbed) {
    return {
      kind: 'listEmbed',
      fieldName: listEmbed.listEmbed.title,
      index: listEmbed.slotIndex,
      childCanvasId: connection.toNodeId,
    }
  }

  const listPointer = findListPointerBySlotId(schema, slotId)
  if (listPointer) {
    return {
      kind: 'listPointer',
      fieldName: listPointer.listPointer.title,
      index: listPointer.slotIndex,
      childCanvasId: connection.toNodeId,
    }
  }

  const embed = findEmbedBySlotId(schema, slotId)
  if (embed) {
    return {
      kind: 'embed',
      fieldName: embed.embed.title,
      childCanvasId: connection.toNodeId,
    }
  }

  const pointer = findPointerBySlotId(schema, slotId)
  if (pointer) {
    return {
      kind: 'pointer',
      fieldName: pointer.pointer.title,
      childCanvasId: connection.toNodeId,
    }
  }

  const internal = schema.internalStructures.find((slot) => slot.id === slotId)
  if (internal) {
    return {
      kind: 'internal',
      fieldName: internal.name,
      childCanvasId: connection.toNodeId,
    }
  }

  return null
}

function resolveOutgoingLinks(parent: CanvasNode, scene: CanvasScene): OutgoingLink[] {
  const links: OutgoingLink[] = []

  for (const connection of scene.connections) {
    if (connection.fromNodeId !== parent.id) {
      continue
    }
    const link = classifyOutgoingLink(parent, connection)
    if (link) {
      links.push(link)
    }
  }

  return links
}

function partitionLinks(links: readonly OutgoingLink[]) {
  const linksByEmbed = new Map<string, OutgoingLink[]>()
  const linksByPointer = new Map<string, OutgoingLink[]>()
  const linksByListEmbed = new Map<string, OutgoingLink[]>()
  const linksByListPointer = new Map<string, OutgoingLink[]>()
  const linksByList2Embed = new Map<string, OutgoingLink[]>()
  const linksByList2Pointer = new Map<string, OutgoingLink[]>()
  const internalLinks: OutgoingLink[] = []

  for (const link of links) {
    switch (link.kind) {
      case 'embed': {
        const bucket = linksByEmbed.get(link.fieldName) ?? []
        bucket.push(link)
        linksByEmbed.set(link.fieldName, bucket)
        break
      }
      case 'pointer': {
        const bucket = linksByPointer.get(link.fieldName) ?? []
        bucket.push(link)
        linksByPointer.set(link.fieldName, bucket)
        break
      }
      case 'listEmbed': {
        const bucket = linksByListEmbed.get(link.fieldName) ?? []
        bucket.push(link)
        linksByListEmbed.set(link.fieldName, bucket)
        break
      }
      case 'listPointer': {
        const bucket = linksByListPointer.get(link.fieldName) ?? []
        bucket.push(link)
        linksByListPointer.set(link.fieldName, bucket)
        break
      }
      case 'list2Embed': {
        const bucket = linksByList2Embed.get(link.fieldName) ?? []
        bucket.push(link)
        linksByList2Embed.set(link.fieldName, bucket)
        break
      }
      case 'list2Pointer': {
        const bucket = linksByList2Pointer.get(link.fieldName) ?? []
        bucket.push(link)
        linksByList2Pointer.set(link.fieldName, bucket)
        break
      }
      case 'internal':
        internalLinks.push(link)
        break
      default:
        break
    }
  }

  return {
    linksByEmbed,
    linksByPointer,
    linksByListEmbed,
    linksByListPointer,
    linksByList2Embed,
    linksByList2Pointer,
    internalLinks,
  }
}

class RitualEmitter {
  readonly scene: CanvasScene

  readonly registry: Record<string, NodeSchemaDefinition>

  readonly warnings: string[] = []

  readonly visitedBodies = new Set<string>()

  private emittedNodes = 0

  private readonly totalNodes: number

  constructor(
    scene: CanvasScene,
    registry: Record<string, NodeSchemaDefinition>,
    rootId: string,
  ) {
    this.scene = scene
    this.registry = registry
    this.totalNodes = collectSubtreeNodeIds(scene, rootId).size
  }

  childTitle(childCanvasId: string): string {
    const node = findCanvasNode(this.scene, childCanvasId)
    return node?.node.schema.title ?? 'Unknown'
  }

  emitTypeBody(canvasNode: CanvasNode, depth: number): string[] {
    if (this.visitedBodies.has(canvasNode.id)) {
      return []
    }
    this.visitedBodies.add(canvasNode.id)
    this.emittedNodes += 1

    const lines: string[] = []
    const pad = indent(depth)
    const instance = canvasNode.node
    const schema = instance.schema
    const links = resolveOutgoingLinks(canvasNode, this.scene)
    const partitioned = partitionLinks(links)

    for (const parameter of schema.parameters) {
      if (isMapHashParameterType(parameter.type)) {
        continue
      }
      if (parameter.type === 'comment' || parameter.type === 'property') {
        continue
      }
      const raw = parameterValue(instance, parameter.id, parameter.defaultValue)
      lines.push(`${pad}${formatRitualScalarAssignment(parameter, raw, pad)}`)
    }

    for (const link of partitioned.internalLinks) {
      const child = findCanvasNode(this.scene, link.childCanvasId)
      if (!child) {
        this.warnings.push(`Filho «${link.childCanvasId}» não encontrado para «${link.fieldName}».`)
        continue
      }
      const fieldName = ritualExportFieldName(link.fieldName)
      const childTitle = this.childTitle(link.childCanvasId)
      const bodyDepth = depth + INDENT_STEP
      lines.push(`${pad}${fieldName}: link = ${childTitle} {`)
      lines.push(...this.emitTypeBody(child, bodyDepth))
      lines.push(`${pad}}`)
    }

    for (const block of schema.embed ?? []) {
      const fieldName = ritualExportBlockTitle(block.title)
      const fieldLinks = partitioned.linksByEmbed.get(block.title) ?? []
      const child = fieldLinks[0] ? findCanvasNode(this.scene, fieldLinks[0].childCanvasId) : null
      const childTitle = child
        ? this.childTitle(child.id)
        : block.internalStructures[0]?.name ?? block.title
      const bodyDepth = depth + INDENT_STEP
      lines.push(`${pad}${fieldName}: embed = ${childTitle} {`)
      if (child) {
        lines.push(...this.emitTypeBody(child, bodyDepth))
      }
      lines.push(`${pad}}`)
    }

    for (const block of schema.pointer ?? []) {
      const fieldName = ritualExportBlockTitle(block.title)
      const fieldLinks = partitioned.linksByPointer.get(block.title) ?? []
      const child = fieldLinks[0] ? findCanvasNode(this.scene, fieldLinks[0].childCanvasId) : null
      const childTitle = child
        ? this.childTitle(child.id)
        : block.internalStructures[0]?.name ?? block.title
      const bodyDepth = depth + INDENT_STEP
      lines.push(`${pad}${fieldName}: pointer = ${childTitle} {`)
      if (child) {
        lines.push(...this.emitTypeBody(child, bodyDepth))
      }
      lines.push(`${pad}}`)
    }

    for (const block of schema.listEmbed ?? []) {
      const fieldName = ritualExportBlockTitle(block.title)
      const fieldLinks = (partitioned.linksByListEmbed.get(block.title) ?? []).sort(
        (a, b) => a.index - b.index,
      )
      const bodyDepth = depth + INDENT_STEP
      const itemPad = indent(bodyDepth)
      lines.push(`${pad}${fieldName}: list[embed] = {`)
      for (const link of fieldLinks) {
        const child = findCanvasNode(this.scene, link.childCanvasId)
        if (!child) {
          continue
        }
        const childTitle = this.childTitle(link.childCanvasId)
        const itemBodyDepth = bodyDepth + INDENT_STEP
        lines.push(`${itemPad}${childTitle} {`)
        lines.push(...this.emitTypeBody(child, itemBodyDepth))
        lines.push(`${itemPad}}`)
      }
      lines.push(`${pad}}`)
    }

    for (const block of schema.listPointer ?? []) {
      const fieldName = ritualExportBlockTitle(block.title)
      const fieldLinks = (partitioned.linksByListPointer.get(block.title) ?? []).sort(
        (a, b) => a.index - b.index,
      )
      const bodyDepth = depth + INDENT_STEP
      const itemPad = indent(bodyDepth)
      lines.push(`${pad}${fieldName}: list[pointer] = {`)
      for (const link of fieldLinks) {
        const child = findCanvasNode(this.scene, link.childCanvasId)
        if (!child) {
          continue
        }
        const childTitle = this.childTitle(link.childCanvasId)
        const itemBodyDepth = bodyDepth + INDENT_STEP
        lines.push(`${itemPad}${childTitle} {`)
        lines.push(...this.emitTypeBody(child, itemBodyDepth))
        lines.push(`${itemPad}}`)
      }
      lines.push(`${pad}}`)
    }

    for (const block of schema.list2Embed ?? []) {
      const fieldName = ritualExportBlockTitle(block.title)
      const fieldLinks = (partitioned.linksByList2Embed.get(block.title) ?? []).sort(
        (a, b) => a.instanceIndex - b.instanceIndex,
      )
      const bodyDepth = depth + INDENT_STEP
      const itemPad = indent(bodyDepth)
      lines.push(`${pad}${fieldName}: list2[embed] = {`)
      for (const link of fieldLinks) {
        const child = findCanvasNode(this.scene, link.childCanvasId)
        if (!child) {
          continue
        }
        const childTitle = this.childTitle(link.childCanvasId)
        const itemBodyDepth = bodyDepth + INDENT_STEP
        lines.push(`${itemPad}${childTitle} {`)
        lines.push(...this.emitTypeBody(child, itemBodyDepth))
        lines.push(`${itemPad}}`)
      }
      lines.push(`${pad}}`)
    }

    for (const block of schema.list2Pointer ?? []) {
      const fieldName = ritualExportBlockTitle(block.title)
      const fieldLinks = (partitioned.linksByList2Pointer.get(block.title) ?? []).sort(
        (a, b) => a.instanceIndex - b.instanceIndex,
      )
      const bodyDepth = depth + INDENT_STEP
      const itemPad = indent(bodyDepth)
      lines.push(`${pad}${fieldName}: list2[pointer] = {`)
      for (const link of fieldLinks) {
        const child = findCanvasNode(this.scene, link.childCanvasId)
        if (!child) {
          continue
        }
        const childTitle = this.childTitle(link.childCanvasId)
        const itemBodyDepth = bodyDepth + INDENT_STEP
        lines.push(`${itemPad}${childTitle} {`)
        lines.push(...this.emitTypeBody(child, itemBodyDepth))
        lines.push(`${itemPad}}`)
      }
      lines.push(`${pad}}`)
    }

    return lines
  }
}

function buildOrderedEntryLinks(
  mainNode: CanvasNode,
  scene: CanvasScene,
  entriesParam: NodeSchemaDefinition['parameters'][number],
  entryLinks: OutgoingLink[],
  warnings: string[],
): OutgoingLink[] {
  const instance = mainNode.node
  const raw =
    parameterValue(instance, entriesParam.id, entriesParam.defaultValue) ?? entriesParam.defaultValue
  const catalog = parseMapHashEmbedString(raw)

  const linkByKey = new Map<string, OutgoingLink>()
  for (const link of entryLinks) {
    linkByKey.set(normalizeMapKey(link.entryKey), link)
  }

  const ordered: OutgoingLink[] = []
  const used = new Set<string>()

  for (const entry of catalog) {
    const key = normalizeMapKey(entry.key)
    const link = linkByKey.get(key)
    if (link) {
      ordered.push(link)
      used.add(key)
    } else {
      warnings.push(`Entrada «${entry.key}» em entries sem nó ligado na cena.`)
    }
  }

  for (const link of entryLinks) {
    const key = normalizeMapKey(link.entryKey)
    if (!used.has(key)) {
      ordered.push(link)
      warnings.push(`Ligação entries «${link.entryKey}» não está no catálogo mapHashEmbed.`)
    }
  }

  return ordered
}

function emitMainPropFile(
  mainNode: CanvasNode,
  scene: CanvasScene,
  registry: Record<string, NodeSchemaDefinition>,
): { text: string; warnings: string[] } {
  const emitter = new RitualEmitter(scene, registry, mainNode.id)
  const lines: string[] = ['#PROP_text']
  const instance = mainNode.node
  const schema = instance.schema
  const mainTemplate = registry[MAIN_SCHEMA_ID] ?? schema
  const links = resolveOutgoingLinks(mainNode, scene)
  const entryLinks = links.filter((l) => l.kind === 'mapHashEmbed' && l.parameterName === 'entries')

  const metaOrder = ['type', 'version', 'linked'] as const
  for (const name of metaOrder) {
    const parameter =
      schema.parameters.find((p) => p.name === name) ??
      mainTemplate.parameters.find((p) => p.name === name)
    if (!parameter) {
      continue
    }
    const raw = parameterValue(instance, parameter.id, parameter.defaultValue)
    lines.push(formatRitualScalarAssignment(parameter, raw, '', { fieldName: name }))
  }

  const entriesParam =
    schema.parameters.find((p) => p.name === 'entries' && p.type === 'mapHashEmbed') ??
    mainTemplate.parameters.find((p) => p.name === 'entries' && p.type === 'mapHashEmbed')

  if (entriesParam) {
    lines.push('entries: map[hash,embed] = {')
    const orderedLinks = buildOrderedEntryLinks(
      mainNode,
      scene,
      entriesParam,
      entryLinks,
      emitter.warnings,
    )

    for (const link of orderedLinks) {
      const child = findCanvasNode(scene, link.childCanvasId)
      const typeTitle = child?.node.schema.title ?? 'Unknown'
      const keyLabel = formatMapEntryKey(link.entryKey)
      lines.push(`    ${keyLabel} = ${typeTitle} {`)
      if (child) {
        lines.push(...emitter.emitTypeBody(child, 8))
      }
      lines.push('    }')
    }
    lines.push('}')
  } else {
    emitter.warnings.push('Parâmetro «entries» (mapHashEmbed) não encontrado em Main.')
  }

  return { text: `${lines.join('\n')}\n`, warnings: emitter.warnings }
}

export function canvasToClassGroupRitual(
  scene: CanvasScene,
  _registry: Record<string, NodeSchemaDefinition>,
): CanvasToClassGroupRitualResult {
  const mainNodes = findMainNodes(scene)

  if (mainNodes.length === 0) {
    return {
      ok: false,
      error: 'A cena não contém nenhum nó Main (schema id «main»). Adicione Main antes de exportar.',
    }
  }

  if (mainNodes.length > 1) {
    return {
      ok: false,
      error: `A cena contém ${String(mainNodes.length)} nós Main; deve existir exactamente um.`,
    }
  }

  const mainNode = mainNodes[0]!
  const { text, warnings } = emitMainPropFile(mainNode, scene, _registry)

  if (!text.includes('entries: map[hash,embed]')) {
    return {
      ok: false,
      error: 'Exportação incompleta: bloco entries: map[hash,embed] em falta.',
    }
  }

  return { ok: true, text, warnings }
}

export async function canvasToClassGroupRitualWithProgress(
  scene: CanvasScene,
  registry: Record<string, NodeSchemaDefinition>,
  onProgress?: (progress: CanvasToRitualProgress) => void,
): Promise<CanvasToClassGroupRitualResult> {
  onProgress?.({ label: 'A localizar nó Main…', ratio: 0.05 })
  await new Promise<void>((resolve) => {
    window.requestAnimationFrame(() => resolve())
  })

  const mainNodes = findMainNodes(scene)
  if (mainNodes.length !== 1) {
    return canvasToClassGroupRitual(scene, registry)
  }

  onProgress?.({ label: 'A serializar parâmetros…', ratio: 0.2 })
  await new Promise<void>((resolve) => {
    window.requestAnimationFrame(() => resolve())
  })

  onProgress?.({ label: 'A emitir entries e subárvore…', ratio: 0.55 })
  const result = canvasToClassGroupRitual(scene, registry)

  onProgress?.({ label: 'A concluir…', ratio: 0.95 })
  await new Promise<void>((resolve) => {
    window.requestAnimationFrame(() => resolve())
  })

  if (result.ok) {
    onProgress?.({ label: 'Concluído', ratio: 1 })
  }

  return result
}
