import type {
  InternalStructureDefinition,
  NodeInstance,
  NodeSchemaDefinition,
} from './nodeSchema'

import {
  schemaRegistry as _registry,
  createNodeInstance as _createNodeInstance,
  schemaPackFolderBySchemaId as _schemaPackFolderBySchemaId,
  schemaStructureSubfolderBySchemaId as _schemaStructureSubfolderBySchemaId,
  schemaNodeKindBySchemaId as _schemaNodeKindBySchemaId,
  schemaBaseParameterCatalogBySchemaId as _schemaBaseParameterCatalogBySchemaId,
  schemaBaseInternalStructureCatalogBySchemaId as _schemaBaseInternalStructureCatalogBySchemaId,
} from './nodeStructureRegistry'

/** Registo construído a partir de JSON sob `src/nodeStructures/<pasta>/` (dinâmico no bundle). */
export const schemaRegistry = _registry

/** Pasta de cada schema (nome do directório logo abaixo de `nodeStructures/`). */
export const schemaPackFolderBySchemaId = _schemaPackFolderBySchemaId

/** Subpasta imediata dentro do pack (`''` = raiz). */
export const schemaStructureSubfolderBySchemaId = _schemaStructureSubfolderBySchemaId

export const schemaNodeKindBySchemaId = _schemaNodeKindBySchemaId

export const schemaBaseParameterCatalogBySchemaId = _schemaBaseParameterCatalogBySchemaId

export const schemaBaseInternalStructureCatalogBySchemaId = _schemaBaseInternalStructureCatalogBySchemaId

export function createNodeInstance(
  schemaId: string,
  instanceId: string,
): NodeInstance | null {
  return _createNodeInstance(schemaId, instanceId)
}

function schemaRef(id: string): NodeSchemaDefinition {
  const schema = schemaRegistry[id]
  if (!schema) {
    throw new Error(
      `Estrutura de nó em falta: "${id}". Adiciona ou corrige um ficheiro em src/nodeStructures/<pasta>/ (ex.: default).`,
    )
  }
  return schema
}

export type CanvasPosition = {
  x: number
  y: number
}

export type CanvasNode = {
  id: string
  node: NodeInstance
  position: CanvasPosition
}

export type ConnectionRouting = 'flex' | 'rigid'

export type CanvasConnection = {
  id: string
  fromNodeId: string
  /** Origem nominal: campo de Internal_Structures (Set Nomenclature #3). */
  fromInternalStructureId: string
  toNodeId: string
  routing?: ConnectionRouting
}

function coerceEmbeddedSchema(schema: NodeSchemaDefinition): NodeSchemaDefinition {
  const probe = schema as NodeSchemaDefinition & { entities?: InternalStructureDefinition[] }
  const nominal = probe.internalStructures
  const legacyList = probe.entities
  const internalStructures =
    Array.isArray(nominal) && nominal.length > 0
      ? nominal
      : Array.isArray(legacyList)
        ? legacyList
        : []

  return {
    ...schema,
    internalStructures,
  }
}

function migrateConnection(connection: CanvasConnection): CanvasConnection {
  const legacy = connection as CanvasConnection & { fromEntityId?: string }
  const fromNew =
    typeof connection.fromInternalStructureId === 'string' ? connection.fromInternalStructureId : ''
  const fromLegacyId = typeof legacy.fromEntityId === 'string' ? legacy.fromEntityId : ''
  const fromInternalStructureId = fromNew || fromLegacyId

  return {
    id: connection.id,
    fromNodeId: connection.fromNodeId,
    fromInternalStructureId,
    toNodeId: connection.toNodeId,
    ...(connection.routing ? { routing: connection.routing } : {}),
  }
}

export type CanvasScene = {
  width: number
  height: number
  nodes: CanvasNode[]
  connections: CanvasConnection[]
}

export function hydrateScene(scene: CanvasScene): CanvasScene {
  return {
    ...scene,
    connections: scene.connections.map((c) =>
      migrateConnection({
        ...c,
        ...(c.routing ? { routing: c.routing } : {}),
      }),
    ),
    nodes: scene.nodes.map((n) => ({
      ...n,
      node: {
        ...n.node,
        schema: coerceEmbeddedSchema(structuredClone(n.node.schema)),
        values: structuredClone(n.node.values),
      },
    })),
  }
}

const staticCanvasSceneRaw = {
  width: 1120,
  height: 760,
  nodes: [
    {
      id: 'particle-root-01',
      node: {
        id: 'particle-root-01',
        schema: schemaRef('particle-root'),
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
      },
      position: {
        x: 72,
        y: 190,
      },
    },
    {
      id: 'emitter-01',
      node: {
        id: 'emitter-01',
        schema: schemaRef('emitter-shape'),
        values: [
          {
            parameterId: 'shape',
            value: '"cone"',
          },
          {
            parameterId: 'radius',
            value: '1.25',
          },
          {
            parameterId: 'offset',
            value: '0, 0.5, 0',
          },
        ],
      },
      position: {
        x: 600,
        y: 72,
      },
    },
    {
      id: 'emitter-alt-01',
      node: {
        id: 'emitter-alt-01',
        schema: schemaRef('emitter-shape'),
        values: [
          {
            parameterId: 'shape',
            value: '"sphere"',
          },
          {
            parameterId: 'radius',
            value: '2.4',
          },
          {
            parameterId: 'offset',
            value: '0, -0.25, 0',
          },
        ],
      },
      position: {
        x: 1010,
        y: 92,
      },
    },
    {
      id: 'force-01',
      node: {
        id: 'force-01',
        schema: schemaRef('world-force'),
        values: [
          {
            parameterId: 'gravity',
            value: '0, -9.8, 0',
          },
          {
            parameterId: 'drag',
            value: '0.18',
          },
        ],
      },
      position: {
        x: 600,
        y: 390,
      },
    },
    {
      id: 'falloff-01',
      node: {
        id: 'falloff-01',
        schema: schemaRef('falloff-curve'),
        values: [
          {
            parameterId: 'mode',
            value: 'smoothstep',
          },
          {
            parameterId: 'strength',
            value: '0.845',
          },
        ],
      },
      position: {
        x: 910,
        y: 474,
      },
    },
  ],
  connections: [
    {
      id: 'root-to-emitter',
      fromNodeId: 'particle-root-01',
      fromInternalStructureId: 'emitter',
      toNodeId: 'emitter-01',
    },
    {
      id: 'root-to-force',
      fromNodeId: 'particle-root-01',
      fromInternalStructureId: 'force',
      toNodeId: 'force-01',
    },
    {
      id: 'force-to-falloff',
      fromNodeId: 'force-01',
      fromInternalStructureId: 'falloff',
      toNodeId: 'falloff-01',
    },
  ],
} satisfies CanvasScene

export const staticCanvasScene = hydrateScene(staticCanvasSceneRaw)
