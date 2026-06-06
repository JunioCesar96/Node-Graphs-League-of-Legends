import type { CanvasToolbarVisibility } from '@/core/canvasToolbarVisibility'
import type { SceneNodesStatePreset } from '@/core/sceneNodesStatePresets'
import type { SceneNodesSortMode } from '@/core/sceneNodesListSort'
import type {
  NodeCardBodyLayout,
  NodeCardSectionExpandedMap,
  NodeCardSectionId,
} from './nodeCardSections'
import type { NewNodeMaterializePhase } from './codeToNewNodeGraph'
import type { BlockStructurePayload } from './blockSchema'
import type { GroupStructurePayload } from './groupSchema'
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

export const DEFAULT_CANVAS_WIDTH = 1120
export const DEFAULT_CANVAS_HEIGHT = 760

export type CanvasPosition = {
  x: number
  y: number
}

export type AddonInstancePayload = {
  addonId: string
  outputValues: Record<string, unknown>
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
  /** Secções do card expandidas (omitido = só Parameters expandido). */
  cardSectionExpanded?: NodeCardSectionExpandedMap
  /** Ordem das secções colapsáveis no corpo do card. */
  cardSectionOrder?: NodeCardSectionId[]
  /** Organização do corpo: secções por tipo (default) ou lista livre sem painéis. */
  cardBodyLayout?: NodeCardBodyLayout
  /** Oculto no canvas (continua na lista «Nodes em cena»). */
  sceneHidden?: boolean
  /** Mostra no canvas mesmo quando política compacta ocultaria o ramo. */
  branchForceVisible?: boolean
  /** Título fictício no cabeçalho; vazio/ausente usa `schema.title`. */
  displayLabel?: string
  /** Cor do corpo (RGBA); aplicada só com `bodyColorEnabled`. */
  bodyColor?: string
  bodyColorEnabled?: boolean
  /** Trava movimento, edição de valores e ligações de saída. */
  locked?: boolean
  /** Fase de materialização durante transformação Neeko (não persistir). */
  neekoTransformPhase?: NewNodeMaterializePhase
  /** Erro de parse/drop Neeko (não persistir). */
  neekoTransformError?: string
  /** Metadados do sistema Bloco (BlockNodes). */
  blockStructure?: BlockStructurePayload
  /** Quando true, renderiza BlockCard em vez de NodeCard. */
  blockViewActive?: boolean
  /** Metadados do sistema Grupo (GroupNodes). */
  groupStructure?: GroupStructurePayload
  /** Quando true, renderiza GroupCard em vez de NodeCard. */
  groupViewActive?: boolean
  /** Metadados do sistema Add-on (pacotes em public/addons). */
  addonInstance?: AddonInstancePayload
  /** Quando true, renderiza AddonCard. */
  addonViewActive?: boolean
  /** Card grupo/bloco: parâmetros em duas linhas (nome completo + valor). Omitido = linha única compacta. */
  structureCardParamsExpanded?: boolean
  /** Largura manual do card grupo/bloco (px). Omitido = largura padrão (360). */
  structureCardWidth?: number
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
  /** Origem slot de bloco (saída). */
  fromBlockSlotId?: string
  fromBlockParameterId?: string
  /** Destino slot de bloco (entrada). */
  toBlockSlotId?: string
  toBlockParameterId?: string
  /** Origem slot de grupo (saída). */
  fromGroupSlotId?: string
  fromGroupParameterId?: string
  /** Destino slot de grupo (entrada). */
  toGroupSlotId?: string
  toGroupParameterId?: string
  /** Origem slot de add-on (saída). */
  fromAddonSlotId?: string
  /** Destino slot de add-on (entrada). */
  toAddonSlotId?: string
  /** Ligação bloco com tipo de saída incompatível mas campo IN aceite (confirmada pelo utilizador). */
  forced?: boolean
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
    ...(connection.fromBlockSlotId ? { fromBlockSlotId: connection.fromBlockSlotId } : {}),
    ...(connection.fromBlockParameterId ? { fromBlockParameterId: connection.fromBlockParameterId } : {}),
    ...(connection.toBlockSlotId ? { toBlockSlotId: connection.toBlockSlotId } : {}),
    ...(connection.toBlockParameterId ? { toBlockParameterId: connection.toBlockParameterId } : {}),
    ...(connection.fromGroupSlotId ? { fromGroupSlotId: connection.fromGroupSlotId } : {}),
    ...(connection.fromGroupParameterId ? { fromGroupParameterId: connection.fromGroupParameterId } : {}),
    ...(connection.toGroupSlotId ? { toGroupSlotId: connection.toGroupSlotId } : {}),
    ...(connection.toGroupParameterId ? { toGroupParameterId: connection.toGroupParameterId } : {}),
    ...(connection.fromAddonSlotId ? { fromAddonSlotId: connection.fromAddonSlotId } : {}),
    ...(connection.toAddonSlotId ? { toAddonSlotId: connection.toAddonSlotId } : {}),
    ...(connection.forced ? { forced: true } : {}),
  }
}

/** Estado do painel «Nodes em cena». */
export type SceneNodesChrome = {
  minimized?: boolean
  sortMode?: SceneNodesSortMode
  /** Presets nomeados de overlay/visibilidade dos nós em cena. */
  presets?: SceneNodesStatePreset[]
}

export type SceneChromeState = {
  sceneNodes?: SceneNodesChrome
  /** Barra de ferramentas da grade retraída (só ícone de ferramentas). */
  toolbarCollapsed?: boolean
  toolbarVisibility?: CanvasToolbarVisibility
  /** Fundo da grade do canvas (linhas). Predefinido: visível. */
  showCanvasGrid?: boolean
  /** Passo da grelha em px (predefinido: 32). */
  canvasGridSize?: number
  /** Opacidade das linhas 0–40 (predefinido: 7). */
  canvasGridOpacity?: number
  /** Colorir linhas horizontais e verticais com cores próprias. */
  canvasGridLineColorEnabled?: boolean
  canvasGridHorizontalLineColor?: string
  canvasGridVerticalLineColor?: string
  /** Fundo em xadrez alinhado ao passo da grade. */
  canvasGridCheckerEnabled?: boolean
  canvasGridCheckerColorA?: string
  canvasGridCheckerColorB?: string
}

/** Filtro activo «Mostrar apenas nós ligados» (reavaliado ao mudar índice / modo compacto). */
export type LinkVisibilityFilter =
  | { mode: 'branch'; seedNodeId: string }
  | { mode: 'slot'; fromNodeId: string; slotId: string }
  | { mode: 'incoming'; toNodeId: string }

export type CanvasScene = {
  width: number
  height: number
  nodes: CanvasNode[]
  connections: CanvasConnection[]
  /** connectionId → routing antes de compactar (`undefined` = flex implícito). */
  compactRoutingBackups?: Record<string, ConnectionRouting | undefined>
  /** Câmera da cena (pan em px na vista, escala de zoom). */
  camera?: SceneCamera
  /** UI global: painel Nodes em cena, visibilidade da toolbar, etc. */
  sceneChrome?: SceneChromeState
  /** Quando definido, só nós do conjunto calculado ficam visíveis (além de `sceneHidden`). */
  linkVisibilityFilter?: LinkVisibilityFilter
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

const emptyCanvasSceneRaw = {
  width: DEFAULT_CANVAS_WIDTH,
  height: DEFAULT_CANVAS_HEIGHT,
  nodes: [],
  connections: [],
} satisfies CanvasScene

/** Grade sem nós — cena inicial, abas novas e fallbacks de storage. */
export const emptyCanvasScene = hydrateScene(emptyCanvasSceneRaw)

/** @deprecated Usa `emptyCanvasScene`. Mantido para imports legados. */
export const staticCanvasScene = emptyCanvasScene
