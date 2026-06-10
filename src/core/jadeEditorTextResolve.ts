import { convertBinViaOptionalBridge, computeJadeBridgeBase } from '@/core/jadeBinBridge'
import { fetchJadeBridgeCapabilities, type JadeBridgeCapabilities } from '@/core/jadeBridgeApi'
import { ritualTextNeedsHumanize } from '@/core/vfx/humanizeVfxPropRitualText'

import { ritualTextEligibleForNativeUnhash } from '@/core/ritualBin/prepareRitualEditorText'
import { applyRitualTextLexiconPass } from '@/core/ritualBin/ritualTextHashResolve'

export type JadeEditorResolveVia =
  | 'unchanged'
  | 'jade-bridge'
  | 'fnv-fallback'
  | 'convert-only'

export type JadeEditorResolveResult = {
  text: string
  changed: boolean
  via: JadeEditorResolveVia
  warning?: string
}

export type JadeEditorResolveStatus = {
  bridgeBase: string | null
  provider: string | null
  unhashText: boolean
  isMockBridge: boolean
  hashPreloadEnabled: boolean
  fnvCount: number | null
}

type JadeUnhashResponse = {
  ok?: boolean
  text?: string
  changed?: boolean
  message?: string
}

type JadePreloadStatusResponse = {
  loaded?: boolean
  fnv_count?: number
  fnvCount?: number
}

let hashPreloadPromise: Promise<void> | null = null

function resolveJadeBridgeBase(): string | null {
  return computeJadeBridgeBase({
    dev: import.meta.env.DEV,
    explicitBridgeUrl: import.meta.env.VITE_JADE_BIN_BRIDGE,
    useProxyRaw: import.meta.env.VITE_JADE_USE_PROXY,
  })
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<{ ok: boolean; status: number; body: T | null }> {
  const base = resolveJadeBridgeBase()
  if (!base) {
    return { ok: false, status: 0, body: null }
  }

  const mode = base.startsWith('http') ? 'cors' : 'same-origin'

  try {
    const response = await fetch(url, { ...init, mode })
    const body = (await response.json().catch(() => null)) as T | null
    return { ok: response.ok, status: response.status, body }
  } catch {
    return { ok: false, status: 0, body: null }
  }
}

/** Pré-carrega tabelas FrogTools no motor Jade (`POST /hash/preload`). */
export async function ensureJadeHashesLoaded(): Promise<void> {
  const base = resolveJadeBridgeBase()
  if (!base) {
    return
  }

  if (hashPreloadPromise) {
    await hashPreloadPromise
    return
  }

  hashPreloadPromise = (async () => {
    const root = base.replace(/\/+$/, '')
    await fetchJson(`${root}/hash/preload`, { method: 'POST' })
  })()

  await hashPreloadPromise
}

export async function getJadeEditorResolveStatus(): Promise<JadeEditorResolveStatus> {
  const bridgeBase = resolveJadeBridgeBase()
  const caps = await fetchJadeBridgeCapabilities()
  const provider = caps?.provider ?? null
  const isMockBridge = provider === 'mock-bridge'
  const unhashText = caps?.features?.unhashText === true && !isMockBridge

  let fnvCount: number | null = null
  if (bridgeBase && caps?.features?.hashPreload) {
    const status = await fetchJson<JadePreloadStatusResponse>(
      `${bridgeBase.replace(/\/+$/, '')}/hash/preload-status`,
    )
    if (status.ok && status.body) {
      fnvCount = status.body.fnv_count ?? status.body.fnvCount ?? null
    }
  }

  return {
    bridgeBase,
    provider,
    unhashText,
    isMockBridge,
    hashPreloadEnabled: caps?.features?.hashPreload === true,
    fnvCount,
  }
}

function statusFromCapabilities(caps: JadeBridgeCapabilities | null): Pick<
  JadeEditorResolveStatus,
  'provider' | 'unhashText' | 'isMockBridge'
> {
  const provider = caps?.provider ?? null
  const isMockBridge = provider === 'mock-bridge'
  return {
    provider,
    isMockBridge,
    unhashText: caps?.features?.unhashText === true && !isMockBridge,
  }
}

async function unhashViaBridge(text: string): Promise<
  | { ok: true; text: string; changed: boolean }
  | { ok: false; message: string }
> {
  const base = resolveJadeBridgeBase()
  if (!base) {
    return { ok: false, message: 'Jade bridge não configurado' }
  }

  const caps = await fetchJadeBridgeCapabilities()
  const { unhashText, isMockBridge } = statusFromCapabilities(caps)
  if (!unhashText) {
    return {
      ok: false,
      message: isMockBridge
        ? 'Mock bridge — compile `npm run jade:http-bridge:build` e reinicia `npm run dev`'
        : 'Endpoint /unhash-text indisponível neste bridge',
    }
  }

  const endpoint = `${base.replace(/\/+$/, '')}/unhash-text`
  const { ok, body } = await fetchJson<JadeUnhashResponse>(endpoint, {
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

/** `POST /convert` — binário já devolvido com hashes resolvidos pelo motor Jade. */
export async function resolveBinFileForEditor(file: File): Promise<
  | { ok: true; text: string }
  | { ok: false; branch: 'not_configured' | 'network_error' | 'bridge_error'; message: string; status?: number }
> {
  await ensureJadeHashesLoaded()
  const result = await convertBinViaOptionalBridge(file)

  if (result.branch === 'success') {
    return { ok: true, text: result.text }
  }

  if (result.branch === 'not_configured') {
    return { ok: false, branch: 'not_configured', message: 'Jade bridge não configurado' }
  }

  if (result.branch === 'network_error') {
    return { ok: false, branch: 'network_error', message: result.message }
  }

  return {
    ok: false,
    branch: 'bridge_error',
    message: result.message,
    status: result.status,
  }
}

/** Texto ritual — `POST /unhash-text` quando ainda há hashes; senão inalterado. */
export async function resolveRitualTextForEditor(text: string): Promise<JadeEditorResolveResult> {
  if (!ritualTextNeedsHumanize(text)) {
    return { text, changed: false, via: 'unchanged' }
  }

  await ensureJadeHashesLoaded()

  const bridge = ritualTextEligibleForNativeUnhash(text)
    ? await unhashViaBridge(text.trim())
    : null

  if (bridge?.ok) {
    let working = bridge.text
    const afterBridge = working

    const lexicon = applyRitualTextLexiconPass(working)
    if (lexicon.changed) {
      working = lexicon.text
    }

    if (working === text) {
      return { text, changed: false, via: 'unchanged' }
    }

    const lexiconOnly = !bridge.changed && working !== afterBridge
    return {
      text: working,
      changed: true,
      via: lexiconOnly ? 'fnv-fallback' : 'jade-bridge',
    }
  }

  const fallback = applyRitualTextLexiconPass(text)
  if (fallback.changed) {
    return {
      text: fallback.text,
      changed: true,
      via: 'fnv-fallback',
    }
  }

  return { text, changed: false, via: 'unchanged' }
}
