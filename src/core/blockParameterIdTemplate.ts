/** Placeholders substituíveis em fases futuras ao resolver o parameterId no grafo. */

export const BLOCK_PARAMETER_PLACEHOLDER_PARTICLE_PATH = '{particlePath}'

export const BLOCK_PARAMETER_PLACEHOLDER_CEDD_ID = '{ceddId}'



type ParameterIdTemplateFn = (parameterName: string) => string



/** Templates por tipo de bloco (`draft.blockType` / `document.block`). */

type SchemaNodeIdTemplateFn = () => string



const BLOCK_TYPE_SCHEMA_NODE_ID_TEMPLATES: Readonly<Record<string, SchemaNodeIdTemplateFn>> = {

  VfxSystemDefinitionData: () =>

    `vfx-system-definition-data__entries-${BLOCK_PARAMETER_PLACEHOLDER_PARTICLE_PATH}`,

  VfxEmitterDefinitionData: () =>

    `vfx-emitter-definition-data__main-entries-${BLOCK_PARAMETER_PLACEHOLDER_PARTICLE_PATH}-complex-emitter-definition-data-${BLOCK_PARAMETER_PLACEHOLDER_CEDD_ID}`,

  VfxEmitterDefinitionDataResult: () =>

    `vfx-emitter-definition-data-result__main-entries-${BLOCK_PARAMETER_PLACEHOLDER_PARTICLE_PATH}-complex-emitter-definition-data-${BLOCK_PARAMETER_PLACEHOLDER_CEDD_ID}`,

}



const BLOCK_TYPE_PARAMETER_ID_TEMPLATES: Readonly<Record<string, ParameterIdTemplateFn>> = {

  VfxSystemDefinitionData: (parameterName) =>

    `vfx-system-definition-data__entries-${BLOCK_PARAMETER_PLACEHOLDER_PARTICLE_PATH}_parameter_${parameterName}`,

  VfxEmitterDefinitionData: (parameterName) =>

    `vfx-emitter-definition-data__main-entries-${BLOCK_PARAMETER_PLACEHOLDER_PARTICLE_PATH}-complex-emitter-definition-data-${BLOCK_PARAMETER_PLACEHOLDER_CEDD_ID}_parameter_${parameterName}`,

  VfxEmitterDefinitionDataResult: (parameterName) =>

    `vfx-emitter-definition-data-result__main-entries-${BLOCK_PARAMETER_PLACEHOLDER_PARTICLE_PATH}-complex-emitter-definition-data-${BLOCK_PARAMETER_PLACEHOLDER_CEDD_ID}_parameter_${parameterName}`,

}



/** Último marcador `-complex-emitter-definition-data-{cedd}` antes do sufixo opcional / `_parameter_`. */

const MAIN_ENTRIES_CEDD_TAIL =

  /-complex-emitter-definition-data-(?:\d+|[0-9a-fx]+)(?:-.+)?(?:_parameter_.*)?$/



export function blockTypeHasParameterIdTemplate(blockType: string): boolean {

  return blockType.trim() in BLOCK_TYPE_PARAMETER_ID_TEMPLATES

}



export function pascalBlockTypeToKebabSlug(blockType: string): string {

  const trimmed = blockType.trim()

  if (!trimmed) {

    return 'block'

  }

  return trimmed

    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')

    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1-$2')

    .toLowerCase()

}



/**

 * Resolve id concreto do parâmetro no grafo.

 * Ids curtos (`Type_parameter_name`) expandem com `schemaId` da instância.

 */

export function resolveConcreteParameterId(

  realId: string,

  parameterName: string,

  schemaId: string,

): string {

  const trimmed = realId.trim()

  const schema = schemaId.trim()

  const name = parameterName.trim()



  if (!trimmed) {

    return schema && name ? `${schema}_parameter_${name}` : ''

  }



  if (trimmed.includes('__') || !schema) {

    return trimmed

  }



  if (trimmed.includes('_parameter_') && name) {

    return `${schema}_parameter_${name}`

  }



  return trimmed

}



function templatizeMainEntriesParameterId(trimmed: string, parameterName: string): string | null {

  const suffix = `_parameter_${parameterName}`

  if (!trimmed.endsWith(suffix)) {

    return null

  }



  const head = trimmed.slice(0, -suffix.length)

  if (!head.includes('__main-entries-') || !MAIN_ENTRIES_CEDD_TAIL.test(head)) {

    return null

  }



  const match = head.match(/^(.+?__main-entries-).+(-complex-emitter-definition-data-)(\d+|[0-9a-fx]+)(-.+)?$/)

  if (!match) {

    return null

  }



  const [, prefix, ceddMarker, , optionalSuffix = ''] = match

  return `${prefix}${BLOCK_PARAMETER_PLACEHOLDER_PARTICLE_PATH}${ceddMarker}${BLOCK_PARAMETER_PLACEHOLDER_CEDD_ID}${optionalSuffix}${suffix}`

}



function templatizeMainEntriesSchemaId(trimmed: string): string | null {

  if (!trimmed.includes('__main-entries-') || !MAIN_ENTRIES_CEDD_TAIL.test(trimmed)) {

    return null

  }



  const match = trimmed.match(/^(.+?__main-entries-).+(-complex-emitter-definition-data-)(\d+|[0-9a-fx]+)(-.+)?$/)

  if (!match) {

    return null

  }



  const [, prefix, ceddMarker, , optionalSuffix = ''] = match

  return `${prefix}${BLOCK_PARAMETER_PLACEHOLDER_PARTICLE_PATH}${ceddMarker}${BLOCK_PARAMETER_PLACEHOLDER_CEDD_ID}${optionalSuffix}`

}



/**

 * Converte um parameterId concreto (instância no grafo) em versão com placeholders,

 * quando o tipo de bloco não tem template registado.

 */

export function templatizeConcreteParameterId(realId: string, parameterName: string): string {

  const trimmed = realId.trim()

  const suffix = `_parameter_${parameterName}`

  if (!trimmed || !trimmed.endsWith(suffix)) {

    return trimmed

  }



  const mainEntries = templatizeMainEntriesParameterId(trimmed, parameterName)

  if (mainEntries) {

    return mainEntries

  }



  const entries = trimmed.match(/^(.+?__entries-).+(_parameter_.+)$/)

  if (entries) {

    return `${entries[1]}${BLOCK_PARAMETER_PLACEHOLDER_PARTICLE_PATH}${entries[2]}`

  }



  return trimmed

}



/**

 * Converte schema.id concreto em nodeId com placeholders (sem sufixo _parameter_).

 */

export function templatizeSchemaNodeId(schemaId: string, blockType = ''): string {

  const trimmed = schemaId.trim()

  if (!trimmed || trimmed.includes('{')) {

    return trimmed

  }



  const mainEntries = templatizeMainEntriesSchemaId(trimmed)

  if (mainEntries) {

    return mainEntries

  }



  const entries = trimmed.match(/^(.+?__entries-).+$/)

  if (entries) {

    return `${entries[1]}${BLOCK_PARAMETER_PLACEHOLDER_PARTICLE_PATH}`

  }



  const templateFn = BLOCK_TYPE_SCHEMA_NODE_ID_TEMPLATES[blockType.trim()]

  if (templateFn) {

    return templateFn()

  }



  return trimmed

}



/**

 * Gera parameterId com placeholders para JSON de parâmetro de bloco.

 * Usa sempre `blockType` do inspetor (não o schema concreto da instância).

 */

export function buildTemplatedParameterId(

  blockType: string,

  parameterName: string,

  realId: string,

): string {

  const trimmedReal = realId.trim()

  if (trimmedReal.includes('{')) {

    return trimmedReal

  }



  const normalizedBlock = blockType.trim()

  const templateFn = BLOCK_TYPE_PARAMETER_ID_TEMPLATES[normalizedBlock]

  if (templateFn) {

    return templateFn(parameterName)

  }



  if (trimmedReal) {

    const templated = templatizeConcreteParameterId(trimmedReal, parameterName)

    if (templated.includes('{')) {

      return templated

    }

  }



  const slug = pascalBlockTypeToKebabSlug(normalizedBlock || 'Block')

  return `${slug}_parameter_${parameterName}`

}


