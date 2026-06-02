import type { OutgoingLink } from './canvasToClassGroupRitual'
import { classifyOutgoingLink } from './canvasToClassGroupRitual'
import type { CanvasNode, CanvasScene } from './canvasScene'
import type { BlockInspectorDraft, BlockStructurePayload } from './blockSchema'
import type { NodeSchemaDefinition } from './nodeSchema'
import { humanizeParameterDisplayName, sanitizeBlockParameterFileStem } from './blockParameterJson'
import { blockTypeDefinitionById } from './blockStructureRegistry'
import { templatizeSchemaNodeId } from './blockParameterIdTemplate'
import { findIncomingConnections } from './slotPeerFocus'
import { isEmptyStructBlockSchema } from './nodeSchema'

export type BlockDefinitionJsonSource = {
  kind: 'block'
  nodeId: string
}

export type BlockDefinitionJsonDocument = {
  id: string
  block: string
  blockName: string
  type: string
  name: string
  source: BlockDefinitionJsonSource
  color: string
  headerSlots: string[]
  parameters: string[]
}

export type BlockParentContext = {
  block: string
  type: string
}

export type BuildBlockDefinitionJsonResult =
  | { ok: true; document: BlockDefinitionJsonDocument }
  | { ok: false; error: string }

const DEFAULT_BLOCK_COLOR = '#40ff56'

export function resolveBlockDisplayName(draftBlockName: string): string {
  const trimmed = draftBlockName.trim()
  if (!trimmed) {
    return ''
  }
  if (!trimmed.includes('_')) {
    return trimmed
  }
  return humanizeParameterDisplayName(trimmed)
}

export function buildBlockDefinitionDocumentId(blockType: string, displayName: string): string {
  return `${blockType.trim()}_${displayName.trim()}`
}

export function mapOutgoingLinkKindToBlockType(kind: OutgoingLink['kind']): string {
  switch (kind) {
    case 'listPointer':
    case 'pointer':
    case 'list2Pointer':
    case 'mapHashPointer':
    case 'mapU64Pointer':
      return 'pointer'
    case 'embed':
    case 'listEmbed':
    case 'list2Embed':
    case 'mapHashEmbed':
      return 'embed'
    case 'internal':
      return 'internal'
    default:
      return 'standalone'
  }
}

export function resolveParentFieldNameFromLink(link: OutgoingLink): string {
  switch (link.kind) {
    case 'mapHashEmbed':
    case 'mapHashPointer':
    case 'mapU64Pointer':
      return link.parameterName
    default:
      return link.fieldName
  }
}

export function resolveBlockParentContext(
  scene: CanvasScene,
  canvasNode: CanvasNode,
  fallbackBlockType: string,
): BlockParentContext {
  const incoming = findIncomingConnections(scene, canvasNode.id)
  if (incoming.length === 0) {
    return { block: fallbackBlockType.trim() || 'block', type: 'standalone' }
  }

  const connection = incoming[0]!
  const parent = scene.nodes.find((entry) => entry.id === connection.fromNodeId)
  if (!parent) {
    return { block: fallbackBlockType.trim() || 'block', type: 'standalone' }
  }

  const link = classifyOutgoingLink(parent, connection)
  if (!link) {
    return { block: fallbackBlockType.trim() || 'block', type: 'standalone' }
  }

  return {
    block: resolveParentFieldNameFromLink(link),
    type: mapOutgoingLinkKindToBlockType(link.kind),
  }
}

export function buildBlockHeaderSlots(parentBlock: string, blockName: string): string[] {
  const parent = parentBlock.trim() || blockName.trim()
  const typeId = blockName.trim()
  return [`in[${parent}]`, `out[${typeId}Preview]`]
}

export function buildBlockDefinitionJsonDocument(
  draft: BlockInspectorDraft,
  scene: CanvasScene,
  canvasNode: CanvasNode,
): BuildBlockDefinitionJsonResult {
  const blockName = draft.blockType.trim()
  if (!blockName) {
    return { ok: false, error: 'blockType em falta no rascunho' }
  }

  const name = resolveBlockDisplayName(draft.blockName)
  if (!name) {
    return { ok: false, error: 'name em falta' }
  }
  if (name.includes('_')) {
    return { ok: false, error: `name não pode conter "_": ${name}` }
  }

  const exposed = draft.entries.filter((entry) => entry.exposed)
  if (exposed.length === 0 && !isEmptyStructBlockSchema(canvasNode.node.schema)) {
    return { ok: false, error: 'Nenhum parâmetro exposto' }
  }

  const id = buildBlockDefinitionDocumentId(blockName, name)
  const stem = sanitizeBlockParameterFileStem(id)
  if (!stem) {
    return { ok: false, error: `id inválido para ficheiro: ${id}` }
  }

  const parentContext = resolveBlockParentContext(scene, canvasNode, blockName)
  const schemaId = canvasNode.node.schema.id.trim()
  const nodeId = templatizeSchemaNodeId(schemaId, blockName)
  const color = blockTypeDefinitionById(blockName)?.color ?? DEFAULT_BLOCK_COLOR

  return {
    ok: true,
    document: {
      id,
      block: parentContext.block,
      blockName,
      type: parentContext.type,
      name,
      source: {
        kind: 'block',
        nodeId,
      },
      color,
      headerSlots: buildBlockHeaderSlots(parentContext.block, blockName),
      parameters: exposed.map((entry) => entry.ritualName.trim()).filter(Boolean),
    },
  }
}

function normalizeBlockTitleKey(title: string | undefined | null): string {
  if (typeof title !== 'string') {
    return ''
  }
  return title.replace(/\s+/g, '').trim()
}

function schemaTitleCandidates(schema: NodeSchemaDefinition): string[] {
  const candidates: string[] = []
  if (typeof schema.title === 'string') {
    const title = schema.title.trim()
    if (title) {
      candidates.push(title)
    }
  }
  const collection = schema.nomenclature?.collectionType
  if (typeof collection === 'string') {
    const trimmed = collection.trim()
    if (trimmed) {
      candidates.push(trimmed)
    }
  }
  return candidates
}

/** Procura schema Class Group pelo `title` (= blockName da definição de bloco). */
export function resolveSchemaIdForBlockDefinition(
  blockName: string,
  schemaRegistry: Record<string, NodeSchemaDefinition>,
): string | null {
  const target = blockName.trim()
  if (!target) {
    return null
  }
  const targetNorm = normalizeBlockTitleKey(target)

  for (const schema of Object.values(schemaRegistry)) {
    for (const candidate of schemaTitleCandidates(schema)) {
      if (candidate === target || normalizeBlockTitleKey(candidate) === targetNorm) {
        return schema.id
      }
    }
  }

  return null
}

export function buildEmptyBlockStructureFromDefinition(
  definition: BlockDefinitionJsonDocument,
): BlockStructurePayload {
  return {
    blockType: definition.blockName.trim(),
    blockName: definition.name.trim(),
    parameters: [],
    identification_codes: [],
    appearance: {
      color: definition.color,
      headerSlots: [...definition.headerSlots],
      parentBlockField: definition.block.trim(),
    },
  }
}
