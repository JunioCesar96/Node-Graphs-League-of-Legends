export type NodeDataType =
  | 'keyword'
  | 'string'
  | 'comment'
  | 'property'
  | 'symbol'
  | 'integer'
  | 'i8'
  | 'u8'
  | 'i16'
  | 'u16'
  | 'i32'
  | 'u32'
  | 'i64'
  | 'u64'
  | 'f32'
  | 'float'
  | 'double'
  | 'vector2'
  | 'vector3'
  | 'vector4'
  | 'mtx44'
  | 'link'
  | 'listF32'
  | 'listString'
  | 'listHash'
  | 'listVector2'
  | 'listVector3'
  | 'listVector4'
  | 'optionF32'
  | 'optionString'
  | 'optionVector3'
  | 'mapHashLink'
  | 'mapHashPointer'
  | 'mapHashEmbed'
  | 'mapU64Pointer'
  | 'rgba'
  | 'bool'
  | 'flag'

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
  /** Ritual `Type {}` sem corpo: slot existe, sem nó filho ligado no canvas. */
  structOnlyEmpty?: boolean
}

/** Bloco `embed` no ritual: título = nome do campo; no máximo uma estrutura interna. */
export type EmbedDefinition = {
  id: string
  title: string
  templateBlockId?: string
  internalStructures: InternalStructureDefinition[]
  slots?: InternalStructureDefinition[]
}

/** Bloco `list[embed]` no ritual: título = nome do campo; catálogo = itens da lista. */
export type ListEmbedDefinition = {
  id: string
  title: string
  /** Id do campo no schema template (várias instâncias partilham o mesmo templateBlockId). */
  templateBlockId?: string
  /** Itens extraídos do ritual (`list[embed]`). */
  internalStructures: InternalStructureDefinition[]
  /** Porta de ligação desta instância (runtime; normalmente um único slot). */
  slots?: InternalStructureDefinition[]
}

/** Bloco `pointer` no ritual: título = nome do campo; no máximo uma estrutura interna. */
export type PointerDefinition = {
  id: string
  title: string
  templateBlockId?: string
  internalStructures: InternalStructureDefinition[]
  slots?: InternalStructureDefinition[]
}

/** Bloco `list[pointer]` no ritual: título = nome do campo; catálogo = itens da lista. */
export type ListPointerDefinition = {
  id: string
  title: string
  templateBlockId?: string
  internalStructures: InternalStructureDefinition[]
  slots?: InternalStructureDefinition[]
}

/** Bloco `list2[embed]`: cada item da lista = instância estilo embed (máx. 1 slot). */
export type List2EmbedDefinition = {
  id: string
  title: string
  templateBlockId?: string
  internalStructures: InternalStructureDefinition[]
  instances: EmbedDefinition[]
}

/** Bloco `list2[pointer]`: cada item da lista = instância estilo pointer (máx. 1 slot). */
export type List2PointerDefinition = {
  id: string
  title: string
  templateBlockId?: string
  internalStructures: InternalStructureDefinition[]
  instances: PointerDefinition[]
}

export type NodeSchemaDefinition = {
  id: string
  title: string
  parameters: NodeParameterDefinition[]
  /** Campos `embed` (entre parameters e pointer no card). */
  embed?: EmbedDefinition[]
  /** Campos `pointer` (entre embed e listEmbed no card). */
  pointer?: PointerDefinition[]
  /** Listas estruturais `list[embed]`. */
  listEmbed?: ListEmbedDefinition[]
  /** Listas estruturais `list[pointer]`. */
  listPointer?: ListPointerDefinition[]
  /** Listas `list2[embed]` (instâncias estilo embed). */
  list2Embed?: List2EmbedDefinition[]
  /** Listas `list2[pointer]` (instâncias estilo pointer). */
  list2Pointer?: List2PointerDefinition[]
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
  /**
   * Opcional: cópia do valor do parâmetro string fonte (id em `hashStringParameterId`, alinhado a `required_parameter` / stubs).
   */
  hashString?: string
  /** Opcional: id do parâmetro tipo `string` cuja cópia vive em `hashString`. */
  hashStringParameterId?: string
  /** Metadado de origem (ex.: `"neeko"` em schemas gerados pela transformação Neeko). */
  tag?: string
}

export type NodeParameterValue = {
  parameterId: string
  value: string
}

export type ElementViewMode = 'list' | 'compact'

export type ElementViewState = {
  mode: ElementViewMode
  /** Índice visível no modo compacto (0-based). */
  selectedIndex?: number
  /** Barra compacta no card (chevron + título + tipo); independente de list/compact. */
  retracted?: boolean
}

/** Chave estável: `param:<id>`, `embed:<id>`, `listEmbed:<id>`, etc. */
export type ElementViewKey = string

/** Schema com campos estruturais (embed, pointer, listas, maps) além de parâmetros escalares. */
export function hasStructuralSchemaFields(schema: NodeSchemaDefinition): boolean {
  return (
    (schema.embed?.length ?? 0) > 0 ||
    (schema.pointer?.length ?? 0) > 0 ||
    (schema.listEmbed?.length ?? 0) > 0 ||
    (schema.listPointer?.length ?? 0) > 0 ||
    (schema.list2Embed?.length ?? 0) > 0 ||
    (schema.list2Pointer?.length ?? 0) > 0 ||
    (schema.mapHashEmbed?.length ?? 0) > 0 ||
    (schema.mapHashPointer?.length ?? 0) > 0 ||
    (schema.mapU64Pointer?.length ?? 0) > 0
  )
}

/** Nó ritual struct-only vazio (ex.: `VfxPrimitiveArbitraryQuad {}`) — sem escalares nem estruturas internas. */
export function isEmptyStructBlockSchema(schema: NodeSchemaDefinition): boolean {
  if (schema.parameters.length > 0) {
    return false
  }
  return !hasStructuralSchemaFields(schema)
}

export type NodeInstance = {
  id: string
  schema: NodeSchemaDefinition
  values: NodeParameterValue[]
  /** Instância: ids de parâmetros marcados como obrigatórios neste nó. */
  required_parameter?: string[]
  /** Pares de ids cujo valor é mantido sincronizado (ordem canónica por id). */
  parameter_value_links?: Array<readonly [string, string]>
  /** Espelho do valor string; `hashStringParameterId` usa o mesmo id de lista que no JSON do schema. */
  hashString?: string
  hashStringParameterId?: string
  /** Preferências de visualização lista/compacto por bloco estrutural. */
  elementView?: Partial<Record<ElementViewKey, ElementViewState>>
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
