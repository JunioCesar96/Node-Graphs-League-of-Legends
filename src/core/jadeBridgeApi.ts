import { computeJadeBridgeBase } from '@/core/jadeBinBridge'

export type JadeBridgeCapabilities = {
  ok: boolean
  provider?: string
  features?: {
    preferences?: boolean
    convertToBin?: boolean
    unhashText?: boolean
    detectImageEditors?: boolean
    hashCheck?: boolean
    hashDownload?: boolean
    hashPreload?: boolean
    hashConvertToBinary?: boolean
    library?: boolean
    updates?: boolean
    behavior?: boolean
    materialOverride?: boolean
  }
}

export type ConvertTextToBinResult =
  | { branch: 'not_configured' }
  | { branch: 'network_error'; message: string }
  | { branch: 'bridge_error'; message: string }
  | { branch: 'success'; bytesBase64: string; byteLength: number }

function resolveBridgeBase(): string | null {
  return computeJadeBridgeBase({
    dev: import.meta.env.DEV,
    explicitBridgeUrl: import.meta.env.VITE_JADE_BIN_BRIDGE,
    useProxyRaw: import.meta.env.VITE_JADE_USE_PROXY,
  })
}

export function getJadeBridgeBaseForHost(): string | null {
  return resolveBridgeBase()
}

export async function fetchJadeBridgeCapabilities(): Promise<JadeBridgeCapabilities | null> {
  const base = resolveBridgeBase()
  if (!base) return null
  try {
    const res = await fetch(`${base}/capabilities`)
    if (!res.ok) return null
    const body = (await res.json()) as JadeBridgeCapabilities
    return body.ok ? body : null
  } catch {
    return null
  }
}

export async function convertTextToBinViaBridge(text: string): Promise<ConvertTextToBinResult> {
  const base = resolveBridgeBase()
  if (!base) return { branch: 'not_configured' }

  try {
    const res = await fetch(`${base}/convert-to-bin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    })
    const body = (await res.json().catch(() => null)) as {
      ok?: boolean
      bytesBase64?: string
      byteLength?: number
      message?: string
    } | null

    if (!res.ok || !body?.ok || typeof body.bytesBase64 !== 'string') {
      return {
        branch: 'bridge_error',
        message: typeof body?.message === 'string' ? body.message : `HTTP ${res.status}`,
      }
    }

    return {
      branch: 'success',
      bytesBase64: body.bytesBase64,
      byteLength: body.byteLength ?? 0,
    }
  } catch (caught) {
    const message = caught instanceof Error ? caught.message : 'Falha de rede'
    return { branch: 'network_error', message }
  }
}

export function base64ToUint8Array(encoded: string): Uint8Array {
  const binary = atob(encoded)
  const out = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) {
    out[i] = binary.charCodeAt(i)
  }
  return out
}

export function downloadBytesAsFile(bytes: Uint8Array, fileName: string): void {
  const blob = new Blob([bytes], { type: 'application/octet-stream' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = fileName
  anchor.click()
  URL.revokeObjectURL(url)
}
