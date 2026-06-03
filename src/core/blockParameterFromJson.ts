import type {
  BlockInspectorDraftEntry,
  BlockParameterDef,
  BlockParameterSourcePath,
  BlockSlotRules,
} from './blockSchema'
import { blockRitualTypeToNodeDataType } from './blockSchema'
import type { NodeDataType } from './nodeSchema'
import {
  iconIdFromDraft,
  mandatoryPointerSlotTags,
  resolveBlockIconHint,
  slotRulesToTags,
  slotTagsToRules,
} from './blockInspectorUi'
import type { BlockParameterJsonDocument } from './blockParameterJson'
import { isSimpleBlockParameterDocument } from './blockParameterJson'
import { isStructuralParameterDocument } from './blockParameterRegistry'

export { isStructuralParameterDocument } from './blockParameterRegistry'

function syntheticId(prefix: string, docId: string): string {
  const safe = docId.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 48)
  return `${prefix}-${safe}`
}

function defaultValueFromDocument(doc: BlockParameterJsonDocument): string {
  if (isSimpleBlockParameterDocument(doc)) {
    return doc.value
  }
  if (doc.type === 'optionF32' || doc.type === 'optionString' || doc.type === 'optionVector3') {
    return doc.item ?? ''
  }
  if (
    doc.type === 'listF32' ||
    doc.type === 'listString' ||
    doc.type === 'listHash' ||
    doc.type === 'listVector2' ||
    doc.type === 'listVector3' ||
    doc.type === 'listVector4'
  ) {
    return doc.items.join('\n')
  }
  return ''
}

/** Tipo de sintaxe (`SyntaxType`) para um parâmetro de bloco no catálogo JSON. */
export function blockParameterJsonDocumentToNodeDataType(doc: BlockParameterJsonDocument): NodeDataType {
  switch (doc.type) {
    case 'embed':
      return 'mapHashEmbed'
    case 'pointer':
      return 'mapHashPointer'
    case 'mapHashPointer':
    case 'mapHashEmbed':
    case 'mapU64Pointer':
    case 'listF32':
    case 'listString':
    case 'listHash':
    case 'listVector2':
    case 'listVector3':
    case 'listVector4':
    case 'optionF32':
    case 'optionString':
    case 'optionVector3':
      return doc.type
    default:
      return blockRitualTypeToNodeDataType(doc.type)
  }
}

function typeParameterFromDocument(doc: BlockParameterJsonDocument): string {
  if (doc.type === 'embed') {
    return doc.embed
  }
  if (doc.type === 'pointer') {
    return doc.pointer
  }
  if (doc.type === 'mapHashPointer' || doc.type === 'mapHashEmbed' || doc.type === 'mapU64Pointer') {
    return doc.mapKind
  }
  return doc.type
}

function slotRulesFromDocument(doc: BlockParameterJsonDocument): BlockSlotRules | undefined {
  const outputs = [...doc.slots.out]
  const inputs = isSimpleBlockParameterDocument(doc) ? [...doc.slots.in] : []

  if (doc.type === 'pointer') {
    return {
      inputs: [doc.pointer],
      outputs: outputs.length > 0 ? outputs : [doc.pointer],
    }
  }

  if (outputs.length === 0 && inputs.length === 0) {
    return undefined
  }

  return {
    outputs: outputs.length > 0 ? outputs : undefined,
    inputs: inputs.length > 0 ? inputs : undefined,
  }
}

function sourcePathFromDocument(doc: BlockParameterJsonDocument): BlockParameterSourcePath {
  if (doc.type === 'pointer') {
    const pointerId = syntheticId('catalog-ptr', doc.id)
    return {
      kind: 'pointerChild',
      pointerId,
      slotId: `${pointerId}-slot`,
    }
  }

  if (doc.type === 'embed') {
    const embedId = syntheticId('catalog-embed', doc.id)
    return {
      kind: 'embedChild',
      embedId,
      slotId: `${embedId}-slot`,
      childParameterId: doc.source.parameterId,
    }
  }

  return {
    kind: 'parameter',
    parameterId: doc.source.parameterId,
  }
}

function nextCatalogParameterId(
  blockDisplayName: string,
  doc: BlockParameterJsonDocument,
  existing: readonly BlockParameterDef[],
): string {
  const base = doc.id.trim() || doc.parameterName.trim()
  const candidate = base.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 64)
  if (!existing.some((entry) => entry.idParameter === candidate)) {
    return candidate
  }
  let index = 2
  while (existing.some((entry) => entry.idParameter === `${candidate}_${index}`)) {
    index += 1
  }
  return `${candidate}_${index}`
}

export function blockParameterDefFromJsonDocument(
  doc: BlockParameterJsonDocument,
  blockDisplayName: string,
  existing: readonly BlockParameterDef[],
): BlockParameterDef {
  const slotRules = slotRulesFromDocument(doc)
  const typeParameter = typeParameterFromDocument(doc)
  const ritualName = doc.parameterName.trim()

  return {
    idParameter: nextCatalogParameterId(blockDisplayName, doc, existing),
    nameParameter: doc.name.trim() || ritualName,
    typeParameter,
    defaultValue: defaultValueFromDocument(doc),
    slotRules,
    iconHint: null,
    sourcePath: sourcePathFromDocument(doc),
  }
}

export function blockInspectorEntryFromParameterDef(param: BlockParameterDef): BlockInspectorDraftEntry {
  const ritualName =
    param.sourcePath.kind === 'pointerChild'
      ? param.nameParameter.trim() || param.typeParameter
      : param.nameParameter.trim() || param.idParameter

  const isPointer = param.sourcePath.kind === 'pointerChild'
  const slotTags = isPointer
    ? mandatoryPointerSlotTags(param.typeParameter.trim() || param.nameParameter)
    : undefined

  return {
    sourcePath: param.sourcePath,
    ritualName,
    typeParameter: param.typeParameter,
    defaultValue: param.defaultValue,
    exposed: true,
    nameParameter: param.nameParameter,
    iconHint: param.iconHint ?? null,
    iconId: iconIdFromDraft(param.iconId ?? '', param.iconHint ?? null),
    slotRules: param.slotRules,
    slotTags,
  }
}

export function applyInspectorEntryToParameterDef(
  param: BlockParameterDef,
  entry: BlockInspectorDraftEntry,
): BlockParameterDef {
  const isPointer = entry.sourcePath.kind === 'pointerChild'
  const structural = isStructuralParameterSourcePath(param.sourcePath)

  if (isPointer) {
    const pointerType = entry.typeParameter.trim() || param.typeParameter
    return {
      ...param,
      nameParameter: entry.nameParameter.trim() || param.nameParameter,
      typeParameter: pointerType,
      defaultValue: entry.defaultValue,
      slotRules: { inputs: [pointerType], outputs: param.slotRules?.outputs },
      iconHint: null,
      iconId: undefined,
    }
  }

  let slotRules = slotTagsToRules(entry.slotTags ?? slotRulesToTags(entry.slotRules))
  if ((!entry.slotTags || entry.slotTags.length === 0) && entry.slotRules) {
    slotRules = entry.slotRules
  }

  if (structural && param.slotRules?.outputs?.length) {
    slotRules = {
      ...slotRules,
      outputs: param.slotRules.outputs,
    }
  }

  const iconId = iconIdFromDraft(entry.iconId ?? '', entry.iconHint)
  return {
    ...param,
    nameParameter: entry.nameParameter.trim() || param.nameParameter,
    typeParameter: entry.typeParameter,
    defaultValue: entry.defaultValue,
    slotRules,
    iconHint: resolveBlockIconHint(iconId),
    iconId: iconId.trim() || undefined,
  }
}

export function isStructuralParameterSourcePath(source: BlockParameterSourcePath): boolean {
  return source.kind === 'pointerChild' || source.kind === 'embedChild'
}

export function parameterCatalogKey(param: BlockParameterDef): string {
  if (param.sourcePath.kind === 'parameter') {
    return param.sourcePath.parameterId
  }
  return `${param.sourcePath.kind}:${param.idParameter}`
}

export function documentCatalogKey(doc: BlockParameterJsonDocument): string {
  return doc.source.parameterId
}

export function isParameterAlreadyOnBlock(
  structureParams: readonly BlockParameterDef[],
  doc: BlockParameterJsonDocument,
): boolean {
  const key = doc.source.parameterId
  return structureParams.some((param) => {
    if (param.sourcePath.kind === 'parameter') {
      return param.sourcePath.parameterId === key
    }
    if (param.sourcePath.kind === 'pointerChild' && doc.type === 'pointer') {
      return param.nameParameter === doc.parameterName || param.typeParameter === doc.pointer
    }
    if (param.sourcePath.kind === 'embedChild' && doc.type === 'embed') {
      return param.nameParameter === doc.parameterName
    }
    return false
  })
}
