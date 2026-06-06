import {
  getPreferenceBackend,
  setPreferenceBackend,
  type PreferenceBackend,
} from '@jade/lib/preferenceStore'
import { isTauriRuntime } from '@jade/lib/runtimeBridge'

import { computeJadeBridgeBase } from '@/core/jadeBinBridge'
import { webPreferenceBackend } from './webPreferenceBackend'

function bridgeBase(): string | null {
  return computeJadeBridgeBase({
    dev: import.meta.env.DEV,
    explicitBridgeUrl: import.meta.env.VITE_JADE_BIN_BRIDGE,
    useProxyRaw: import.meta.env.VITE_JADE_USE_PROXY,
  })
}

async function bridgeGet(key: string, defaultValue: string): Promise<string | null> {
  const base = bridgeBase()
  if (!base) return null
  try {
    const url = `${base}/preference?key=${encodeURIComponent(key)}&default=${encodeURIComponent(defaultValue)}`
    const res = await fetch(url)
    if (!res.ok) return null
    const body = (await res.json()) as { ok?: boolean; value?: string }
    return body.ok && typeof body.value === 'string' ? body.value : null
  } catch {
    return null
  }
}

async function bridgeSet(key: string, value: string): Promise<boolean> {
  const base = bridgeBase()
  if (!base) return false
  try {
    const res = await fetch(`${base}/preference`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, value }),
    })
    return res.ok
  } catch {
    return false
  }
}

/** localStorage + opcional sincronização via jade-http-bridge (Fase 2). */
export const compositePreferenceBackend: PreferenceBackend = {
  async getPreference(key, defaultValue) {
    const remote = await bridgeGet(key, defaultValue)
    if (remote !== null) {
      await webPreferenceBackend.setPreference(key, remote)
      return remote
    }
    return webPreferenceBackend.getPreference(key, defaultValue)
  },
  async setPreference(key, value) {
    await webPreferenceBackend.setPreference(key, value)
    await bridgeSet(key, value)
  },
}

export function registerCompositePreferenceBackend(): void {
  if (getPreferenceBackend() === webPreferenceBackend) {
    setPreferenceBackend(compositePreferenceBackend)
  }
}
