import {
  buildCatalogBlockSchemaFromDefinition,
  writeCatalogBlockSchemaToDisk,
} from './catalogBlockSchema'
import {
  blockDefinitionByBlockName,
  blockDefinitionById,
  registerBlockDefinitionInCatalog,
  unregisterBlockDefinitionInCatalog,
} from './blockDefinitionRegistry'
import { fetchBlockDefinitionsFromDisk } from './blockDefinitionDiskLoader'
import {
  buildBlockDefinitionDocumentId,
  buildBlockDefinitionFromManualInput,
  type ManualBlockDefinitionInput,
} from './blockDefinitionJson'
import {
  deleteBlockDefinitionDocument,
  writeBlockDefinitionDocument,
} from './blockDefinitionStorage'
import type { NodeSchemaDefinition } from './nodeSchema'
import { adaptBlockParameterDocumentForDefinition } from './blockParameterCatalogClone'
import type { BlockParameterJsonDocument } from './blockParameterJson'
import {
  buildBlockParameterFromManualInput,
  type ManualBlockParameterInput,
} from './blockParameterManualBuild'
import {
  blockParameterCatalogByName,
  registerBlockParameterInCatalog,
  unregisterAllBlockParametersInCatalog,
  unregisterBlockParameterInCatalog,
} from './blockParameterCatalogRegistry'
import {
  deleteBlockParameterDocument,
  writeBlockParameterDocument,
} from './blockParameterStorage'

export type CatalogCreateResult =
  | { ok: true; id: string; overwritten?: boolean; schema: NodeSchemaDefinition }
  | { ok: false; error: string }

export type CatalogDeleteResult = { ok: true; id: string } | { ok: false; error: string }

export type ManualBlockParameterFormInput = Omit<ManualBlockParameterInput, 'nodeId'>

export type ManualBlockParameterSelection = {
  source: BlockParameterJsonDocument
}

async function resolveBlockDefinitionByName(blockName: string) {
  const fromRegistry = blockDefinitionByBlockName(blockName)
  if (fromRegistry) {
    return fromRegistry
  }

  const disk = await fetchBlockDefinitionsFromDisk()
  if (!disk.ok) {
    return undefined
  }

  for (const definition of disk.definitions) {
    registerBlockDefinitionInCatalog(definition)
  }

  return blockDefinitionByBlockName(blockName)
}

export function mergeBlockParameterNames(
  input: ManualBlockDefinitionInput,
  parameterSources: readonly ManualBlockParameterSelection[],
): string[] {
  const fromInput = (input.parameters ?? []).map((entry) => entry.trim()).filter(Boolean)
  const fromSources = parameterSources
    .map((entry) => entry.source.parameterName.trim())
    .filter(Boolean)
  const merged: string[] = []
  const seen = new Set<string>()
  for (const name of [...fromSources, ...fromInput]) {
    if (seen.has(name)) {
      continue
    }
    seen.add(name)
    merged.push(name)
  }
  return merged
}

export async function createBlockInCatalog(
  input: ManualBlockDefinitionInput,
  options?: { parameterSources?: readonly ManualBlockParameterSelection[] },
): Promise<CatalogCreateResult> {
  const parameterSources = options?.parameterSources ?? []
  const parameterNames = mergeBlockParameterNames(input, parameterSources)
  const built = buildBlockDefinitionFromManualInput({
    ...input,
    parameters: parameterNames,
  })
  if (!built.ok) {
    return built
  }

  const existing = blockDefinitionById(built.document.id)
  if (existing) {
    return { ok: false, error: `Bloco "${built.document.id}" já existe no catálogo.` }
  }

  const adaptedParameters = parameterSources.map((entry) =>
    adaptBlockParameterDocumentForDefinition(entry.source, built.document),
  )

  for (const parameterDoc of adaptedParameters) {
    const collision = blockParameterCatalogByName(
      built.document.blockName,
      parameterDoc.parameterName,
    )
    if (collision) {
      return {
        ok: false,
        error: `Parâmetro "${parameterDoc.parameterName}" já existe no bloco "${built.document.blockName}".`,
      }
    }
  }

  const writeResult = await writeBlockDefinitionDocument(built.document)
  if (!writeResult.ok) {
    return { ok: false, error: writeResult.error ?? 'Erro ao gravar bloco.' }
  }

  registerBlockDefinitionInCatalog(built.document)

  for (const parameterDoc of adaptedParameters) {
    const writeParamResult = await writeBlockParameterDocument(parameterDoc)
    if (!writeParamResult.ok) {
      return {
        ok: false,
        error:
          writeParamResult.error ??
          `Bloco gravado, mas falhou ao gravar parâmetro "${parameterDoc.parameterName}".`,
      }
    }
    registerBlockParameterInCatalog(parameterDoc)
  }

  const schema = buildCatalogBlockSchemaFromDefinition(built.document)
  const schemaWrite = await writeCatalogBlockSchemaToDisk(schema)
  if (!schemaWrite.ok) {
    return {
      ok: false,
      error: `Bloco gravado, mas falhou ao gravar schema: ${schemaWrite.error}`,
    }
  }

  return {
    ok: true,
    id: built.document.id,
    overwritten: writeResult.overwritten,
    schema,
  }
}

export async function createParameterInCatalog(
  input: ManualBlockParameterFormInput,
): Promise<CatalogCreateResult> {
  const blockName = input.blockName.trim()
  if (!blockName) {
    return { ok: false, error: 'blockName em falta' }
  }

  const parentDefinition = await resolveBlockDefinitionByName(blockName)
  if (!parentDefinition) {
    return { ok: false, error: `Bloco "${blockName}" não encontrado no catálogo.` }
  }

  const parameterName = input.parameterName.trim()
  const existingParam = blockParameterCatalogByName(blockName, parameterName)
  if (existingParam) {
    return {
      ok: false,
      error: `Parâmetro "${parameterName}" já existe no bloco "${blockName}".`,
    }
  }

  const built = buildBlockParameterFromManualInput({
    ...input,
    blockName: parentDefinition.blockName,
    nodeId: parentDefinition.source.nodeId,
  })
  if (!built.ok) {
    return built
  }

  const writeParamResult = await writeBlockParameterDocument(built.document)
  if (!writeParamResult.ok) {
    return { ok: false, error: writeParamResult.error ?? 'Erro ao gravar parâmetro.' }
  }

  registerBlockParameterInCatalog(built.document)

  const parameters = [...parentDefinition.parameters]
  if (!parameters.includes(parameterName)) {
    parameters.push(parameterName)
    const updatedDefinition = {
      ...parentDefinition,
      parameters,
    }
    const writeBlockResult = await writeBlockDefinitionDocument(updatedDefinition)
    if (!writeBlockResult.ok) {
      return {
        ok: false,
        error:
          writeBlockResult.error ??
          'Parâmetro gravado, mas falhou ao actualizar a lista parameters do bloco.',
      }
    }
    registerBlockDefinitionInCatalog(updatedDefinition)
  }

  return {
    ok: true,
    id: built.document.id,
    overwritten: (writeParamResult.overwritten?.length ?? 0) > 0,
  }
}

export async function updateBlockInCatalog(
  blockName: string,
  input: ManualBlockDefinitionInput,
  options?: { parameterSources?: readonly ManualBlockParameterSelection[] },
): Promise<CatalogCreateResult> {
  const targetBlockName = blockName.trim()
  const existing = await resolveBlockDefinitionByName(targetBlockName)
  if (!existing) {
    return { ok: false, error: `Bloco "${targetBlockName}" não encontrado no catálogo.` }
  }

  if (input.blockName.trim() && input.blockName.trim() !== existing.blockName.trim()) {
    return { ok: false, error: 'Não é possível alterar blockName na edição.' }
  }

  const parameterSources = options?.parameterSources ?? []
  const parameterNames = mergeBlockParameterNames(
    {
      ...input,
      blockName: existing.blockName,
      parameters: input.parameters ?? existing.parameters,
    },
    parameterSources,
  )

  const built = buildBlockDefinitionFromManualInput({
    ...input,
    blockName: existing.blockName,
    parameters: parameterNames,
    headerSlots: input.headerSlots ?? existing.headerSlots,
  })
  if (!built.ok) {
    return built
  }

  const document = {
    ...built.document,
    id: existing.id,
    source: existing.source,
  }

  const adaptedParameters = parameterSources.map((entry) =>
    adaptBlockParameterDocumentForDefinition(entry.source, document),
  )

  for (const parameterDoc of adaptedParameters) {
    const collision = blockParameterCatalogByName(
      document.blockName,
      parameterDoc.parameterName,
    )
    if (collision) {
      continue
    }

    const writeParamResult = await writeBlockParameterDocument(parameterDoc)
    if (!writeParamResult.ok) {
      return {
        ok: false,
        error:
          writeParamResult.error ??
          `Falhou ao gravar parâmetro "${parameterDoc.parameterName}".`,
      }
    }
    registerBlockParameterInCatalog(parameterDoc)
  }

  const writeResult = await writeBlockDefinitionDocument(document)
  if (!writeResult.ok) {
    return { ok: false, error: writeResult.error ?? 'Erro ao gravar bloco.' }
  }

  registerBlockDefinitionInCatalog(document)

  const schema = buildCatalogBlockSchemaFromDefinition(document)
  const schemaWrite = await writeCatalogBlockSchemaToDisk(schema)
  if (!schemaWrite.ok) {
    return {
      ok: false,
      error: `Bloco gravado, mas falhou ao gravar schema: ${schemaWrite.error}`,
    }
  }

  return {
    ok: true,
    id: document.id,
    overwritten: true,
    schema,
  }
}

export async function deleteBlockFromCatalog(blockName: string): Promise<CatalogDeleteResult> {
  const targetBlockName = blockName.trim()
  const existing = await resolveBlockDefinitionByName(targetBlockName)
  if (!existing) {
    return { ok: false, error: `Bloco "${targetBlockName}" não encontrado no catálogo.` }
  }

  const deleteResult = await deleteBlockDefinitionDocument(targetBlockName)
  if (!deleteResult.ok) {
    return { ok: false, error: deleteResult.error }
  }

  unregisterBlockDefinitionInCatalog(existing.id)
  unregisterAllBlockParametersInCatalog(targetBlockName)

  return { ok: true, id: existing.id }
}

export async function updateParameterInCatalog(
  input: ManualBlockParameterFormInput,
): Promise<CatalogCreateResult> {
  const blockName = input.blockName.trim()
  const parameterName = input.parameterName.trim()
  if (!blockName || !parameterName) {
    return { ok: false, error: 'blockName e parameterName são obrigatórios.' }
  }

  const existing = blockParameterCatalogByName(blockName, parameterName)
  if (!existing) {
    return {
      ok: false,
      error: `Parâmetro "${parameterName}" não encontrado no bloco "${blockName}".`,
    }
  }

  const parentDefinition = await resolveBlockDefinitionByName(blockName)
  if (!parentDefinition) {
    return { ok: false, error: `Bloco "${blockName}" não encontrado no catálogo.` }
  }

  const built = buildBlockParameterFromManualInput({
    ...input,
    blockName: parentDefinition.blockName,
    nodeId: parentDefinition.source.nodeId,
  })
  if (!built.ok) {
    return built
  }

  const document: BlockParameterJsonDocument = {
    ...built.document,
    id: existing.id,
    source: existing.source,
  }

  const writeParamResult = await writeBlockParameterDocument(document)
  if (!writeParamResult.ok) {
    return { ok: false, error: writeParamResult.error ?? 'Erro ao gravar parâmetro.' }
  }

  registerBlockParameterInCatalog(document)

  const schema = buildCatalogBlockSchemaFromDefinition(parentDefinition)

  return {
    ok: true,
    id: document.id,
    overwritten: true,
    schema,
  }
}

export async function deleteParameterFromCatalog(
  blockName: string,
  parameterName: string,
): Promise<CatalogDeleteResult> {
  const block = blockName.trim()
  const param = parameterName.trim()
  if (!block || !param) {
    return { ok: false, error: 'blockName e parameterName são obrigatórios.' }
  }

  const existing = blockParameterCatalogByName(block, param)
  if (!existing) {
    return { ok: false, error: `Parâmetro "${param}" não encontrado no bloco "${block}".` }
  }

  const deleteResult = await deleteBlockParameterDocument({ block, id: existing.id })
  if (!deleteResult.ok) {
    return { ok: false, error: deleteResult.error }
  }

  unregisterBlockParameterInCatalog(block, param, existing.id)

  const parentDefinition = await resolveBlockDefinitionByName(block)
  if (parentDefinition) {
    const parameters = parentDefinition.parameters.filter((entry) => entry.trim() !== param)
    if (parameters.length !== parentDefinition.parameters.length) {
      const updatedDefinition = { ...parentDefinition, parameters }
      const writeBlockResult = await writeBlockDefinitionDocument(updatedDefinition)
      if (!writeBlockResult.ok) {
        return {
          ok: false,
          error:
            writeBlockResult.error ??
            'Parâmetro apagado, mas falhou ao actualizar a lista parameters do bloco.',
        }
      }
      registerBlockDefinitionInCatalog(updatedDefinition)
    }
  }

  return { ok: true, id: existing.id }
}

export function manualBlockWouldCollide(input: ManualBlockDefinitionInput): boolean {
  const built = buildBlockDefinitionFromManualInput(input)
  if (!built.ok) {
    return false
  }
  return Boolean(blockDefinitionById(built.document.id))
}

export function manualParameterWouldCollide(blockName: string, parameterName: string): boolean {
  return Boolean(blockParameterCatalogByName(blockName.trim(), parameterName.trim()))
}

export function previewManualBlockId(input: ManualBlockDefinitionInput): string | null {
  const built = buildBlockDefinitionFromManualInput(input)
  if (!built.ok) {
    return null
  }
  return built.document.id
}

export function previewManualParameterId(
  input: ManualBlockParameterFormInput,
  nodeId: string,
): string | null {
  const built = buildBlockParameterFromManualInput({
    ...input,
    nodeId,
  })
  if (!built.ok) {
    return null
  }
  return built.document.id
}

export { buildBlockDefinitionDocumentId }
