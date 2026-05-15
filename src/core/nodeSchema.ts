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

/** Um degrau na pilha hierárquica (ex.: id da entrada no ritual + classificação `#N …`). */
export type NomenclaturePathSegment = {
  id: string
  type: string
}

/** Alinhado a nomecratura.md (Classification + Set Nomenclature). */
export type NodeStructureNomenclature = {
  group: string
  collection: string
  collectionType: string
  /** Trilho legível da raiz do mapa até ao nó (ex.: «Aplicar nomeclatura» no CodeDock). */
  pathHierarchy?: string
  /** Pilha estruturada usada por filtros de contexto (ex.: menu + Elemento). */
  pathHierarchySteps?: NomenclaturePathSegment[]
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
  /** Opcional: parâmetros obrigatórios por defeito (copiados para novas instâncias). */
  required_parameter?: string[]
  /**
   * Opcional: pares de ids (valor sincronizado no editor), persistidos no JSON do schema como `linked_parameter_values`.
   * Usa os mesmos ids que `required_parameter` (incl. stubs na mesma pasta).
   */
  linked_parameter_values?: Array<readonly [string, string]>
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
  /** Instância: ids de parâmetros marcados como obrigatórios neste nó. */
  required_parameter?: string[]
  /** Pares de ids cujo valor é mantido sincronizado (ordem canónica por id). */
  parameter_value_links?: Array<readonly [string, string]>
  /** Opcional: id do parâmetro `string` cuja valor serve de base à hashString. */
  hashString?: string
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
