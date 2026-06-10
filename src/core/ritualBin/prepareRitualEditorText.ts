import { ritualTextNeedsHumanize } from '@/core/vfx/humanizeVfxPropRitualText'

import { fetchLocalInvokeCapabilities } from './fetchLocalInvokeCapabilities'
import { resolveLocalInvokeBase } from './localInvokeGateway'
import type { RitualEditorTextOutcome } from './ritualBinTypes'
import { applyRitualTextLexiconPass } from './ritualTextHashResolve'

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

/** Só envia ao motor nativo exports ritobin (`#PROP` / `#PTCH`); ritual texto puro usa só léxico FNV. */
export function ritualTextEligibleForNativeUnhash(text: string): boolean {
  const trimmed = text.trimStart()
  return trimmed.startsWith('#PROP') || trimmed.startsWith('#PTCH')
}

/**
 * Prepara texto ritual para o editor (modo Nativo): unhash via motor Rust, depois léxico FNV local.
 */
export async function prepareRitualEditorText(text: string): Promise<RitualEditorTextOutcome> {
  if (!ritualTextNeedsHumanize(text)) {
    return { text, changed: false, via: 'unchanged' }
  }

  let working = text
  let nativeChanged = false

  if (ritualTextEligibleForNativeUnhash(text)) {
    const bridge = await unhashViaNativeBridge(text.trim())

    if (bridge.branch === 'success') {
      working = bridge.text
      nativeChanged = bridge.changed
    }
  }

  const lexicon = applyRitualTextLexiconPass(working)
  if (lexicon.changed) {
    working = lexicon.text
  }

  if (working !== text) {
    return {
      text: working,
      changed: true,
      via: nativeChanged ? 'native-unhash' : 'fnv-lexicon',
    }
  }

  return {
    text,
    changed: false,
    via: 'unchanged',
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
