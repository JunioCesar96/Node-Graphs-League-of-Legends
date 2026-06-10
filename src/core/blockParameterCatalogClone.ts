import type { BlockDefinitionJsonDocument } from './blockDefinitionJson'
import type { BlockParameterJsonDocument } from './blockParameterJson'
import { buildBlockParameterDocumentId } from './blockParameterJson'
import { blockParameterSourceId } from './blockParameterSynthesis'

function parameterSourceMode(doc: BlockParameterJsonDocument): 'scalar' | 'pointer' {
  return doc.type === 'pointer' ? 'pointer' : 'scalar'
}

/** Copia um parâmetro do catálogo para outro bloco (ajusta block, id e source). */
export function adaptBlockParameterDocumentForDefinition(
  source: BlockParameterJsonDocument,
  definition: BlockDefinitionJsonDocument,
): BlockParameterJsonDocument {
  const blockName = definition.blockName.trim()
  const nodeId = definition.source.nodeId.trim()
  const parameterName = source.parameterName.trim()
  const name = source.name.trim()

  return {
    ...structuredClone(source),
    id: buildBlockParameterDocumentId(parameterName, name),
    block: blockName,
    parameterName,
    name,
    source: {
      kind: 'parameter',
      parameterId: blockParameterSourceId(nodeId, parameterName, parameterSourceMode(source)),
    },
  }
}

export function catalogParameterPickerKey(doc: BlockParameterJsonDocument): string {
  return `${doc.block.trim()}::${doc.id.trim()}`
}
