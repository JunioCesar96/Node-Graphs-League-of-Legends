import type { ConnectionRouting } from '@/core/canvasScene'

import { LangId } from './language/languageIds'

export const SET_CONNECTION_ROUTING_PREFIX = 'slot.setRouting:'

export const CONNECTION_ROUTING_LABELS: Record<ConnectionRouting, string> = {
  flex: 'Fio flexível',
  rigid: 'Fio rígido',
  wireless: 'Sem fio (ícone)',
}

export function effectiveConnectionRouting(routing?: ConnectionRouting): ConnectionRouting {
  return routing ?? 'flex'
}

const ROUTING_LANG_IDS: Record<ConnectionRouting, number> = {
  flex: LangId.CtxWireFlex,
  rigid: LangId.CtxWireRigid,
  wireless: LangId.CtxWireWireless,
}

export function getConnectionRoutingLabel(
  routing: ConnectionRouting,
  tr?: (id: number, fallback: string) => string,
): string {
  const fallback = CONNECTION_ROUTING_LABELS[routing]

  return tr?.(ROUTING_LANG_IDS[routing], fallback) ?? fallback
}

export function setConnectionRoutingMenuId(
  connectionId: string,
  routing: ConnectionRouting,
): string {
  return `${SET_CONNECTION_ROUTING_PREFIX}${connectionId}:${routing}`
}

export function parseSetConnectionRoutingMenuId(
  id: string,
): { connectionId: string; routing: ConnectionRouting } | null {
  if (!id.startsWith(SET_CONNECTION_ROUTING_PREFIX)) {
    return null
  }

  const rest = id.slice(SET_CONNECTION_ROUTING_PREFIX.length)
  const lastColon = rest.lastIndexOf(':')

  if (lastColon <= 0) {
    return null
  }

  const connectionId = rest.slice(0, lastColon)
  const routingRaw = rest.slice(lastColon + 1)

  if (routingRaw !== 'flex' && routingRaw !== 'rigid' && routingRaw !== 'wireless') {
    return null
  }

  if (!connectionId) {
    return null
  }

  return { connectionId, routing: routingRaw }
}
