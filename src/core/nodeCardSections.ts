import type { CanvasNode } from '@/core/canvasScene'
import type { NodeInstance } from '@/core/nodeSchema'

/** Organização visual do corpo do NodeCard. */
export type NodeCardBodyLayout = 'bySectionType' | 'freeform'

const NODE_CARD_BODY_LAYOUTS: readonly NodeCardBodyLayout[] = ['bySectionType', 'freeform']

export function isNodeCardBodyLayout(value: string): value is NodeCardBodyLayout {
  return (NODE_CARD_BODY_LAYOUTS as readonly string[]).includes(value)
}

export function resolveNodeCardBodyLayout(canvasNode: CanvasNode): NodeCardBodyLayout {
  return canvasNode.cardBodyLayout ?? 'bySectionType'
}

/** Overlay de layout aplicado a cada nó novo (palette, ligação, import, etc.). */
export function defaultNewCanvasNodeLayout(
  node: NodeInstance,
): Pick<CanvasNode, 'cardBodyLayout' | 'cardSectionExpanded'> {
  return {
    cardBodyLayout: 'freeform',
    cardSectionExpanded: allVisibleSectionsExpandedMap(node),
  }
}

export function isNodeCardFreeform(canvasNode: CanvasNode): boolean {
  return resolveNodeCardBodyLayout(canvasNode) === 'freeform'
}

/** Secções colapsáveis do corpo do NodeCard (ordem no card). */
export type NodeCardSectionId =
  | 'parameters'
  | 'embed'
  | 'pointer'
  | 'listEmbed'
  | 'listPointer'
  | 'list2Embed'
  | 'list2Pointer'

export const NODE_CARD_SECTION_IDS: readonly NodeCardSectionId[] = [
  'parameters',
  'embed',
  'pointer',
  'listEmbed',
  'listPointer',
  'list2Embed',
  'list2Pointer',
] as const

/** Largura útil mínima de cada secção colapsável — alinhada a `--node-card-section-min-width`. */
export const NODE_CARD_SECTION_MIN_WIDTH = 360

/** Margem horizontal do corpo do card (px) — alinhada a `--node-card-body-padding-x` (space-4). */
export const NODE_CARD_BODY_PADDING_X = 16

/** Largura total do card no canvas — alinhada a `--node-card-width`. */
export const NODE_CARD_WIDTH = NODE_CARD_SECTION_MIN_WIDTH + NODE_CARD_BODY_PADDING_X * 2

/** Altura da barra de título (reclusa ou expandida) — alinhada ao GraphCanvas. */
export const NODE_CARD_SECTION_HEADER_HEIGHT = 36

/** Padding superior do painel expandido (abaixo do header). */
export const NODE_CARD_SECTION_PANEL_PADDING_TOP = 16

/** Padding inferior do painel expandido. */
export const NODE_CARD_SECTION_PANEL_PADDING_BOTTOM = 16

/** Alias usado no posicionamento de portas (topo do conteúdo da secção). */
export const NODE_CARD_SECTION_CONTENT_GAP = NODE_CARD_SECTION_PANEL_PADDING_TOP

export const NODE_CARD_SECTION_LABELS: Record<NodeCardSectionId, string> = {
  parameters: 'Parameters',
  embed: 'EMBED',
  pointer: 'POINTER',
  listEmbed: 'LIST_EMBED',
  listPointer: 'LIST_POINTER',
  list2Embed: 'LIST2_EMBED',
  list2Pointer: 'LIST2_POINTER',
}

export function isNodeCardSectionVisible(node: NodeInstance, sectionId: NodeCardSectionId): boolean {
  if (sectionId === 'list2Embed') {
    return (node.schema.list2Embed?.length ?? 0) > 0
  }
  if (sectionId === 'list2Pointer') {
    return (node.schema.list2Pointer?.length ?? 0) > 0
  }
  return true
}

export function visibleNodeCardSectionIds(node: NodeInstance): NodeCardSectionId[] {
  return NODE_CARD_SECTION_IDS.filter((id) => isNodeCardSectionVisible(node, id))
}

/** Expande todas as secções visíveis do nó (usado ao activar forma livre). */
export function allVisibleSectionsExpandedMap(node: NodeInstance): NodeCardSectionExpandedMap {
  const out: NodeCardSectionExpandedMap = {}
  for (const id of visibleNodeCardSectionIds(node)) {
    out[id] = true
  }
  return out
}

/** Ordem efectiva no card (custom + secções visíveis que faltem no array). */
export function resolveNodeCardSectionOrder(
  customOrder: readonly NodeCardSectionId[] | undefined,
  node: NodeInstance,
): NodeCardSectionId[] {
  const visible = visibleNodeCardSectionIds(node)
  const visibleSet = new Set(visible)
  const ordered: NodeCardSectionId[] = []

  for (const id of customOrder ?? NODE_CARD_SECTION_IDS) {
    if (visibleSet.has(id) && !ordered.includes(id)) {
      ordered.push(id)
    }
  }
  for (const id of visible) {
    if (!ordered.includes(id)) {
      ordered.push(id)
    }
  }
  return ordered
}

export function resolveNodeCardSectionOrderForCanvasNode(canvasNode: CanvasNode): NodeCardSectionId[] {
  return resolveNodeCardSectionOrder(canvasNode.cardSectionOrder, canvasNode.node)
}

export type NodeCardSectionExpandedMap = Partial<Record<NodeCardSectionId, boolean>>

export function isNodeCardSectionId(value: string): value is NodeCardSectionId {
  return (NODE_CARD_SECTION_IDS as readonly string[]).includes(value)
}

export function resolveNodeCardSectionExpanded(
  overrides: NodeCardSectionExpandedMap | undefined,
  sectionId: NodeCardSectionId,
): boolean {
  if (overrides?.[sectionId] !== undefined) {
    return overrides[sectionId]!
  }
  return sectionId === 'parameters'
}

export function isNodeCardSectionExpanded(
  canvasNode: CanvasNode,
  sectionId: NodeCardSectionId,
): boolean {
  if (isNodeCardFreeform(canvasNode)) {
    return true
  }
  return resolveNodeCardSectionExpanded(canvasNode.cardSectionExpanded, sectionId)
}

export function nextNodeCardSectionExpandedMap(
  current: NodeCardSectionExpandedMap | undefined,
  sectionId: NodeCardSectionId,
): NodeCardSectionExpandedMap {
  const expanded = resolveNodeCardSectionExpanded(current, sectionId)
  return { ...current, [sectionId]: !expanded }
}

export function nodeCardSectionChromeHeight(expanded: boolean, contentHeight: number): number {
  if (!expanded) {
    return NODE_CARD_SECTION_HEADER_HEIGHT
  }
  return (
    NODE_CARD_SECTION_HEADER_HEIGHT +
    NODE_CARD_SECTION_PANEL_PADDING_TOP +
    contentHeight +
    NODE_CARD_SECTION_PANEL_PADDING_BOTTOM
  )
}
