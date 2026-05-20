/**
 * Conversor Class Group com pilha de escopo e profundidade ilimitada.
 * Parâmetros simples → parameters[]; estruturais → internalStructures + schemas filhos.
 */

import { classifyFieldLine } from '@/core/binNomenclatureAnalyzer'
import {
  FIELD_SCALAR_BRACED_REGEX,
  FIELD_SCALAR_REGEX,
  INLINE_CHILD_OPEN_REGEX,
  INLINE_EMBED_OPEN_REGEX,
  INLINE_LINK_OPEN_REGEX,
  INLINE_POINTER_OPEN_REGEX,
  INLINE_POINTER_LINK_OPEN_REGEX,
  LIST_EMBED_OPEN_REGEX,
  MAP_ENTRY_HEAD_REGEX,
  STRUCT_ONLY_LINE,
  classifyRitualLine,
  isEmbedList2Type,
  isEmbedListType,
  isPointerList2Type,
  isPointerListType,
  isPrimitiveListType,
  isPrimitiveRitType,
  isStructuralListType,
} from '@/core/classGroupFieldClassifier'
import {
  nodeBaseEmbedId,
  nodeBaseList2EmbedId,
  nodeBaseList2PointerId,
  nodeBaseListEmbedId,
  nodeBaseListPointerId,
  nodeBasePointerId,
} from '@/core/extractNodeBaseParameters'
import { listPointerSlotId } from '@/core/listPointerSlots'
import { pointerSlotId } from '@/core/pointerSlots'
import { formatRgbaString, parseRgbaString } from '@/core/rgbaColor'
import { normalizeBoolString } from '@/core/boolValue'
import { formatVector2String, parseVector2String } from '@/core/vector2Value'
import {
  isListF32RitType,
  normalizeListF32RitualBody,
  normalizeListF32String,
} from '@/core/listF32Value'
import {
  isOptionF32RitType,
  isOptionStringRitType,
  isOptionVec3RitType,
  normalizeOptionF32String,
  normalizeOptionStringString,
  normalizeOptionVector3String,
  resolveOptionParameterType,
} from '@/core/optionValue'
import {
  isMapHashLinkRitType,
  normalizeMapHashLinkRitualBody,
  normalizeMapHashLinkString,
  resolveMapHashLinkParameterType,
} from '@/core/mapHashLinkValue'
import {
  formatMapHashEmbedString,
  isMapHashEmbedRitType,
  parseMapHashEmbedString,
  resolveMapHashEmbedParameterType,
} from '@/core/mapHashEmbedValue'
import {
  formatMapHashPointerString,
  isMapHashPointerRitType,
  parseMapHashPointerString,
  type MapHashPointerEntry,
  resolveMapHashPointerParameterType,
} from '@/core/mapHashPointerValue'
import {
  formatMapU64PointerString,
  isMapU64PointerRitType,
  parseMapU64PointerString,
  resolveMapU64PointerParameterType,
  type MapU64PointerEntry,
} from '@/core/mapU64PointerValue'
import {
  isListHashRitType,
  normalizeListHashRitualBody,
  normalizeListHashString,
} from '@/core/listHashValue'
import {
  isListStringRitType,
  normalizeListStringRitualBody,
  normalizeListStringString,
} from '@/core/listStringValue'
import {
  isListVec2RitType,
  normalizeListVec2RitualBody,
  normalizeListVector2String,
} from '@/core/listVector2Value'
import {
  isListVec3RitType,
  normalizeListVec3RitualBody,
  normalizeListVector3String,
} from '@/core/listVector3Value'
import {
  isListVec4RitType,
  normalizeListVec4RitualBody,
  normalizeListVector4String,
} from '@/core/listVector4Value'
import { formatVector3String, parseVector3String } from '@/core/vector3Value'
import { embedSlotId } from '@/core/embedSlots'
import type {
  EmbedDefinition,
  List2EmbedDefinition,
  List2PointerDefinition,
  ListEmbedDefinition,
  ListPointerDefinition,
  NodeDataType,
  NodeSchemaDefinition,
  NomenclaturePathSegment,
  PointerDefinition,
} from '@/core/nodeSchema'
import { slugifyStructureId } from '@/core/convertRitobinTextToNodeStructures'
import { nodeBaseParameterId } from '@/core/extractNodeBaseParameters'

export type MutableClassGroupSchema = Omit<
  NodeSchemaDefinition,
  | 'parameters'
  | 'internalStructures'
  | 'embed'
  | 'pointer'
  | 'listEmbed'
  | 'listPointer'
  | 'list2Embed'
  | 'list2Pointer'
> & {
  parameters: NodeSchemaDefinition['parameters']
  internalStructures: NodeSchemaDefinition['internalStructures']
  embed: EmbedDefinition[]
  pointer: PointerDefinition[]
  listEmbed: ListEmbedDefinition[]
  listPointer: ListPointerDefinition[]
  list2Embed: List2EmbedDefinition[]
  list2Pointer: List2PointerDefinition[]
}

export const MAIN_SCHEMA_ID = 'main'
export const MAIN_SCHEMA_TITLE = 'Main'

type ScopeKind = 'entries' | 'entity' | 'internal' | 'listItem'

type ScopeFrame = {
  segmentId: string
  typeName: string
  schemaId: string
  kind: ScopeKind
  openingLine: string
}

const OPTION_BLOCK_OPEN_REGEX =
  /^\s*([A-Za-z_]\w*)\s*:\s*(option\[[^\]]+\])\s*=\s*\{\s*$/

const MAP_HASH_LINK_BLOCK_OPEN_REGEX =
  /^\s*([A-Za-z_]\w*)\s*:\s*(map\[hash,link\])\s*=\s*\{\s*$/i

const MAP_HASH_POINTER_BLOCK_OPEN_REGEX =
  /^\s*([A-Za-z_]\w*)\s*:\s*(map\[hash,pointer\])\s*=\s*\{\s*$/i

const MAP_HASH_EMBED_BLOCK_OPEN_REGEX =
  /^\s*([A-Za-z_]\w*)\s*:\s*(map\[hash,embed\])\s*=\s*\{\s*$/i

const MAP_U64_POINTER_BLOCK_OPEN_REGEX =
  /^\s*([A-Za-z_]\w*)\s*:\s*(map\[u64,pointer\])\s*=\s*\{\s*$/i

const MAP_HASH_STRUCTURE_ENTRY_HEAD_REGEX =
  /^\s*(?:"([^"]+)"|(0x[0-9a-fA-F]+))\s*=\s*([A-Za-z_]\w*)\s*\{/

const MAP_U64_STRUCTURE_ENTRY_HEAD_REGEX = /^\s*(\d+)\s*=\s*([A-Za-z_]\w*)\s*\{/

/** `Transform: mtx44 = {` — bloco primitivo multilinha (16 floats, rgba, etc.). */
const PRIMITIVE_BLOCK_OPEN_REGEX =
  /^\s*([A-Za-z_]\w*)\s*:\s*([^=\n]+?)\s*=\s*\{\s*$/

export type ClassGroupStackParseResult = {
  registry: Map<string, MutableClassGroupSchema>
  rootSchemaIds: Set<string>
  classGroupPathBySchemaId: Map<string, NomenclaturePathSegment[]>
  warnings: string[]
}

function findClosingBrace(source: string, openIdx: number): number {
  let depth = 0
  let inString = false
  let escaped = false

  for (let i = openIdx; i < source.length; i += 1) {
    const c = source[i]

    if (inString) {
      if (!escaped && c === '\\') {
        escaped = true
        continue
      }
      if (!escaped && c === '"') {
        inString = false
      }
      escaped = false
      continue
    }

    if (c === '"') {
      inString = true
      continue
    }
    if (c === '{') {
      depth += 1
    } else if (c === '}') {
      depth -= 1
      if (depth === 0) {
        return i
      }
    }
  }

  return -1
}

function isBoolLikeRitType(ritType: string): boolean {
  return /\b(bool|flag)\b/i.test(ritType.trim())
}

function normalizeBoolScalarValue(rawValue: string): string | null {
  const value = rawValue.trim().toLowerCase()
  if (value === 'true' || value === 'false') {
    return normalizeBoolString(value)
  }
  if (value === '1' || value === '0') {
    return normalizeBoolString(value === '1' ? 'true' : 'false')
  }
  return null
}

function normalizePrimitiveListBody(listType: string, inner: string): string {
  if (isListF32RitType(listType)) {
    return normalizeListF32RitualBody(inner)
  }
  if (isListStringRitType(listType)) {
    return normalizeListStringRitualBody(inner)
  }
  if (isListHashRitType(listType)) {
    return normalizeListHashRitualBody(inner)
  }
  if (isListVec2RitType(listType)) {
    return normalizeListVec2RitualBody(inner)
  }
  if (isListVec3RitType(listType)) {
    return normalizeListVec3RitualBody(inner)
  }
  if (isListVec4RitType(listType)) {
    return normalizeListVec4RitualBody(inner)
  }
  return normalizeBlockBodyAsScalarValue(inner)
}

function resolveParameterType(ritType: string, scalarValue: string): NodeDataType {
  if (isListF32RitType(ritType)) {
    return 'listF32'
  }
  if (isListStringRitType(ritType)) {
    return 'listString'
  }
  if (isListHashRitType(ritType)) {
    return 'listHash'
  }
  if (isListVec2RitType(ritType)) {
    return 'listVector2'
  }
  if (isListVec3RitType(ritType)) {
    return 'listVector3'
  }
  if (isListVec4RitType(ritType)) {
    return 'listVector4'
  }
  const optionType = resolveOptionParameterType(ritType)
  if (optionType) {
    return optionType
  }
  const mapHashLinkType = resolveMapHashLinkParameterType(ritType)
  if (mapHashLinkType) {
    return mapHashLinkType
  }
  const mapHashPointerType = resolveMapHashPointerParameterType(ritType)
  if (mapHashPointerType) {
    return mapHashPointerType
  }
  const mapHashEmbedType = resolveMapHashEmbedParameterType(ritType)
  if (mapHashEmbedType) {
    return mapHashEmbedType
  }
  const mapU64PointerType = resolveMapU64PointerParameterType(ritType)
  if (mapU64PointerType) {
    return mapU64PointerType
  }
  if (/\b(embed|pointer|map)\b/i.test(ritType)) {
    return 'string'
  }
  if (/\blist\b/i.test(ritType)) {
    return 'string'
  }
  if (isBoolLikeRitType(ritType) && normalizeBoolScalarValue(scalarValue) !== null) {
    if (/\bflag\b/i.test(ritType)) {
      return 'flag'
    }
    return 'bool'
  }
  if (!isPrimitiveRitType(ritType)) {
    return 'string'
  }
  return mapPrimitiveType(ritType)
}

function mapPrimitiveType(raw: string): NodeDataType {
  const r = raw.trim().toLowerCase()

  if (r.includes('string')) {
    return 'string'
  }
  if (/\bi8\b/.test(r)) {
    return 'i8'
  }
  if (/\bu8\b/.test(r)) {
    return 'u8'
  }
  if (/\bi16\b/.test(r)) {
    return 'i16'
  }
  if (/\bu16\b/.test(r)) {
    return 'u16'
  }
  if (/\bi32\b/.test(r)) {
    return 'i32'
  }
  if (/\bu32\b/.test(r)) {
    return 'u32'
  }
  if (/\bi64\b/.test(r)) {
    return 'i64'
  }
  if (/\bu64\b/.test(r)) {
    return 'u64'
  }
  if (/\bf32\b/.test(r)) {
    return 'f32'
  }
  if (/\bbool\b/.test(r)) {
    return 'bool'
  }
  if (/\bflag\b/.test(r)) {
    return 'flag'
  }
  if (/\bhash\b/i.test(raw) || /\bs\d+\b/.test(r)) {
    return 'integer'
  }
  if (/\bf64\b/.test(r) || r.includes('float') || r.includes('double')) {
    return 'float'
  }
  if (/\brgba\b/.test(r)) {
    return 'rgba'
  }
  if (/\bvec2\b/.test(r)) {
    return 'vector2'
  }
  if (r.includes('vec3') || /\brgb\b/.test(r)) {
    return 'vector3'
  }
  if (r.includes('vec4')) {
    return 'vector4'
  }
  if (/\bmtx44\b/.test(r)) {
    return 'mtx44'
  }
  if (/\blink\b/.test(r)) {
    return 'link'
  }
  if (r.includes('symbol') || r.includes('keyword')) {
    return 'keyword'
  }
  return 'string'
}

function emptyMutable(title: string, idFallback: string): MutableClassGroupSchema {
  return {
    id: idFallback || 'struct-unknown',
    title,
    parameters: [],
    embed: [],
    pointer: [],
    listEmbed: [],
    listPointer: [],
    list2Embed: [],
    list2Pointer: [],
    internalStructures: [],
  }
}

function findEntriesMapRegion(
  src: string,
): { headerLineStart: number; openBrace: number; closeBrace: number } | null {
  const lines = src.split('\n')
  let lineStart = 0
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!
    const lineEnd = lineStart + line.length

    if (/entries:\s*map\[/i.test(line)) {
      const headerLineStart = lineStart
      let openBrace = -1
      const eq = line.indexOf('=')
      if (eq >= 0) {
        const b = line.indexOf('{', eq)
        if (b >= 0) {
          openBrace = lineStart + b
        }
      }
      if (openBrace < 0) {
        let off = lineEnd + 1
        for (let j = i + 1; j < Math.min(i + 8, lines.length); j++) {
          const l2 = lines[j]!
          const b = l2.indexOf('{')
          if (b >= 0) {
            openBrace = off + b
            break
          }
          off += l2.length + 1
        }
      }
      if (openBrace >= 0) {
        const closeBrace = findClosingBrace(src, openBrace)
        if (closeBrace > openBrace) {
          return { headerLineStart, openBrace, closeBrace }
        }
      }
      return null
    }
    lineStart = lineEnd + 1
  }
  return null
}

function ensureMainSchema(ctx: ParseCtx): MutableClassGroupSchema {
  let s = ctx.registry.get(MAIN_SCHEMA_ID)
  if (!s) {
    s = emptyMutable(MAIN_SCHEMA_TITLE, MAIN_SCHEMA_ID)
    ctx.registry.set(MAIN_SCHEMA_ID, s)
  } else {
    s.title = MAIN_SCHEMA_TITLE
  }
  return s
}

function stepTypeForFrame(frame: ScopeFrame, stack: readonly ScopeFrame[]): string {
  if (frame.schemaId === MAIN_SCHEMA_ID && frame.segmentId === 'main') {
    return '#0 Root main'
  }

  if (frame.kind === 'entries') {
    return '#1 Root Entry'
  }

  const withoutMain = stack.filter(
    (f) => !(f.schemaId === MAIN_SCHEMA_ID && f.segmentId === 'main') && f.kind !== 'entries',
  )
  const depth = withoutMain.findIndex((f) => f === frame)

  if (depth === 0) {
    return `#2 Root Entry (${frame.typeName})`
  }

  const cls = classifyFieldLine(frame.openingLine)
  if (cls) {
    return cls.collection
  }

  return '#3 Collection Block'
}

type ParseCtx = {
  registry: Map<string, MutableClassGroupSchema>
  rootSchemaIds: Set<string>
  classGroupPathBySchemaId: Map<string, NomenclaturePathSegment[]>
  warnings: string[]
  scopeStack: ScopeFrame[]
}

function ensureSchema(ctx: ParseCtx, typeName: string): MutableClassGroupSchema {
  const id = slugifyStructureId(typeName)
  const key = id || slugifyStructureId(`type-${String(ctx.registry.size)}`)
  let s = ctx.registry.get(key)
  if (!s) {
    s = emptyMutable(typeName, key)
    ctx.registry.set(key, s)
  }
  return s
}

function pathSegmentsFromStack(stack: readonly ScopeFrame[]): NomenclaturePathSegment[] {
  return stack.map((f) => ({
    id: f.segmentId,
    type: stepTypeForFrame(f, stack),
  }))
}

function recordSchemaPath(ctx: ParseCtx, schemaId: string): void {
  const steps = pathSegmentsFromStack(ctx.scopeStack)
  if (!ctx.classGroupPathBySchemaId.has(schemaId)) {
    ctx.classGroupPathBySchemaId.set(
      schemaId,
      steps.map((s) => ({ id: s.id, type: s.type })),
    )
  }
}

function schemaAtStackTop(ctx: ParseCtx): MutableClassGroupSchema | null {
  for (let i = ctx.scopeStack.length - 1; i >= 0; i--) {
    const frame = ctx.scopeStack[i]!
    if (frame.kind === 'entries') {
      continue
    }
    const s = ctx.registry.get(frame.schemaId)
    if (s) {
      return s
    }
  }
  return null
}

function pushScope(
  ctx: ParseCtx,
  frame: Omit<ScopeFrame, 'schemaId'> & { schemaId?: string },
  childSchema: MutableClassGroupSchema,
): void {
  const full: ScopeFrame = {
    segmentId: frame.segmentId,
    typeName: frame.typeName,
    schemaId: childSchema.id,
    kind: frame.kind,
    openingLine: frame.openingLine,
  }
  ctx.scopeStack.push(full)
  recordSchemaPath(ctx, childSchema.id)
}

function popScope(ctx: ParseCtx): void {
  if (ctx.scopeStack.length > 0) {
    ctx.scopeStack.pop()
  }
}

function pushInternalStructure(
  parentSchema: MutableClassGroupSchema,
  parentType: string,
  fieldName: string,
  childSchemaId: string,
  linkIdSuffix?: string,
): void {
  const suffix = linkIdSuffix ?? fieldName
  parentSchema.internalStructures.push({
    id: slugifyStructureId(`${parentType}-${suffix}`).replace(/^-+/, '') || fieldName.toLowerCase(),
    name: fieldName,
    schemaId: childSchemaId,
  })
}

function ensureListEmbed(parentSchema: MutableClassGroupSchema, parentType: string, fieldName: string): ListEmbedDefinition {
  const existing = parentSchema.listEmbed.find((block) => block.title === fieldName)
  if (existing) {
    return existing
  }

  const block: ListEmbedDefinition = {
    id: nodeBaseListEmbedId(parentType, fieldName),
    title: fieldName,
    internalStructures: [],
  }
  parentSchema.listEmbed.push(block)
  return block
}

function ensureListPointer(
  parentSchema: MutableClassGroupSchema,
  parentType: string,
  fieldName: string,
): ListPointerDefinition {
  const existing = parentSchema.listPointer.find((block) => block.title === fieldName)
  if (existing) {
    return existing
  }

  const block: ListPointerDefinition = {
    id: nodeBaseListPointerId(parentType, fieldName),
    title: fieldName,
    internalStructures: [],
  }
  parentSchema.listPointer.push(block)
  return block
}

function pushListEmbedCatalogItem(
  listEmbed: ListEmbedDefinition,
  parentType: string,
  childName: string,
  childSchemaId: string,
  segId: string,
): void {
  listEmbed.internalStructures.push({
    id: slugifyStructureId(`${parentType}-${segId}`).replace(/^-+/, '') || segId.toLowerCase(),
    name: childName,
    schemaId: childSchemaId,
  })
}

function ensureEmbedBlock(parentSchema: MutableClassGroupSchema, parentType: string, fieldName: string): EmbedDefinition {
  const existing = parentSchema.embed.find((block) => block.title === fieldName)
  if (existing) {
    return existing
  }

  const block: EmbedDefinition = {
    id: nodeBaseEmbedId(parentType, fieldName),
    title: fieldName,
    internalStructures: [],
  }
  parentSchema.embed.push(block)
  return block
}

function ensurePointerBlock(
  parentSchema: MutableClassGroupSchema,
  parentType: string,
  fieldName: string,
): PointerDefinition {
  const existing = parentSchema.pointer.find((block) => block.title === fieldName)
  if (existing) {
    return existing
  }

  const block: PointerDefinition = {
    id: nodeBasePointerId(parentType, fieldName),
    title: fieldName,
    internalStructures: [],
  }
  parentSchema.pointer.push(block)
  return block
}

function pushEmbedCatalogItem(
  embedBlock: EmbedDefinition,
  parentType: string,
  childName: string,
  childSchemaId: string,
  segId: string,
): void {
  embedBlock.internalStructures.push({
    id: slugifyStructureId(`${parentType}-${segId}`).replace(/^-+/, '') || segId.toLowerCase(),
    name: childName,
    schemaId: childSchemaId,
  })
}

function pushEmbedInitialSlot(
  embedBlock: EmbedDefinition,
  childName: string,
  childSchemaId: string,
): void {
  if ((embedBlock.slots ?? []).length >= 1) {
    return
  }
  embedBlock.slots = [
    {
      id: embedSlotId(embedBlock.id, 0),
      name: childName,
      schemaId: childSchemaId,
    },
  ]
}

function pushPointerCatalogItem(
  pointerBlock: PointerDefinition,
  parentType: string,
  childName: string,
  childSchemaId: string,
  segId: string,
): void {
  pointerBlock.internalStructures.push({
    id: slugifyStructureId(`${parentType}-${segId}`).replace(/^-+/, '') || segId.toLowerCase(),
    name: childName,
    schemaId: childSchemaId,
  })
}

function pushPointerInitialSlot(
  pointerBlock: PointerDefinition,
  childName: string,
  childSchemaId: string,
): void {
  if ((pointerBlock.slots ?? []).length >= 1) {
    return
  }
  pointerBlock.slots = [
    {
      id: pointerSlotId(pointerBlock.id, 0),
      name: childName,
      schemaId: childSchemaId,
    },
  ]
}

function pushListPointerCatalogItem(
  listPointer: ListPointerDefinition,
  parentType: string,
  childName: string,
  childSchemaId: string,
  segId: string,
): void {
  listPointer.internalStructures.push({
    id: slugifyStructureId(`${parentType}-${segId}`).replace(/^-+/, '') || segId.toLowerCase(),
    name: childName,
    schemaId: childSchemaId,
  })
}

function ensureList2Embed(
  parentSchema: MutableClassGroupSchema,
  parentType: string,
  fieldName: string,
): List2EmbedDefinition {
  const existing = parentSchema.list2Embed.find((block) => block.title === fieldName)
  if (existing) {
    return existing
  }

  const block: List2EmbedDefinition = {
    id: nodeBaseList2EmbedId(parentType, fieldName),
    title: fieldName,
    internalStructures: [],
    instances: [],
  }
  parentSchema.list2Embed.push(block)
  return block
}

function ensureList2Pointer(
  parentSchema: MutableClassGroupSchema,
  parentType: string,
  fieldName: string,
): List2PointerDefinition {
  const existing = parentSchema.list2Pointer.find((block) => block.title === fieldName)
  if (existing) {
    return existing
  }

  const block: List2PointerDefinition = {
    id: nodeBaseList2PointerId(parentType, fieldName),
    title: fieldName,
    internalStructures: [],
    instances: [],
  }
  parentSchema.list2Pointer.push(block)
  return block
}

function pushList2EmbedCatalogItem(
  list2Embed: List2EmbedDefinition,
  parentType: string,
  childName: string,
  childSchemaId: string,
  segId: string,
): void {
  if (list2Embed.internalStructures.some((item) => item.schemaId === childSchemaId)) {
    return
  }
  list2Embed.internalStructures.push({
    id: slugifyStructureId(`${parentType}-${segId}`).replace(/^-+/, '') || segId.toLowerCase(),
    name: childName,
    schemaId: childSchemaId,
  })
}

function pushList2PointerCatalogItem(
  list2Pointer: List2PointerDefinition,
  parentType: string,
  childName: string,
  childSchemaId: string,
  segId: string,
): void {
  if (list2Pointer.internalStructures.some((item) => item.schemaId === childSchemaId)) {
    return
  }
  list2Pointer.internalStructures.push({
    id: slugifyStructureId(`${parentType}-${segId}`).replace(/^-+/, '') || segId.toLowerCase(),
    name: childName,
    schemaId: childSchemaId,
  })
}

function pushList2EmbedInstance(
  list2Embed: List2EmbedDefinition,
  parentType: string,
  childName: string,
  childSchemaId: string,
  itemIdx: number,
  segId: string,
): EmbedDefinition {
  pushList2EmbedCatalogItem(list2Embed, parentType, childName, childSchemaId, segId)

  const instanceId = `${list2Embed.id}-inst-${String(itemIdx)}`
  const catalogEntry = list2Embed.internalStructures.find((item) => item.schemaId === childSchemaId)
  const instance: EmbedDefinition = {
    id: instanceId,
    title: childName,
    internalStructures: catalogEntry ? [{ ...catalogEntry }] : [],
    slots: [],
  }
  pushEmbedInitialSlot(instance, childName, childSchemaId)
  list2Embed.instances.push(instance)
  return instance
}

function pushList2PointerInstance(
  list2Pointer: List2PointerDefinition,
  parentType: string,
  childName: string,
  childSchemaId: string,
  itemIdx: number,
  segId: string,
): PointerDefinition {
  pushList2PointerCatalogItem(list2Pointer, parentType, childName, childSchemaId, segId)

  const instanceId = `${list2Pointer.id}-inst-${String(itemIdx)}`
  const catalogEntry = list2Pointer.internalStructures.find((item) => item.schemaId === childSchemaId)
  const instance: PointerDefinition = {
    id: instanceId,
    title: childName,
    internalStructures: catalogEntry ? [{ ...catalogEntry }] : [],
    slots: [],
  }
  pushPointerInitialSlot(instance, childName, childSchemaId)
  list2Pointer.instances.push(instance)
  return instance
}

function parseList2EmbedBody(
  ctx: ParseCtx,
  parentType: string,
  fieldName: string,
  listInner: string,
  parentSchema: MutableClassGroupSchema,
): void {
  const list2Embed = ensureList2Embed(parentSchema, parentType, fieldName)
  const listLines = listInner.replace(/\t/g, '  ').split('\n')
  let li = 0
  let itemIdx = 0

  while (li < listLines.length) {
    const lineRaw = listLines[li]!.trimEnd()
    const t = lineRaw.trim()
    li += 1

    if (t === '' || t.startsWith('#')) {
      continue
    }

    const inlinePtr = INLINE_CHILD_OPEN_REGEX.exec(lineRaw)
    if (inlinePtr?.[1] && inlinePtr[2] && inlinePtr[3]) {
      const childField = inlinePtr[1]!
      const childName = inlinePtr[3]!
      const concatFromHere = listLines.slice(li - 1).join('\n')
      const openRel = concatFromHere.indexOf('{')
      const closeAbs = openRel >= 0 ? findClosingBrace(concatFromHere, openRel) : -1

      let innerSlice = ''
      if (closeAbs <= openRel) {
        ctx.warnings.push(`${parentType}.${fieldName}[${String(itemIdx)}].${childField}: não fechado`)
      } else {
        innerSlice = concatFromHere.slice(openRel + 1, closeAbs)
        const consumedHead = concatFromHere.slice(0, closeAbs + 1)
        li += consumedHead.split('\n').length - 1
      }

      const childSchema = ensureSchema(ctx, childName)
      const segId = `${fieldName}:${String(itemIdx)}:${childField}`
      pushList2EmbedInstance(list2Embed, parentType, childName, childSchema.id, itemIdx, segId)

      pushScope(
        ctx,
        {
          segmentId: segId,
          typeName: childName,
          kind: 'listItem',
          openingLine: lineRaw,
        },
        childSchema,
      )

      if (innerSlice.trim().length > 0) {
        parseBlockBody(ctx, childName, innerSlice)
      }

      popScope(ctx)
      itemIdx += 1
      continue
    }

    const head = STRUCT_ONLY_LINE.exec(t)
    if (!head?.[1]) {
      continue
    }

    const childName = head[1]!
    const concatFromHere = listLines.slice(li - 1).join('\n')
    const openRel = concatFromHere.indexOf('{')
    const closeAbs = openRel >= 0 ? findClosingBrace(concatFromHere, openRel) : -1

    let innerSlice = ''
    if (closeAbs <= openRel) {
      ctx.warnings.push(`${parentType}.${fieldName}[${String(itemIdx)}]: '${childName}' não fechado`)
    } else {
      innerSlice = concatFromHere.slice(openRel + 1, closeAbs)
      const consumedHead = concatFromHere.slice(0, closeAbs + 1)
      li += consumedHead.split('\n').length - 1
    }

    const childSchema = ensureSchema(ctx, childName)
    const segId = `${fieldName}:${String(itemIdx)}`
    pushList2EmbedInstance(list2Embed, parentType, childName, childSchema.id, itemIdx, segId)

    pushScope(
      ctx,
      {
        segmentId: segId,
        typeName: childName,
        kind: 'listItem',
        openingLine: lineRaw,
      },
      childSchema,
    )

    if (innerSlice.trim().length > 0) {
      parseBlockBody(ctx, childName, innerSlice)
    }

    popScope(ctx)
    itemIdx += 1
  }
}

function parseList2PointerBody(
  ctx: ParseCtx,
  parentType: string,
  fieldName: string,
  listInner: string,
  parentSchema: MutableClassGroupSchema,
): void {
  const list2Pointer = ensureList2Pointer(parentSchema, parentType, fieldName)
  const listLines = listInner.replace(/\t/g, '  ').split('\n')
  let li = 0
  let itemIdx = 0

  while (li < listLines.length) {
    const lineRaw = listLines[li]!.trimEnd()
    const t = lineRaw.trim()
    li += 1

    if (t === '' || t.startsWith('#')) {
      continue
    }

    const inlinePtr = INLINE_CHILD_OPEN_REGEX.exec(lineRaw)
    if (inlinePtr?.[1] && inlinePtr[2] && inlinePtr[3]) {
      const childField = inlinePtr[1]!
      const inlineKind = inlinePtr[2]!.toLowerCase()
      const childName = inlinePtr[3]!
      if (inlineKind !== 'pointer') {
        continue
      }
      const concatFromHere = listLines.slice(li - 1).join('\n')
      const openRel = concatFromHere.indexOf('{')
      const closeAbs = openRel >= 0 ? findClosingBrace(concatFromHere, openRel) : -1

      let innerSlice = ''
      if (closeAbs <= openRel) {
        ctx.warnings.push(`${parentType}.${fieldName}[${String(itemIdx)}].${childField}: não fechado`)
      } else {
        innerSlice = concatFromHere.slice(openRel + 1, closeAbs)
        const consumedHead = concatFromHere.slice(0, closeAbs + 1)
        li += consumedHead.split('\n').length - 1
      }

      const childSchema = ensureSchema(ctx, childName)
      const segId = `${fieldName}:${String(itemIdx)}:${childField}`
      pushList2PointerInstance(list2Pointer, parentType, childName, childSchema.id, itemIdx, segId)

      pushScope(
        ctx,
        {
          segmentId: segId,
          typeName: childName,
          kind: 'listItem',
          openingLine: lineRaw,
        },
        childSchema,
      )

      if (innerSlice.trim().length > 0) {
        parseBlockBody(ctx, childName, innerSlice)
      }

      popScope(ctx)
      itemIdx += 1
      continue
    }

    const head = STRUCT_ONLY_LINE.exec(t)
    if (!head?.[1]) {
      continue
    }

    const childName = head[1]!
    const concatFromHere = listLines.slice(li - 1).join('\n')
    const openRel = concatFromHere.indexOf('{')
    const closeAbs = openRel >= 0 ? findClosingBrace(concatFromHere, openRel) : -1

    let innerSlice = ''
    if (closeAbs <= openRel) {
      ctx.warnings.push(`${parentType}.${fieldName}[${String(itemIdx)}]: '${childName}' não fechado`)
    } else {
      innerSlice = concatFromHere.slice(openRel + 1, closeAbs)
      const consumedHead = concatFromHere.slice(0, closeAbs + 1)
      li += consumedHead.split('\n').length - 1
    }

    const childSchema = ensureSchema(ctx, childName)
    const segId = `${fieldName}:${String(itemIdx)}`
    pushList2PointerInstance(list2Pointer, parentType, childName, childSchema.id, itemIdx, segId)

    pushScope(
      ctx,
      {
        segmentId: segId,
        typeName: childName,
        kind: 'listItem',
        openingLine: lineRaw,
      },
      childSchema,
    )

    if (innerSlice.trim().length > 0) {
      parseBlockBody(ctx, childName, innerSlice)
    }

    popScope(ctx)
    itemIdx += 1
  }
}

function normalizeScalarDefaultValue(ritType: string, rawValue: string): string | null {
  let value = rawValue.trim()

  const braced = /^\{\s*([^}]*)\}\s*$/.exec(value)
  if (braced) {
    const inner = braced[1]!.trim()
    const typeLower = ritType.trim().toLowerCase()
    if (/\bvec2\b/.test(typeLower)) {
      const parts = inner.split(',').map((part) => part.trim()).filter(Boolean)
      if (parts.length >= 2) {
        return formatVector2String(parseVector2String(parts.join(', ')))
      }
    }
    if (/\bvec3\b/.test(typeLower)) {
      const parts = inner.split(',').map((part) => part.trim()).filter(Boolean)
      if (parts.length >= 3) {
        return formatVector3String(parseVector3String(parts.join(', ')))
      }
    }
    if (/\b(rgba|vec4|rgb)\b/.test(typeLower)) {
      const parts = inner.split(',').map((part) => part.trim()).filter(Boolean)
      if (parts.length >= 3) {
        return formatRgbaString(parseRgbaString(parts.join(', ')))
      }
    }
    return inner.replace(/\s+/g, ' ')
  }

  if (isBoolLikeRitType(ritType)) {
    const boolValue = normalizeBoolScalarValue(value)
    if (boolValue !== null) {
      return boolValue
    }
  }

  if (isListF32RitType(ritType)) {
    return normalizeListF32String(value)
  }

  if (isListStringRitType(ritType)) {
    return normalizeListStringString(value)
  }

  if (isListHashRitType(ritType)) {
    return normalizeListHashString(value)
  }

  if (isListVec2RitType(ritType)) {
    if (/\{/.test(value)) {
      return normalizeListVector2String(value)
    }
    return value
  }

  if (isListVec3RitType(ritType)) {
    if (/\{/.test(value)) {
      return normalizeListVector3String(value)
    }
    return value
  }

  if (isListVec4RitType(ritType)) {
    if (/\{/.test(value)) {
      return normalizeListVector4String(value)
    }
    return value
  }

  if (isOptionF32RitType(ritType)) {
    return normalizeOptionF32String(value)
  }

  if (isOptionStringRitType(ritType)) {
    return normalizeOptionStringString(value)
  }

  if (isOptionVec3RitType(ritType)) {
    return normalizeOptionVector3String(value)
  }

  if (isMapHashLinkRitType(ritType)) {
    return normalizeMapHashLinkString(value)
  }

  if (/\{/.test(value)) {
    return null
  }

  return value
}

function pushScalarParameter(
  _ctx: ParseCtx,
  parentType: string,
  parentSchema: MutableClassGroupSchema,
  fieldName: string,
  ritType: string,
  rawValue: string,
): void {
  const normalized = normalizeScalarDefaultValue(ritType, rawValue)
  if (normalized === null) {
    return
  }
  let value = normalized

  if (
    (/\bembed\b/i.test(ritType) || /\bpointer\b/i.test(ritType)) &&
    !isMapHashPointerRitType(ritType) &&
    !isMapHashEmbedRitType(ritType) &&
    !isMapU64PointerRitType(ritType)
  ) {
    return
  }

  if (value.startsWith('"') && value.endsWith('"')) {
    try {
      value = JSON.parse(value) as string
    } catch {
      value = value.slice(1, -1)
    }
  }

  if (
    !isMapHashLinkRitType(ritType) &&
    !isMapHashPointerRitType(ritType) &&
    !isMapHashEmbedRitType(ritType) &&
    !isMapU64PointerRitType(ritType)
  ) {
    value = value.length > 480 ? `${value.slice(0, 477)}…` : value
  }

  const pid = nodeBaseParameterId(parentType, fieldName)

  parentSchema.parameters.push({
    id: pid,
    name: fieldName,
    type: resolveParameterType(ritType, value),
    defaultValue: value,
  })
}

function normalizeBlockBodyAsScalarValue(inner: string): string {
  const lines = inner
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.startsWith('#'))
  return lines.join(' ').slice(0, 480)
}

function parseMapHashStructureBody(
  ctx: ParseCtx,
  parentType: string,
  parentSchema: MutableClassGroupSchema,
  fieldName: string,
  inner: string,
  ritType: 'map[hash,pointer]' | 'map[hash,embed]' | 'map[u64,pointer]',
  formatSerialized: (entries: readonly MapHashPointerEntry[] | readonly MapU64PointerEntry[]) => string,
  entryHeadRegex: RegExp,
  mapKeyFromMatch: (match: RegExpExecArray) => string | undefined,
  typeNameFromMatch: (match: RegExpExecArray) => string | undefined,
): void {
  const bodyLines = inner.replace(/\t/g, '  ').split('\n')
  const entries: MapHashPointerEntry[] = []
  let idx = 0

  while (idx < bodyLines.length) {
    const lineRaw = bodyLines[idx]!.trimEnd()
    const t = lineRaw.trim()
    idx += 1

    if (t === '' || t.startsWith('#')) {
      continue
    }

    const entryMatch = entryHeadRegex.exec(lineRaw)
    if (!entryMatch) {
      continue
    }

    const mapKey = mapKeyFromMatch(entryMatch)
    const typeName = typeNameFromMatch(entryMatch)
    if (!mapKey || !typeName) {
      continue
    }

    const concatFromHere = bodyLines.slice(idx - 1).join('\n')
    const openRel = concatFromHere.indexOf('{')
    const closeAbs = openRel >= 0 ? findClosingBrace(concatFromHere, openRel) : -1

    if (closeAbs <= openRel) {
      ctx.warnings.push(`${parentType}.${fieldName}: entrada "${mapKey}" não fechada`)
      continue
    }

    const innerSlice = concatFromHere.slice(openRel + 1, closeAbs)
    const consumedHead = concatFromHere.slice(0, closeAbs + 1)
    idx += consumedHead.split('\n').length - 1

    const childSchema = ensureSchema(ctx, typeName)

    pushScope(
      ctx,
      {
        segmentId: `${fieldName}:${mapKey}`,
        typeName,
        kind: 'internal',
        openingLine: lineRaw,
      },
      childSchema,
    )

    if (innerSlice.trim().length > 0) {
      parseBlockBody(ctx, typeName, innerSlice)
    }

    popScope(ctx)

    entries.push({
      key: mapKey,
      schemaId: childSchema.id,
      typeName,
    })
  }

  pushScalarParameter(ctx, parentType, parentSchema, fieldName, ritType, formatSerialized(entries))
}

function parseMapHashPointerBody(
  ctx: ParseCtx,
  parentType: string,
  parentSchema: MutableClassGroupSchema,
  fieldName: string,
  inner: string,
): void {
  parseMapHashStructureBody(
    ctx,
    parentType,
    parentSchema,
    fieldName,
    inner,
    'map[hash,pointer]',
    formatMapHashPointerString,
    MAP_HASH_STRUCTURE_ENTRY_HEAD_REGEX,
    (match) => match[1] ?? match[2],
    (match) => match[3],
  )
}

function parseMapHashEmbedBody(
  ctx: ParseCtx,
  parentType: string,
  parentSchema: MutableClassGroupSchema,
  fieldName: string,
  inner: string,
): void {
  parseMapHashStructureBody(
    ctx,
    parentType,
    parentSchema,
    fieldName,
    inner,
    'map[hash,embed]',
    formatMapHashEmbedString,
    MAP_HASH_STRUCTURE_ENTRY_HEAD_REGEX,
    (match) => match[1] ?? match[2],
    (match) => match[3],
  )
}

function parseMapU64PointerBody(
  ctx: ParseCtx,
  parentType: string,
  parentSchema: MutableClassGroupSchema,
  fieldName: string,
  inner: string,
): void {
  parseMapHashStructureBody(
    ctx,
    parentType,
    parentSchema,
    fieldName,
    inner,
    'map[u64,pointer]',
    formatMapU64PointerString,
    MAP_U64_STRUCTURE_ENTRY_HEAD_REGEX,
    (match) => match[1],
    (match) => match[2],
  )
}

function parseStructuralListBody(
  ctx: ParseCtx,
  parentType: string,
  fieldName: string,
  listInner: string,
  parentSchema: MutableClassGroupSchema,
  useListEmbed: boolean,
  useListPointer: boolean,
): void {
  const listEmbed = useListEmbed ? ensureListEmbed(parentSchema, parentType, fieldName) : null
  const listPointer = useListPointer ? ensureListPointer(parentSchema, parentType, fieldName) : null
  const listLines = listInner.replace(/\t/g, '  ').split('\n')
  let li = 0
  let itemIdx = 0

  while (li < listLines.length) {
    const lineRaw = listLines[li]!.trimEnd()
    const t = lineRaw.trim()
    li += 1

    if (t === '' || t.startsWith('#')) {
      continue
    }

    const inlinePtr = INLINE_CHILD_OPEN_REGEX.exec(lineRaw)
    if (inlinePtr?.[1] && inlinePtr[2] && inlinePtr[3]) {
      const childField = inlinePtr[1]!
      const inlineKind = inlinePtr[2]!.toLowerCase()
      const childName = inlinePtr[3]!
      const concatFromHere = listLines.slice(li - 1).join('\n')
      const openRel = concatFromHere.indexOf('{')
      const closeAbs = openRel >= 0 ? findClosingBrace(concatFromHere, openRel) : -1

      let innerSlice = ''
      if (closeAbs <= openRel) {
        ctx.warnings.push(`${parentType}.${fieldName}[${String(itemIdx)}].${childField}: não fechado`)
      } else {
        innerSlice = concatFromHere.slice(openRel + 1, closeAbs)
        const consumedHead = concatFromHere.slice(0, closeAbs + 1)
        li += consumedHead.split('\n').length - 1
      }

      const childSchema = ensureSchema(ctx, childName)
      const segId = `${fieldName}:${String(itemIdx)}:${childField}`

      if (listEmbed && inlineKind === 'embed') {
        pushListEmbedCatalogItem(listEmbed, parentType, childName, childSchema.id, segId)
      } else if (listPointer && inlineKind === 'pointer') {
        pushListPointerCatalogItem(listPointer, parentType, childName, childSchema.id, segId)
      } else {
        pushInternalStructure(parentSchema, parentType, childField, childSchema.id, segId)
      }

      pushScope(
        ctx,
        {
          segmentId: segId,
          typeName: childName,
          kind: 'listItem',
          openingLine: lineRaw,
        },
        childSchema,
      )

      if (innerSlice.trim().length > 0) {
        parseBlockBody(ctx, childName, innerSlice)
      }

      popScope(ctx)
      itemIdx += 1
      continue
    }

    const head = STRUCT_ONLY_LINE.exec(t)
    if (!head?.[1]) {
      continue
    }

    const childName = head[1]!
    const concatFromHere = listLines.slice(li - 1).join('\n')
    const openRel = concatFromHere.indexOf('{')
    const closeAbs = openRel >= 0 ? findClosingBrace(concatFromHere, openRel) : -1

    let innerSlice = ''
    if (closeAbs <= openRel) {
      ctx.warnings.push(`${parentType}.${fieldName}[${String(itemIdx)}]: '${childName}' não fechado`)
    } else {
      innerSlice = concatFromHere.slice(openRel + 1, closeAbs)
      const consumedHead = concatFromHere.slice(0, closeAbs + 1)
      li += consumedHead.split('\n').length - 1
    }

    const childSchema = ensureSchema(ctx, childName)
    const segId = `${fieldName}:${String(itemIdx)}`

    if (listEmbed) {
      pushListEmbedCatalogItem(listEmbed, parentType, childName, childSchema.id, segId)
    } else if (listPointer) {
      pushListPointerCatalogItem(listPointer, parentType, childName, childSchema.id, segId)
    } else {
      const listItemFieldName = itemIdx === 0 ? fieldName : `${fieldName}:${String(itemIdx)}`
      pushInternalStructure(parentSchema, parentType, listItemFieldName, childSchema.id, segId)
    }

    pushScope(
      ctx,
      {
        segmentId: segId,
        typeName: childName,
        kind: 'listItem',
        openingLine: lineRaw,
      },
      childSchema,
    )

    if (innerSlice.trim().length > 0) {
      parseBlockBody(ctx, childName, innerSlice)
    }

    popScope(ctx)
    itemIdx += 1
  }
}

function parseBlockBody(ctx: ParseCtx, parentType: string, body: string): void {
  const bodyLines = body.replace(/\t/g, '  ').split('\n')
  let idx = 0

  while (idx < bodyLines.length) {
    const lineRaw = bodyLines[idx]!.trimEnd()
    const t = lineRaw.trim()
    idx += 1

    if (t === '' || t.startsWith('#')) {
      continue
    }

    const primitiveBlockEarly = PRIMITIVE_BLOCK_OPEN_REGEX.exec(lineRaw)
    if (primitiveBlockEarly?.[1] && primitiveBlockEarly[2]) {
      const fieldName = primitiveBlockEarly[1]!
      const ritType = primitiveBlockEarly[2]!.trim()
      const isIdentifiedPrimitiveBlock =
        isPrimitiveRitType(ritType) &&
        !/^option\[/i.test(ritType) &&
        !/^map\[hash,link\]/i.test(ritType) &&
        !/^list2?\[/i.test(ritType)
      const isUnidentifiedScalarBlock =
        !isIdentifiedPrimitiveBlock &&
        !/\b(embed|pointer|link)\b/i.test(ritType) &&
        !/^map\[/i.test(ritType) &&
        !/^list2?\[/i.test(ritType) &&
        !/^option\[/i.test(ritType)

      if (isIdentifiedPrimitiveBlock || isUnidentifiedScalarBlock) {
        const parentSchemaEarly = schemaAtStackTop(ctx)
        if (parentSchemaEarly) {
          const concatFromHere = bodyLines.slice(idx - 1).join('\n')
          const openRel = concatFromHere.indexOf('{')
          const closeAbs = openRel >= 0 ? findClosingBrace(concatFromHere, openRel) : -1

          if (closeAbs > openRel) {
            const innerSlice = concatFromHere.slice(openRel + 1, closeAbs)
            const consumedHead = concatFromHere.slice(0, closeAbs + 1)
            idx += consumedHead.split('\n').length - 1
            pushScalarParameter(
              ctx,
              parentType,
              parentSchemaEarly,
              fieldName,
              ritType,
              normalizeBlockBodyAsScalarValue(innerSlice),
            )
          }
        }
        continue
      }
    }

    const optionHeadEarly = OPTION_BLOCK_OPEN_REGEX.exec(lineRaw)
    if (optionHeadEarly?.[1] && optionHeadEarly[2]) {
      const parentSchemaOption = schemaAtStackTop(ctx)
      if (parentSchemaOption) {
        const fieldName = optionHeadEarly[1]!
        const ritType = optionHeadEarly[2]!
        const concatFromHere = bodyLines.slice(idx - 1).join('\n')
        const openRel = concatFromHere.indexOf('{')
        const closeAbs = openRel >= 0 ? findClosingBrace(concatFromHere, openRel) : -1

        if (closeAbs > openRel) {
          const innerSlice = concatFromHere.slice(openRel + 1, closeAbs)
          const consumedHead = concatFromHere.slice(0, closeAbs + 1)
          idx += consumedHead.split('\n').length - 1
          pushScalarParameter(
            ctx,
            parentType,
            parentSchemaOption,
            fieldName,
            ritType,
            normalizeBlockBodyAsScalarValue(innerSlice),
          )
        }
        continue
      }
    }

    const mapHashLinkHeadEarly = MAP_HASH_LINK_BLOCK_OPEN_REGEX.exec(lineRaw)
    if (mapHashLinkHeadEarly?.[1] && mapHashLinkHeadEarly[2]) {
      const parentSchemaMap = schemaAtStackTop(ctx)
      if (parentSchemaMap) {
        const fieldName = mapHashLinkHeadEarly[1]!
        const ritType = mapHashLinkHeadEarly[2]!
        const concatFromHere = bodyLines.slice(idx - 1).join('\n')
        const openRel = concatFromHere.indexOf('{')
        const closeAbs = openRel >= 0 ? findClosingBrace(concatFromHere, openRel) : -1

        if (closeAbs > openRel) {
          const innerSlice = concatFromHere.slice(openRel + 1, closeAbs)
          const consumedHead = concatFromHere.slice(0, closeAbs + 1)
          idx += consumedHead.split('\n').length - 1
          pushScalarParameter(
            ctx,
            parentType,
            parentSchemaMap,
            fieldName,
            ritType,
            normalizeMapHashLinkRitualBody(innerSlice),
          )
        }
        continue
      }
    }

    const mapHashPointerHeadEarly = MAP_HASH_POINTER_BLOCK_OPEN_REGEX.exec(lineRaw)
    if (mapHashPointerHeadEarly?.[1] && mapHashPointerHeadEarly[2]) {
      const parentSchemaMapPtr = schemaAtStackTop(ctx)
      if (parentSchemaMapPtr) {
        const fieldName = mapHashPointerHeadEarly[1]!
        const concatFromHere = bodyLines.slice(idx - 1).join('\n')
        const openRel = concatFromHere.indexOf('{')
        const closeAbs = openRel >= 0 ? findClosingBrace(concatFromHere, openRel) : -1

        if (closeAbs > openRel) {
          const innerSlice = concatFromHere.slice(openRel + 1, closeAbs)
          const consumedHead = concatFromHere.slice(0, closeAbs + 1)
          idx += consumedHead.split('\n').length - 1
          parseMapHashPointerBody(ctx, parentType, parentSchemaMapPtr, fieldName, innerSlice)
        }
        continue
      }
    }

    const mapHashEmbedHeadEarly = MAP_HASH_EMBED_BLOCK_OPEN_REGEX.exec(lineRaw)
    if (mapHashEmbedHeadEarly?.[1] && mapHashEmbedHeadEarly[2]) {
      const parentSchemaMapEmbed = schemaAtStackTop(ctx)
      if (parentSchemaMapEmbed) {
        const fieldName = mapHashEmbedHeadEarly[1]!
        const concatFromHere = bodyLines.slice(idx - 1).join('\n')
        const openRel = concatFromHere.indexOf('{')
        const closeAbs = openRel >= 0 ? findClosingBrace(concatFromHere, openRel) : -1

        if (closeAbs > openRel) {
          const innerSlice = concatFromHere.slice(openRel + 1, closeAbs)
          const consumedHead = concatFromHere.slice(0, closeAbs + 1)
          idx += consumedHead.split('\n').length - 1
          parseMapHashEmbedBody(ctx, parentType, parentSchemaMapEmbed, fieldName, innerSlice)
        }
        continue
      }
    }

    const mapU64PointerHeadEarly = MAP_U64_POINTER_BLOCK_OPEN_REGEX.exec(lineRaw)
    if (mapU64PointerHeadEarly?.[1] && mapU64PointerHeadEarly[2]) {
      const parentSchemaMapU64 = schemaAtStackTop(ctx)
      if (parentSchemaMapU64) {
        const fieldName = mapU64PointerHeadEarly[1]!
        const concatFromHere = bodyLines.slice(idx - 1).join('\n')
        const openRel = concatFromHere.indexOf('{')
        const closeAbs = openRel >= 0 ? findClosingBrace(concatFromHere, openRel) : -1

        if (closeAbs > openRel) {
          const innerSlice = concatFromHere.slice(openRel + 1, closeAbs)
          const consumedHead = concatFromHere.slice(0, closeAbs + 1)
          idx += consumedHead.split('\n').length - 1
          parseMapU64PointerBody(ctx, parentType, parentSchemaMapU64, fieldName, innerSlice)
        }
        continue
      }
    }

    const classified = classifyRitualLine(lineRaw)

    if (classified.kind === 'unknown') {
      continue
    }

    if (classified.kind === 'metadata') {
      const parentSchemaMeta = schemaAtStackTop(ctx)
      if (parentSchemaMeta?.id === MAIN_SCHEMA_ID) {
        const scalar = FIELD_SCALAR_REGEX.exec(lineRaw)
        if (scalar?.[1] && scalar[2]) {
          pushScalarParameter(
            ctx,
            parentType,
            parentSchemaMeta,
            scalar[1]!,
            scalar[2]!.trim(),
            String(scalar[3]),
          )
        }
      }
      continue
    }

    const mapEntry = MAP_ENTRY_HEAD_REGEX.exec(lineRaw)
    const mapKey = mapEntry?.[1] ?? mapEntry?.[2]
    if (mapKey && mapEntry?.[3]) {
      const typeName = mapEntry[3]!
      const concatFromHere = bodyLines.slice(idx - 1).join('\n')
      const openRel = concatFromHere.indexOf('{')
      const closeAbs = openRel >= 0 ? findClosingBrace(concatFromHere, openRel) : -1

      if (closeAbs <= openRel) {
        ctx.warnings.push(`Entrada mapa "${mapKey}": bloco '${typeName}' não fechado`)
        continue
      }

      const innerSlice = concatFromHere.slice(openRel + 1, closeAbs)
      const consumedHead = concatFromHere.slice(0, closeAbs + 1)
      idx += consumedHead.split('\n').length - 1

      const entitySchema = ensureSchema(ctx, typeName)

      pushScope(
        ctx,
        {
          segmentId: mapKey,
          typeName,
          kind: 'entity',
          openingLine: lineRaw,
        },
        entitySchema,
      )

      parseBlockBody(ctx, typeName, innerSlice)
      popScope(ctx)
      continue
    }

    const parentSchema = schemaAtStackTop(ctx)
    if (!parentSchema) {
      continue
    }

    const listHead = LIST_EMBED_OPEN_REGEX.exec(lineRaw)
    if (listHead?.[1] && listHead[2]) {
      const fieldName = listHead[1]!
      const listType = listHead[2]!
      const concatFromHere = bodyLines.slice(idx - 1).join('\n')
      const openRel = concatFromHere.indexOf('{')
      const closeAbs = openRel >= 0 ? findClosingBrace(concatFromHere, openRel) : -1

      if (closeAbs <= openRel) {
        ctx.warnings.push(`${parentType}.${fieldName}: lista não fechada`)
        continue
      }

      const listInner = concatFromHere.slice(openRel + 1, closeAbs)
      const consumedHead = concatFromHere.slice(0, closeAbs + 1)
      idx += consumedHead.split('\n').length - 1

      if (isEmbedListType(listType)) {
        parseStructuralListBody(ctx, parentType, fieldName, listInner, parentSchema, true, false)
      } else if (isEmbedList2Type(listType)) {
        parseList2EmbedBody(ctx, parentType, fieldName, listInner, parentSchema)
      } else if (isPointerListType(listType)) {
        parseStructuralListBody(ctx, parentType, fieldName, listInner, parentSchema, false, true)
      } else if (isPointerList2Type(listType)) {
        parseList2PointerBody(ctx, parentType, fieldName, listInner, parentSchema)
      } else if (isStructuralListType(listType)) {
        parseStructuralListBody(ctx, parentType, fieldName, listInner, parentSchema, false, false)
      } else if (isPrimitiveListType(listType)) {
        const listValue = normalizePrimitiveListBody(listType, listInner)
        pushScalarParameter(ctx, parentType, parentSchema, fieldName, listType, listValue)
      }
      continue
    }

    const embedInline = INLINE_EMBED_OPEN_REGEX.exec(lineRaw)
    if (embedInline?.[1] && embedInline[2]) {
      const fieldName = embedInline[1]!
      const childName = embedInline[2]!
      const concatFromHere = bodyLines.slice(idx - 1).join('\n')
      const openRel = concatFromHere.indexOf('{')
      const closeAbs = openRel >= 0 ? findClosingBrace(concatFromHere, openRel) : -1

      let innerSlice = ''
      if (closeAbs <= openRel) {
        ctx.warnings.push(`${parentType}.${fieldName}: bloco '${childName}' não fechado`)
      } else {
        innerSlice = concatFromHere.slice(openRel + 1, closeAbs)
        const consumedHead = concatFromHere.slice(0, closeAbs + 1)
        idx += consumedHead.split('\n').length - 1
      }

      const childSchema = ensureSchema(ctx, childName)
      const embedBlock = ensureEmbedBlock(parentSchema, parentType, fieldName)
      pushEmbedCatalogItem(embedBlock, parentType, childName, childSchema.id, fieldName)
      pushEmbedInitialSlot(embedBlock, childName, childSchema.id)

      pushScope(
        ctx,
        {
          segmentId: fieldName,
          typeName: childName,
          kind: 'internal',
          openingLine: lineRaw,
        },
        childSchema,
      )

      if (innerSlice.trim().length > 0) {
        parseBlockBody(ctx, childName, innerSlice)
      }

      popScope(ctx)
      continue
    }

    const pointerInline = INLINE_POINTER_OPEN_REGEX.exec(lineRaw)
    if (pointerInline?.[1] && pointerInline[2]) {
      const fieldName = pointerInline[1]!
      const childName = pointerInline[2]!
      const concatFromHere = bodyLines.slice(idx - 1).join('\n')
      const openRel = concatFromHere.indexOf('{')
      const closeAbs = openRel >= 0 ? findClosingBrace(concatFromHere, openRel) : -1

      let innerSlice = ''
      if (closeAbs <= openRel) {
        ctx.warnings.push(`${parentType}.${fieldName}: bloco '${childName}' não fechado`)
      } else {
        innerSlice = concatFromHere.slice(openRel + 1, closeAbs)
        const consumedHead = concatFromHere.slice(0, closeAbs + 1)
        idx += consumedHead.split('\n').length - 1
      }

      const childSchema = ensureSchema(ctx, childName)
      const pointerBlock = ensurePointerBlock(parentSchema, parentType, fieldName)
      pushPointerCatalogItem(pointerBlock, parentType, childName, childSchema.id, fieldName)
      pushPointerInitialSlot(pointerBlock, childName, childSchema.id)

      pushScope(
        ctx,
        {
          segmentId: fieldName,
          typeName: childName,
          kind: 'internal',
          openingLine: lineRaw,
        },
        childSchema,
      )

      if (innerSlice.trim().length > 0) {
        parseBlockBody(ctx, childName, innerSlice)
      }

      popScope(ctx)
      continue
    }

    const linkInline = INLINE_LINK_OPEN_REGEX.exec(lineRaw)
    if (linkInline?.[1] && linkInline[2]) {
      const fieldName = linkInline[1]!
      const childName = linkInline[2]!
      const concatFromHere = bodyLines.slice(idx - 1).join('\n')
      const openRel = concatFromHere.indexOf('{')
      const closeAbs = openRel >= 0 ? findClosingBrace(concatFromHere, openRel) : -1

      let innerSlice = ''
      if (closeAbs <= openRel) {
        ctx.warnings.push(`${parentType}.${fieldName}: bloco '${childName}' não fechado`)
      } else {
        innerSlice = concatFromHere.slice(openRel + 1, closeAbs)
        const consumedHead = concatFromHere.slice(0, closeAbs + 1)
        idx += consumedHead.split('\n').length - 1
      }

      const childSchema = ensureSchema(ctx, childName)
      pushInternalStructure(parentSchema, parentType, fieldName, childSchema.id)

      pushScope(
        ctx,
        {
          segmentId: fieldName,
          typeName: childName,
          kind: 'internal',
          openingLine: lineRaw,
        },
        childSchema,
      )

      if (innerSlice.trim().length > 0) {
        parseBlockBody(ctx, childName, innerSlice)
      }

      popScope(ctx)
      continue
    }

    const structOnlyHead = STRUCT_ONLY_LINE.exec(t)
    if (structOnlyHead?.[1] && classified.kind === 'structural') {
      const childName = structOnlyHead[1]!
      const concatFromHere = bodyLines.slice(idx - 1).join('\n')
      const openRel = concatFromHere.indexOf('{')
      const closeAbs = openRel >= 0 ? findClosingBrace(concatFromHere, openRel) : -1

      if (closeAbs > openRel) {
        const innerSlice = concatFromHere.slice(openRel + 1, closeAbs)
        const consumedHead = concatFromHere.slice(0, closeAbs + 1)
        idx += consumedHead.split('\n').length - 1

        const anonField = `anon-${parentType.toLowerCase()}`
        const childSchema = ensureSchema(ctx, childName)

        pushInternalStructure(parentSchema, parentType, anonField, childSchema.id, `${anonField}-${childName}`)

        pushScope(
          ctx,
          {
            segmentId: anonField,
            typeName: childName,
            kind: 'internal',
            openingLine: lineRaw,
          },
          childSchema,
        )

        if (innerSlice.trim().length > 0) {
          parseBlockBody(ctx, childName, innerSlice)
        }

        popScope(ctx)
      }
      continue
    }

    if (classified.kind === 'simple' && classified.fieldName && classified.ritType !== undefined) {
      pushScalarParameter(
        ctx,
        parentType,
        parentSchema,
        classified.fieldName,
        classified.ritType,
        classified.rawValue ?? '',
      )
      continue
    }

    if (FIELD_SCALAR_BRACED_REGEX.test(lineRaw)) {
      const m = FIELD_SCALAR_BRACED_REGEX.exec(lineRaw)
      if (m && classifyRitualLine(lineRaw).kind === 'simple') {
        pushScalarParameter(
          ctx,
          parentType,
          parentSchema,
          m[1]!,
          m[2]!.trim(),
          `{ ${String(m[3]).trim()} }`,
        )
      }
    } else if (FIELD_SCALAR_REGEX.test(lineRaw) && !lineRaw.includes('{')) {
      const m = FIELD_SCALAR_REGEX.exec(lineRaw)
      if (m && classifyRitualLine(lineRaw).kind === 'simple') {
        pushScalarParameter(ctx, parentType, parentSchema, m[1]!, m[2]!.trim(), String(m[3]))
      }
    }
  }
}

function dedupeSchemas(ctx: ParseCtx): void {
  for (const schema of ctx.registry.values()) {
    const seenFields = new Set<string>()
    schema.parameters = schema.parameters.filter((p) => {
      if (seenFields.has(p.name)) {
        ctx.warnings.push(`${schema.title}: campo duplicado "${p.name}" ignorado`)
        return false
      }
      seenFields.add(p.name)
      return true
    })

    const seenEnt = new Set<string>()
    schema.internalStructures = schema.internalStructures.filter((e) => {
      const k = `${e.id}:${e.schemaId}`
      if (seenEnt.has(k)) {
        return false
      }
      seenEnt.add(k)
      return true
    })

    for (const block of schema.embed) {
      const seenCatalog = new Set<string>()
      block.internalStructures = block.internalStructures.filter((e) => {
        const k = `${e.id}:${e.schemaId}`
        if (seenCatalog.has(k)) {
          return false
        }
        seenCatalog.add(k)
        return true
      })
    }

    schema.embed = schema.embed.filter((block) => block.internalStructures.length > 0)

    for (const block of schema.pointer) {
      const seenCatalog = new Set<string>()
      block.internalStructures = block.internalStructures.filter((e) => {
        const k = `${e.id}:${e.schemaId}`
        if (seenCatalog.has(k)) {
          return false
        }
        seenCatalog.add(k)
        return true
      })
    }

    schema.pointer = schema.pointer.filter((block) => block.internalStructures.length > 0)

    for (const block of schema.listEmbed) {
      const seenCatalog = new Set<string>()
      block.internalStructures = block.internalStructures.filter((e) => {
        const k = `${e.id}:${e.schemaId}`
        if (seenCatalog.has(k)) {
          return false
        }
        seenCatalog.add(k)
        return true
      })
    }

    schema.listEmbed = schema.listEmbed.filter((block) => block.internalStructures.length > 0)

    for (const block of schema.listPointer) {
      const seenCatalog = new Set<string>()
      block.internalStructures = block.internalStructures.filter((e) => {
        const k = `${e.id}:${e.schemaId}`
        if (seenCatalog.has(k)) {
          return false
        }
        seenCatalog.add(k)
        return true
      })
    }

    schema.listPointer = schema.listPointer.filter((block) => block.internalStructures.length > 0)
  }
}

function collectReachableSchemaIds(ctx: ParseCtx): Set<string> {
  const out = new Set<string>(ctx.rootSchemaIds)
  const queue = [...ctx.rootSchemaIds]

  while (queue.length > 0) {
    const id = queue.shift()!
    const schema = ctx.registry.get(id)
    if (!schema) {
      continue
    }
    for (const ref of schema.internalStructures) {
      if (!out.has(ref.schemaId)) {
        out.add(ref.schemaId)
        queue.push(ref.schemaId)
      }
    }
    for (const block of schema.embed) {
      for (const ref of [...block.internalStructures, ...(block.slots ?? [])]) {
        if (!out.has(ref.schemaId)) {
          out.add(ref.schemaId)
          queue.push(ref.schemaId)
        }
      }
    }
    for (const block of schema.pointer) {
      for (const ref of [...block.internalStructures, ...(block.slots ?? [])]) {
        if (!out.has(ref.schemaId)) {
          out.add(ref.schemaId)
          queue.push(ref.schemaId)
        }
      }
    }
    for (const block of schema.listEmbed) {
      for (const ref of block.internalStructures) {
        if (!out.has(ref.schemaId)) {
          out.add(ref.schemaId)
          queue.push(ref.schemaId)
        }
      }
    }
    for (const block of schema.listPointer) {
      for (const ref of block.internalStructures) {
        if (!out.has(ref.schemaId)) {
          out.add(ref.schemaId)
          queue.push(ref.schemaId)
        }
      }
    }
    for (const block of schema.list2Embed) {
      for (const ref of block.internalStructures) {
        if (!out.has(ref.schemaId)) {
          out.add(ref.schemaId)
          queue.push(ref.schemaId)
        }
      }
      for (const instance of block.instances) {
        for (const ref of [...instance.internalStructures, ...(instance.slots ?? [])]) {
          if (!out.has(ref.schemaId)) {
            out.add(ref.schemaId)
            queue.push(ref.schemaId)
          }
        }
      }
    }
    for (const block of schema.list2Pointer) {
      for (const ref of block.internalStructures) {
        if (!out.has(ref.schemaId)) {
          out.add(ref.schemaId)
          queue.push(ref.schemaId)
        }
      }
      for (const instance of block.instances) {
        for (const ref of [...instance.internalStructures, ...(instance.slots ?? [])]) {
          if (!out.has(ref.schemaId)) {
            out.add(ref.schemaId)
            queue.push(ref.schemaId)
          }
        }
      }
    }
    for (const param of schema.parameters) {
      if (param.type === 'mapHashPointer') {
        for (const entry of parseMapHashPointerString(param.defaultValue)) {
          const childId = entry.schemaId.trim()
          if (childId && !out.has(childId)) {
            out.add(childId)
            queue.push(childId)
          }
        }
        continue
      }
      if (param.type === 'mapHashEmbed') {
        for (const entry of parseMapHashEmbedString(param.defaultValue)) {
          const childId = entry.schemaId.trim()
          if (childId && !out.has(childId)) {
            out.add(childId)
            queue.push(childId)
          }
        }
        continue
      }
      if (param.type === 'mapU64Pointer') {
        for (const entry of parseMapU64PointerString(param.defaultValue)) {
          const childId = entry.schemaId.trim()
          if (childId && !out.has(childId)) {
            out.add(childId)
            queue.push(childId)
          }
        }
      }
    }
  }

  return out
}

function parseStandaloneRoot(ctx: ParseCtx, text: string): void {
  const lines = text.split('\n')
  let offset = 0

  for (const ln of lines) {
    const trimmedFull = ln.trim()
    const head = STRUCT_ONLY_LINE.exec(trimmedFull)

    if (head?.[1]) {
      const typeName = head[1]!
      const braceAt = offset + ln.indexOf('{')
      const close = findClosingBrace(text, braceAt)

      if (close > braceAt) {
        const body = text.slice(braceAt + 1, close)
        const entitySchema = ensureSchema(ctx, typeName)
        ctx.rootSchemaIds.add(entitySchema.id)

        pushScope(
          ctx,
          {
            segmentId: typeName,
            typeName,
            kind: 'entity',
            openingLine: trimmedFull,
          },
          entitySchema,
        )

        parseBlockBody(ctx, typeName, body)
        popScope(ctx)
      }
    }

    offset += ln.length + 1
  }
}

export function parseClassGroupRitualWithStack(source: string): ClassGroupStackParseResult {
  const text = source.replace(/\r\n/g, '\n').trim()

  const ctx: ParseCtx = {
    registry: new Map(),
    rootSchemaIds: new Set(),
    classGroupPathBySchemaId: new Map(),
    warnings: [],
    scopeStack: [],
  }

  const entriesRegion = findEntriesMapRegion(text)

  if (entriesRegion) {
    const preamble = text.slice(0, entriesRegion.headerLineStart).trim()
    const mapBody = text.slice(entriesRegion.openBrace + 1, entriesRegion.closeBrace)
    const mainSchema = ensureMainSchema(ctx)

    ctx.rootSchemaIds.add(MAIN_SCHEMA_ID)

    pushScope(
      ctx,
      {
        segmentId: 'main',
        typeName: MAIN_SCHEMA_TITLE,
        kind: 'entity',
        openingLine: 'Main',
      },
      mainSchema,
    )

    if (preamble.length > 0) {
      parseBlockBody(ctx, MAIN_SCHEMA_TITLE, preamble)
    }

    parseMapHashEmbedBody(ctx, MAIN_SCHEMA_TITLE, mainSchema, 'entries', mapBody)

    popScope(ctx)

    mainSchema.nomenclature = {
      group: '#0 Entidades',
      collection: '#0 Root main',
      collectionType: 'main',
      pathHierarchy: 'main',
      pathHierarchySteps: [{ id: 'main', type: '#0 Root main' }],
    }
  } else {
    parseStandaloneRoot(ctx, text)
  }

  dedupeSchemas(ctx)

  return {
    registry: ctx.registry,
    rootSchemaIds: ctx.rootSchemaIds,
    classGroupPathBySchemaId: ctx.classGroupPathBySchemaId,
    warnings: ctx.warnings,
  }
}

export function schemasFromClassGroupStackParse(
  parse: ClassGroupStackParseResult,
): NodeSchemaDefinition[] {
  const reachable = collectReachableSchemaIds({
    registry: parse.registry,
    rootSchemaIds: parse.rootSchemaIds,
    classGroupPathBySchemaId: parse.classGroupPathBySchemaId,
    warnings: [],
    scopeStack: [],
  })

  if (reachable.size === 0 && parse.registry.size > 0) {
    for (const id of parse.registry.keys()) {
      reachable.add(id)
    }
  }

  const list: NodeSchemaDefinition[] = []

  for (const id of reachable) {
    const sch = parse.registry.get(id)
    if (!sch) {
      continue
    }
    list.push(
      structuredClone({
        ...sch,
        parameters: [...sch.parameters].sort((a, bb) => a.name.localeCompare(bb.name)),
        ...(sch.embed.length > 0 ? { embed: [...sch.embed] } : {}),
        ...(sch.pointer.length > 0 ? { pointer: [...sch.pointer] } : {}),
        ...(sch.listEmbed.length > 0 ? { listEmbed: [...sch.listEmbed] } : {}),
        ...(sch.listPointer.length > 0 ? { listPointer: [...sch.listPointer] } : {}),
        ...(sch.list2Embed.length > 0 ? { list2Embed: [...sch.list2Embed] } : {}),
        ...(sch.list2Pointer.length > 0 ? { list2Pointer: [...sch.list2Pointer] } : {}),
        internalStructures: [...sch.internalStructures],
      }),
    )
  }

  return list
}
