import { describe, expect, it } from 'vitest'

import type { BlockDefinitionJsonDocument } from './blockDefinitionJson'
import {
  buildBlockStructureFromDefinition,
  collectParameterDocumentsForDefinitionTree,
} from './blockStructureFromDefinition'
import { missingParameterDocumentsForDefinitionTree } from './blockParameterCatalogPersist'
import { synthesizeBlockParameterDocument } from './blockParameterSynthesis'
import { validateBlockParameterDocument } from './blockParameterRegistry'
import type { NodeSchemaDefinition } from './nodeSchema'

const integratedDefinition: BlockDefinitionJsonDocument = {
  id: 'IntegratedValueVector3_IntegratedValueVector3',
  block: 'worldAcceleration',
  blockName: 'IntegratedValueVector3',
  type: 'embed',
  name: 'IntegratedValueVector3',
  source: {
    kind: 'block',
    nodeId:
      'integrated-value-vector3__main-entries-{particlePath}-complex-emitter-definition-data-{ceddId}-world-acceleration',
  },
  color: '#40ff56',
  headerSlots: ['in[worldAcceleration]', 'out[IntegratedValueVector3Preview]'],
  parameters: ['constantValue', 'dynamics'],
}

const integratedSchema: NodeSchemaDefinition = {
  id: 'integrated-value-vector3__main-entries-test',
  title: 'IntegratedValueVector3',
  parameters: [
    {
      id: 'IntegratedValueVector3_parameter_constantValue',
      name: 'constantValue',
      type: 'vector3',
      defaultValue: '0,0,0',
    },
  ],
  embed: [],
  pointer: [
    {
      id: 'IntegratedValueVector3_pointer_dynamics',
      title: 'dynamics',
      internalStructures: [
        {
          id: 'integrated-value-vector3-dynamics',
          name: 'VfxAnimatedVector3fVariableData',
          schemaId: 'vfx-animated-vector3f-variable-data-test',
        },
      ],
      slots: [
        {
          id: 'IntegratedValueVector3_pointer_dynamics__slot__0',
          name: 'VfxAnimatedVector3fVariableData',
          schemaId: 'vfx-animated-vector3f-variable-data-test',
        },
      ],
    },
  ],
  listEmbed: [],
  listPointer: [],
  list2Embed: [],
  list2Pointer: [],
  internalStructures: [],
}

describe('buildBlockStructureFromDefinition', () => {
  it('materializes parameters from block JSON list when disk folder is empty', () => {
    const structure = buildBlockStructureFromDefinition(integratedDefinition, integratedSchema)
    const ritualNames = structure.parameters.map(
      (entry) => entry.nameParameter.toLowerCase().replace(/\s+/g, '') || entry.idParameter,
    )
    expect(ritualNames.some((name) => name.includes('constantvalue'))).toBe(true)
    expect(ritualNames.some((name) => name.includes('dynamics'))).toBe(true)
    expect(structure.parameters).toHaveLength(2)
    expect(structure.identification_codes).toHaveLength(2)
  })

  it('collects parameter docs for block tree including pointer child block', () => {
    const schemaLookup: Record<string, NodeSchemaDefinition> = {
      [integratedSchema.id]: integratedSchema,
      'vfx-animated-vector3f-variable-data-test': {
        id: 'vfx-animated-vector3f-variable-data-test',
        title: 'VfxAnimatedVector3fVariableData',
        parameters: [
          {
            id: 'VfxAnimatedVector3fVariableData_parameter_times',
            name: 'times',
            type: 'listF32',
            defaultValue: '0',
          },
          {
            id: 'VfxAnimatedVector3fVariableData_parameter_values',
            name: 'values',
            type: 'listVector3',
            defaultValue: '0,0,0',
          },
        ],
        embed: [],
        pointer: [],
        listEmbed: [],
        listPointer: [],
        list2Embed: [],
        list2Pointer: [],
        internalStructures: [],
      },
    }

    const docs = collectParameterDocumentsForDefinitionTree(integratedDefinition, schemaLookup)
    const blocks = new Set(docs.map((doc) => doc.block))
    const names = docs.map((doc) => doc.parameterName)

    expect(names).toContain('constantValue')
    expect(names).toContain('dynamics')
    expect(blocks.has('IntegratedValueVector3')).toBe(true)
    expect(blocks.has('VfxAnimatedVector3fVariableData')).toBe(true)

    const missing = missingParameterDocumentsForDefinitionTree(integratedDefinition, schemaLookup)
    expect(missing.length).toBeGreaterThanOrEqual(2)
    expect(missing.some((doc) => doc.block === 'IntegratedValueVector3')).toBe(true)
  })

  it('synthesized parameter documents pass validation for disk write', () => {
    for (const parameterName of integratedDefinition.parameters) {
      const doc = synthesizeBlockParameterDocument(
        integratedDefinition,
        parameterName,
        integratedSchema,
      )
      expect(doc).not.toBeNull()
      const validated = validateBlockParameterDocument(doc, parameterName)
      expect(validated.ok).toBe(true)
    }

    const constantDoc = synthesizeBlockParameterDocument(
      integratedDefinition,
      'constantValue',
      integratedSchema,
    )
    expect(constantDoc?.id).toBe('constantValue_constantValue')
    expect(constantDoc && 'name' in constantDoc ? constantDoc.name : '').toBe('constantValue')
  })
})
