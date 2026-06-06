import {
  humanizeVfxPropRitualText,
  ritualTextNeedsHumanize,
} from '@/core/vfx/humanizeVfxPropRitualText'

import { fetchLocalInvokeCapabilities } from './fetchLocalInvokeCapabilities'
import { resolveLocalInvokeBase } from './localInvokeGateway'
import type { RitualEditorTextOutcome } from './ritualBinTypes'

type UnhashResponse = {
  ok?: boolean
  text?: string
  changed?: boolean
  message?: string
}

async function unhashViaNativeBridge(text: string): Promise<
  | { branch: 'success'; text: string; changed: boolean }
  | { branch: 'unavailable'; message: string }
  | { branch: 'error'; message: string }
> {
  const base = resolveLocalInvokeBase()

  if (!base) {
    return { branch: 'unavailable', message: 'Ponte nativa não configurada' }
  }

  const caps = await fetchLocalInvokeCapabilities()

  if (caps?.features?.unhashText !== true) {
    return { branch: 'unavailable', message: 'Endpoint /unhash-text indisponível' }
  }

  const endpoint = `${base.replace(/\/+$/, '')}/unhash-text`

  try {
    const response = await fetch(endpoint, {
      body: JSON.stringify({ text }),
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
      mode: base.startsWith('http') ? 'cors' : 'same-origin',
    })

    const body = (await response.json().catch(() => null)) as UnhashResponse | null

    if (!response.ok || body?.ok !== true || typeof body.text !== 'string') {
      const message =
        typeof body?.message === 'string' ? body.message : `HTTP ${String(response.status)}`
      return { branch: 'error', message }
    }

    return {
      branch: 'success',
      changed: body.changed === true,
      text: body.text,
    }
  } catch (caught) {
    const message = caught instanceof Error ? caught.message : 'Falha de rede'
    return { branch: 'error', message }
  }
}

/**
 * Prepara texto ritual para o editor (modo Nativo): unhash via motor Rust + fallback FNV local.
 */
export async function prepareRitualEditorText(text: string): Promise<RitualEditorTextOutcome> {
  if (!ritualTextNeedsHumanize(text)) {
    return { text, changed: false, via: 'unchanged' }
  }

  const bridge = await unhashViaNativeBridge(text)

  if (bridge.branch === 'success') {
    if (bridge.changed) {
      return {
        text: bridge.text,
        changed: true,
        via: 'native-unhash',
      }
    }

    if (!ritualTextNeedsHumanize(bridge.text)) {
      return { text: bridge.text, changed: false, via: 'unchanged' }
    }
  }

  const lexicon = humanizeVfxPropRitualText(text)

  if (lexicon.changed) {
    return {
      text: lexicon.text,
      changed: true,
      via: 'fnv-lexicon',
    }
  }

  const notice =
    bridge.branch === 'unavailable'
      ? 'Motor nativo offline — compile com `npm run native:http-bridge:build` e reinicia o dev.'
      : bridge.branch === 'error'
        ? `Unhash nativo falhou (${bridge.message}); léxico FNV local não resolveu.`
        : 'Hashes PROP detectados; motor nativo e léxico FNV local não resolveram todos os campos.'

  return {
    text,
    changed: false,
    via: 'unchanged',
    notice,
  }
}

export async function getNativeEditorResolveStatus(): Promise<{
  bridgeBase: string | null
  provider: string | null
  unhashText: boolean
  hashCount: number | null
}> {
  const bridgeBase = resolveLocalInvokeBase()
  const caps = await fetchLocalInvokeCapabilities()

  return {
    bridgeBase,
    hashCount: typeof caps?.hashCount === 'number' ? caps.hashCount : null,
    provider: caps?.provider ?? null,
    unhashText: caps?.features?.unhashText === true,
  }
}
