import { isNativeBinDevMode } from '@/core/binDevMode'
import { fetchJadeBridgeCapabilities, type JadeBridgeCapabilities } from '@/core/jadeBridgeApi'
import { computeJadeBridgeBase } from '@/core/jadeBinBridge'
import { fetchLocalInvokeCapabilities } from '@/core/ritualBin/fetchLocalInvokeCapabilities'
import { resolveLocalInvokeBase } from '@/core/ritualBin/localInvokeGateway'

type UnhashResponse = {
  ok?: boolean
  text?: string
  changed?: boolean
  message?: string
}

type HashResolveResponse = {
  ok?: boolean
  string?: string
  message?: string
}

/** Base HTTP para hash/unhash — ritobin (Nativo) ou Jade (modo Bridge). */
export function resolveHashBridgeBase(): string | null {
  if (isNativeBinDevMode()) {
    return resolveLocalInvokeBase()
  }

  return computeJadeBridgeBase({
    dev: import.meta.env.DEV,
    explicitBridgeUrl: import.meta.env.VITE_JADE_BIN_BRIDGE,
    useProxyRaw: import.meta.env.VITE_JADE_USE_PROXY,
    nativeBinMode: false,
  })
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<{ ok: boolean; body: T | null }> {
  const base = resolveHashBridgeBase()
  if (!base) {
    return { ok: false, body: null }
  }

  const mode = base.startsWith('http') ? 'cors' : 'same-origin'

  try {
    const response = await fetch(url, { ...init, mode })
    const body = (await response.json().catch(() => null)) as T | null
    return { ok: response.ok, body }
  } catch {
    return { ok: false, body: null }
  }
}

function statusFromCapabilities(caps: JadeBridgeCapabilities | null): {
  unhashText: boolean
  isMockBridge: boolean
} {
  const provider = caps?.provider ?? null
  const isMockBridge = provider === 'mock-bridge'
  return {
    isMockBridge,
    unhashText: caps?.features?.unhashText === true && !isMockBridge,
  }
}

async function fetchBridgeCapabilities(): Promise<JadeBridgeCapabilities | null> {
  if (isNativeBinDevMode()) {
    return fetchLocalInvokeCapabilities()
  }
  return fetchJadeBridgeCapabilities()
}

/** Pré-carrega tabelas de hash no bridge activo. */
export async function preloadHashBridge(): Promise<void> {
  const base = resolveHashBridgeBase()
  if (!base) {
    return
  }

  try {
    await fetch(`${base.replace(/\/+$/, '')}/hash/preload`, { method: 'POST', mode: 'same-origin' })
  } catch {
    /* offline */
  }
}

/** Resolve hash FNV1a → string (Quartz: tabelas + contexto de linha). */
export async function resolveHashViaBridge(hash: string, contextLine = ''): Promise<string | null> {
  const base = resolveHashBridgeBase()
  if (!base) {
    return null
  }

  const endpoint = `${base.replace(/\/+$/, '')}/hash/resolve`
  const { ok, body } = await fetchJson<HashResolveResponse>(endpoint, {
    body: JSON.stringify({ hash, context_line: contextLine }),
    headers: { 'Content-Type': 'application/json' },
    method: 'POST',
  })

  if (!ok || body?.ok !== true || typeof body.string !== 'string' || !body.string.trim()) {
    return null
  }

  return body.string.trim()
}

/** Unhash de snippet ritual via `/unhash-text` (ritobin ou Jade). */
export async function unhashSnippetViaBridge(
  text: string,
): Promise<{ ok: true; text: string; changed: boolean } | { ok: false; message: string }> {
  const base = resolveHashBridgeBase()
  if (!base) {
    return { ok: false, message: 'Ponte de hashes não configurada' }
  }

  const caps = await fetchBridgeCapabilities()
  const { unhashText, isMockBridge } = statusFromCapabilities(caps)
  if (!unhashText) {
    return {
      ok: false,
      message: isMockBridge
        ? 'Mock bridge — use modo Nativo (ritobin) ou `npm run dev:jade`'
        : 'Endpoint /unhash-text indisponível',
    }
  }

  const endpoint = `${base.replace(/\/+$/, '')}/unhash-text`
  const { ok, body } = await fetchJson<UnhashResponse>(endpoint, {
    body: JSON.stringify({ text }),
    headers: { 'Content-Type': 'application/json' },
    method: 'POST',
  })

  if (!ok || body?.ok !== true || typeof body.text !== 'string') {
    const message =
      typeof body?.message === 'string' ? body.message : 'Resposta do bridge sem texto resolvido'
    return { ok: false, message }
  }

  return {
    ok: true,
    text: body.text,
    changed: body.changed === true || body.text !== text,
  }
}
