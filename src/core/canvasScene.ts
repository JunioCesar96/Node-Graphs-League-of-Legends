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
  schemaJsonRelativePathBySchemaId as _schemaJsonRelativePathBySchemaId,
} from './nodeStructureRegistry'

import { applyEmbedSlotsToSchema } from './embedSlots'
import { applyListPointerSlotsToSchema } from './listPointerSlots'
import { applyPointerSlotsToSchema } from './pointerSlots'
import { applyList2EmbedInstancesToSchema } from './list2EmbedSlots'
import { applyList2PointerInstancesToSchema } from './list2PointerSlots'
import { applyListEmbedSlotsToSchema, migrateSceneListEmbedConnections } from './listEmbedSlots'
import {
  instanceLinkedPairsEqual,
  linked_parameter_values_apply_to_instance,
  translateDiskLinkedPairsToCanvas,
} from './linked_parameter_values'

/** Registo construído a partir de JSON sob `src/nodeStructures/<pasta>/` (dinâmico no bundle). */
export const schemaRegistry = _registry

/** Pasta de cada schema (nome do directório logo abaixo de `nodeStructures/`). */
export const schemaPackFolderBySchemaId = _schemaPackFolderBySchemaId

/** Subpasta imediata dentro do pack (`''` = raiz). */
export const schemaStructureSubfolderBySchemaId = _schemaStructureSubfolderBySchemaId

export const schemaNodeKindBySchemaId = _schemaNodeKindBySchemaId

export const schemaBaseParameterCatalogBySchemaId = _schemaBaseParameterCatalogBySchemaId

export const schemaBaseInternalStructureCatalogBySchemaId = _schemaBaseInternalStructureCatalogBySchemaId

export const schemaJsonRelativePathBySchemaId = _schemaJsonRelativePathBySchemaId

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

/** Deslocamento (pan) e zoom da vista do canvas — persistido no layout do workspace. */
export type SceneCamera = {
  pan: CanvasPosition
  scale: number
}

export type CanvasNode = {
  id: string
  node: NodeInstance
  position: CanvasPosition
  /** Quando true, o corpo do card fica oculto (só cabeçalho visível). */
  bodyCollapsed?: boolean
  /** Oculto no canvas (continua na lista «Nodes em cena»). */
  sceneHidden?: boolean
  /** Título fictício no cabeçalho; vazio/ausente usa `schema.title`. */
  displayLabel?: string
  /** Cor do corpo (RGBA); aplicada só com `bodyColorEnabled`. */
  bodyColor?: string
  bodyColorEnabled?: boolean
  /** Trava movimento, edição de valores e ligações de saída. */
  locked?: boolean
}

export function isCanvasNodeBodyCollapsed(canvasNode: CanvasNode): boolean {
  return canvasNode.bodyCollapsed === true
}

export type ConnectionRouting = 'flex' | 'rigid' | 'wireless'

export function nextConnectionRouting(current?: ConnectionRouting): ConnectionRouting {
  if (current === 'rigid') {
    return 'wireless'
  }
  if (current === 'wireless') {
    return 'flex'
  }
  return 'rigid'
}

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

  const embed = Array.isArray(schema.embed) ? schema.embed : []
  const listEmbed = Array.isArray(schema.listEmbed) ? schema.listEmbed : []

  return {
    ...schema,
    internalStructures,
    ...(embed.length > 0 ? { embed } : {}),
    ...(listEmbed.length > 0 ? { listEmbed } : {}),
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
  /** connectionId → routing antes de compactar (`undefined` = flex implícito). */
  compactRoutingBackups?: Record<string, ConnectionRouting | undefined>
  /** Câmera da cena (pan em px na vista, escala de zoom). */
  camera?: SceneCamera
}

function hydrateNodeInstanceFromEmbeddedLinks(node: NodeInstance): NodeInstance {
  const disk = node.schema.linked_parameter_values
  if (disk === undefined) {
    return node
  }

  const catalog = schemaBaseParameterCatalogBySchemaId[node.schema.id] ?? []
  const translated = translateDiskLinkedPairsToCanvas(disk, node, catalog)
  if (disk.length > 0 && translated.length === 0) {
    return node
  }

  if (instanceLinkedPairsEqual(node.parameter_value_links, translated)) {
    return node
  }

  return linked_parameter_values_apply_to_instance(node, translated, disk, catalog)
}

export function hydrateScene(scene: CanvasScene): CanvasScene {
  const nodes = scene.nodes.map((n) => {
    const nodeInstance: NodeInstance = {
      ...n.node,
      schema: applyList2PointerInstancesToSchema(
        applyList2EmbedInstancesToSchema(
          applyPointerSlotsToSchema(
            applyEmbedSlotsToSchema(
              applyListPointerSlotsToSchema(
                applyListEmbedSlotsToSchema(coerceEmbeddedSchema(structuredClone(n.node.schema))),
              ),
            ),
          ),
        ),
      ),
      values: structuredClone(n.node.values),
        ...(Array.isArray(n.node.required_parameter)
          ? { required_parameter: structuredClone(n.node.required_parameter) }
          : {}),
        ...(Array.isArray(n.node.parameter_value_links)
          ? { parameter_value_links: structuredClone(n.node.parameter_value_links) }
          : {}),
        ...(typeof n.node.hashString === 'string' ? { hashString: n.node.hashString } : {}),
        ...(typeof n.node.hashStringParameterId === 'string'
          ? { hashStringParameterId: n.node.hashStringParameterId }
          : {}),
        ...(n.node.elementView && Object.keys(n.node.elementView).length > 0
          ? { elementView: structuredClone(n.node.elementView) }
          : {}),
      }

    return {
      ...n,
      node: hydrateNodeInstanceFromEmbeddedLinks(nodeInstance),
    }
  })

  return {
    ...scene,
    ...(scene.compactRoutingBackups && Object.keys(scene.compactRoutingBackups).length > 0
      ? { compactRoutingBackups: structuredClone(scene.compactRoutingBackups) }
      : {}),
    connections: migrateSceneListEmbedConnections(
      nodes,
      scene.connections.map((c) =>
        migrateConnection({
          ...c,
          ...(c.routing ? { routing: c.routing } : {}),
        }),
      ),
    ),
    nodes,
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
