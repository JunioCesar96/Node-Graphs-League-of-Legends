export type NodeDataType =
  | 'keyword'
  | 'string'
  | 'comment'
  | 'property'
  | 'symbol'
  | 'integer'
  | 'float'
  | 'double'
  | 'vector2'
  | 'vector3'
  | 'vector4'

export type NodeParameterDefinition = {
  id: string
  name: string
  type: NodeDataType
  defaultValue: string
}

/** Alinhado a nomecratura.md (Classification + Set Nomenclature). */
export type NodeStructureNomenclature = {
  group: string
  collection: string
  collectionType: string
}

/** Classificação nominal (Set Nomenclature): Internal_Structures (#3). */
export type InternalStructureDefinition = {
  id: string
  name: string
  schemaId: string
}

export type NodeSchemaDefinition = {
  id: string
  title: string
  parameters: NodeParameterDefinition[]
  internalStructures: InternalStructureDefinition[]
  /** Opcional: classificação nominal para JSON exportado / Jade VFX. */
  nomenclature?: NodeStructureNomenclature
}

export type NodeParameterValue = {
  parameterId: string
  value: string
}

export type NodeInstance = {
  id: string
  schema: NodeSchemaDefinition
  values: NodeParameterValue[]
}

export const sampleNodeSchema = {
  id: 'particle-root',
  title: 'ParticleSystem',
  parameters: [
    {
      id: 'spawn-rate',
      name: 'spawnRate',
      type: 'integer',
      defaultValue: '42',
    },
    {
      id: 'lifetime',
      name: 'lifetime',
      type: 'float',
      defaultValue: '3.14',
    },
    {
      id: 'tint',
      name: 'tintRGBA',
      type: 'vector4',
      defaultValue: '1, 0.58, 0.1, 1',
    },
  ],
  internalStructures: [
    {
      id: 'emitter',
      name: 'EmitterShape',
      schemaId: 'emitter-shape',
    },
    {
      id: 'force',
      name: 'WorldForce',
      schemaId: 'world-force',
    },
  ],
} satisfies NodeSchemaDefinition

export const sampleNodeInstance = {
  id: 'particle-root-01',
  schema: sampleNodeSchema,
  values: [
    {
      parameterId: 'spawn-rate',
      value: '42',
    },
    {
      parameterId: 'lifetime',
      value: '3.14',
    },
    {
      parameterId: 'tint',
      value: '1, 0.58, 0.1, 1',
    },
  ],
} satisfies NodeInstance
