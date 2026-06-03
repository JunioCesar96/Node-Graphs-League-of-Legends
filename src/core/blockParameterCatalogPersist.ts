import type { BlockDefinitionJsonDocument } from './blockDefinitionJson'

import {

  blockParameterCatalogByName,

  registerBlockParameterInCatalog,

} from './blockParameterCatalogRegistry'

import { collectParameterDocumentsForDefinitionTree } from './blockStructureFromDefinition'

import type { BlockParameterJsonDocument } from './blockParameterJson'

import { validateBlockParameterDocument } from './blockParameterRegistry'

import { writeBlockParameterDocuments, type WriteBlockParametersResult } from './blockParameterStorage'

import type { NodeSchemaDefinition } from './nodeSchema'



function catalogKey(doc: BlockParameterJsonDocument): string {

  return `${doc.block.trim()}::${doc.parameterName.trim()}`

}



function validateParametersForWrite(documents: readonly BlockParameterJsonDocument[]): {

  valid: BlockParameterJsonDocument[]

  invalid: string[]

} {

  const valid: BlockParameterJsonDocument[] = []

  const invalid: string[] = []



  for (const doc of documents) {

    const result = validateBlockParameterDocument(doc, doc.id)

    if (result.ok) {

      valid.push(result.value)

      continue

    }

    invalid.push(...result.errors)

  }



  return { valid, invalid }

}



async function writeValidatedParameterDocuments(

  parameters: readonly BlockParameterJsonDocument[],

): Promise<WriteBlockParametersResult> {

  if (parameters.length === 0) {

    return { ok: true, written: [], skipped: [] }

  }



  const { valid, invalid } = validateParametersForWrite(parameters)

  if (valid.length === 0) {

    return {

      ok: false,

      error: invalid.join('; ') || 'Nenhum parâmetro válido para gravar.',

      errors: invalid,

    }

  }



  const result = await writeBlockParameterDocuments(valid)

  if (!result.ok) {

    return result

  }



  const persistedCount = (result.written?.length ?? 0) + (result.overwritten?.length ?? 0)

  if (persistedCount === 0 && valid.length > 0) {

    const skipped = result.skipped ?? []

    return {

      ok: false,

      error:

        skipped.length > 0

          ? `Servidor não gravou parâmetros (ignorados: ${skipped.join(', ')}).`

          : 'Servidor não gravou parâmetros.',

      skipped,

      errors: [...invalid, ...(result.errors ?? [])],

    }

  }



  for (const doc of valid) {

    registerBlockParameterInCatalog(doc)

  }



  return {

    ...result,

    errors: [...invalid, ...(result.errors ?? [])],

  }

}



/** Parâmetros em falta no disco para esta árvore de blocos (sintetizados ou filhos). */

export function missingParameterDocumentsForDefinitionTree(

  definition: BlockDefinitionJsonDocument,

  schemaLookup: Record<string, NodeSchemaDefinition>,

): BlockParameterJsonDocument[] {

  const all = collectParameterDocumentsForDefinitionTree(definition, schemaLookup)

  const seen = new Set<string>()

  const missing: BlockParameterJsonDocument[] = []



  for (const doc of all) {

    const key = catalogKey(doc)

    if (seen.has(key)) {

      continue

    }

    seen.add(key)



    if (blockParameterCatalogByName(doc.block, doc.parameterName)) {

      continue

    }

    missing.push(doc)

  }



  return missing

}



function collectMissingParameterDocumentsForDefinitions(

  definitions: readonly BlockDefinitionJsonDocument[],

  schemaLookup: Record<string, NodeSchemaDefinition>,

): BlockParameterJsonDocument[] {

  const seen = new Set<string>()

  const missing: BlockParameterJsonDocument[] = []



  for (const definition of definitions) {

    if (!definition.parameters?.length) {

      continue

    }



    for (const doc of missingParameterDocumentsForDefinitionTree(definition, schemaLookup)) {

      const key = catalogKey(doc)

      if (seen.has(key)) {

        continue

      }

      seen.add(key)

      missing.push(doc)

    }

  }



  return missing

}



/**

 * Grava JSON em `src/blockStructures/parameters/{block}/` para parâmetros ainda ausentes.

 * Chamado ao criar bloco pela paleta (e hierarquia embed/pointer).

 */

export async function persistMissingBlockParameterCatalog(

  definition: BlockDefinitionJsonDocument,

  schemaLookup: Record<string, NodeSchemaDefinition>,

): Promise<WriteBlockParametersResult> {

  const parameters = missingParameterDocumentsForDefinitionTree(definition, schemaLookup)

  return writeValidatedParameterDocuments(parameters)

}



/** Sincroniza parâmetros em falta para várias definições de bloco (ex.: catálogo da paleta). */

export async function persistMissingBlockParameterCatalogForDefinitions(

  definitions: readonly BlockDefinitionJsonDocument[],

  schemaLookup: Record<string, NodeSchemaDefinition>,

): Promise<WriteBlockParametersResult> {

  const parameters = collectMissingParameterDocumentsForDefinitions(definitions, schemaLookup)

  return writeValidatedParameterDocuments(parameters)

}


