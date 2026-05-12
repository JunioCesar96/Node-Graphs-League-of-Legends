import type { JadeBinConversionResult } from '@/core/jadeBinBridge'

function stripTrailingSlash(url: string) {
  return url.replace(/\/+$/, '')
}

/**
 * Prioridade:
 * 1. `VITE_RITOBIN_INVOKE_BRIDGE` — URL absoluta (ex.: `http://127.0.0.1:8791`)
 * 2. Dev + `VITE_RITOBIN_USE_PROXY` → `/api/ritobin` (proxy no `vite.config.ts`)
 */
export function computeRitobinInvokeBase(options: {
  dev: boolean
  explicitUrl: string | undefined
  useProxyRaw: string | undefined
}): string | null {
  const explicit = options.explicitUrl?.trim()

  if (explicit) {
    return stripTrailingSlash(explicit)
  }

  const proxyRaw = options.useProxyRaw?.trim().toLowerCase()
  const useProxyEnabled = proxyRaw === 'true' || proxyRaw === '1' || proxyRaw === 'yes'

  if (options.dev && useProxyEnabled) {
    return '/api/ritobin'
  }

  return null
}

function resolveRitobinBridgeBase(): string | null {
  return computeRitobinInvokeBase({
    dev: import.meta.env.DEV,
    explicitUrl: import.meta.env.VITE_RITOBIN_INVOKE_BRIDGE,
    useProxyRaw: import.meta.env.VITE_RITOBIN_USE_PROXY,
  })
}

/**
 * Igual ao contrato Jade `POST /convert`, mas envia **`X-Ritobin-Exe`** para o servidor `scripts/ritobin/invoke-server.mjs`.
 */
export async function convertBinViaRitobinExeBridge(
  file: File,
  ritobinExePath: string,
): Promise<JadeBinConversionResult> {
  const trimmed = ritobinExePath.trim()

  if (trimmed.length === 0) {
    return { branch: 'not_configured' }
  }

  const baseResolved = resolveRitobinBridgeBase()

  if (!baseResolved) {
    return { branch: 'not_configured' }
  }

  const endpoint = `${stripTrailingSlash(baseResolved)}/convert`
  const payload = await file.arrayBuffer()

  try {
    const response = await fetch(endpoint, {
      body: payload,
      headers: {
        'Content-Type': 'application/octet-stream',
        'X-Original-Filename': encodeURIComponent(file.name),
        'X-Ritobin-Exe': trimmed,
      },
      method: 'POST',
      mode: baseResolved.startsWith('http') ? 'cors' : 'same-origin',
    })

    const rawJson: unknown = await response.json().catch(() => null)

    if (!response.ok) {
      let resolvedMessage = `HTTP ${String(response.status)}`

      if (rawJson !== null && typeof rawJson === 'object' && 'message' in rawJson) {
        const candidateMessage = Reflect.get(rawJson as object, 'message')

        if (typeof candidateMessage === 'string') {
          resolvedMessage = candidateMessage
        }
      }

      return { branch: 'bridge_error', message: resolvedMessage, status: response.status }
    }

    const body = rawJson as { ok?: boolean; text?: string } | null

    if (
      body === null ||
      typeof body !== 'object' ||
      body.ok !== true ||
      typeof body.text !== 'string'
    ) {
      return {
        branch: 'bridge_error',
        message: 'Resposta ritobin sem { ok: true, text: string }',
        status: response.status,
      }
    }

    return {
      branch: 'success',
      byteLengthSent: payload.byteLength,
      status: response.status,
      text: body.text,
    }
  } catch (caughtError) {
    const message =
      caughtError instanceof Error ? caughtError.message : 'Falha de rede ao contactar ponte ritobin'

    return { branch: 'network_error', message }
  }
}
