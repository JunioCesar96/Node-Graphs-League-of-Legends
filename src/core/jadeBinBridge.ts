/** Resposta esperada do servidor bridge (mock ou futuro sidecar Jade). */
export type JadeBridgeConvertResponseBody = {
  ok: boolean
  text?: string
  /** Erro humano-legível opcional quando ok === false. */
  message?: string
}

/** Resposta de `POST /convert-tree`: JSON textual do tipo `ltk_meta::BinTree` (pretty ou compacto). */
export type JadeBridgeConvertTreeResponseBody = {
  ok: boolean
  jsonText?: string
  message?: string
}

export type JadeBinConversionResult =
  | { branch: 'not_configured' }
  | { branch: 'network_error'; message: string }
  | { branch: 'bridge_error'; message: string; status: number }
  | { branch: 'success'; status: number; text: string; byteLengthSent: number }

export type JadeBinTreeJsonResult =
  | { branch: 'not_configured' }
  | { branch: 'network_error'; message: string }
  | { branch: 'bridge_error'; message: string; status: number }
  | { branch: 'success'; status: number; jsonText: string; byteLengthSent: number }

function stripTrailingSlash(url: string) {
  return url.replace(/\/+$/, '')
}

/**
 * Prioridade:
 * 1. `explicitBridgeUrl` (VITE_JADE_BIN_BRIDGE): URL absoluta do bridge.
 * 2. Modo desenvolvimento + `useProxyRaw` verdadeiro (VITE_JADE_USE_PROXY): base relativa `/api/jade`
 *    (proxied pelo `vite.config.ts` para JADE_BRIDGE_TARGET).
 */
export function computeJadeBridgeBase(options: {
  dev: boolean
  explicitBridgeUrl: string | undefined
  useProxyRaw: string | undefined
}): string | null {
  const explicit = options.explicitBridgeUrl?.trim()

  if (explicit) {
    return stripTrailingSlash(explicit)
  }

  const useProxyRaw = options.useProxyRaw?.trim().toLowerCase()
  const useProxyEnabled =
    useProxyRaw === 'true' || useProxyRaw === '1' || useProxyRaw === 'yes'

  if (options.dev && useProxyEnabled) {
    return '/api/jade'
  }

  return null
}

function resolveJadeBridgeBaseFromRuntimeEnv(): string | null {
  return computeJadeBridgeBase({
    dev: import.meta.env.DEV,
    explicitBridgeUrl: import.meta.env.VITE_JADE_BIN_BRIDGE,
    useProxyRaw: import.meta.env.VITE_JADE_USE_PROXY,
  })
}

/**
 * Opcionalmente envia o binário brutos para um serviço local (ex.: `pnpm jade-bridge:dev`).
 * Contrato HTTP: POST `{base}/convert` · Content-Type: application/octet-stream · body = bytes do ficheiro.
 * Resposta JSON: `{ ok: true, text: string }` ou `{ ok: false, message: string }`.
 */
export async function convertBinViaOptionalBridge(file: File): Promise<JadeBinConversionResult> {
  const baseResolved = resolveJadeBridgeBaseFromRuntimeEnv()

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

    const body = rawJson as JadeBridgeConvertResponseBody | null

    if (
      body === null ||
      typeof body !== 'object' ||
      !('ok' in body) ||
      body.ok !== true ||
      typeof body.text !== 'string'
    ) {
      return {
        branch: 'bridge_error',
        message: 'Resposta do bridge sem { ok: true, text: string }',
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
      caughtError instanceof Error ? caughtError.message : 'Falha de rede ao contactar Jade bridge'

    return { branch: 'network_error', message }
  }
}

/**
 * Opcionalmente obtém BinTree como JSON textual (mock local ou futuro sidecar Jade).
 * Contrato HTTP: POST `{base}/convert-tree` · `application/octet-stream` · corpo = bytes do `.bin`.
 * Resposta JSON: `{ ok: true, jsonText: string }`.
 */
export async function fetchBinTreeJsonViaOptionalBridge(file: File): Promise<JadeBinTreeJsonResult> {
  const baseResolved = resolveJadeBridgeBaseFromRuntimeEnv()

  if (!baseResolved) {
    return { branch: 'not_configured' }
  }

  const endpoint = `${stripTrailingSlash(baseResolved)}/convert-tree`
  const payload = await file.arrayBuffer()

  try {
    const response = await fetch(endpoint, {
      body: payload,
      headers: {
        'Content-Type': 'application/octet-stream',
        'X-Original-Filename': encodeURIComponent(file.name),
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

    const body = rawJson as JadeBridgeConvertTreeResponseBody | null

    if (
      body === null ||
      typeof body !== 'object' ||
      !('ok' in body) ||
      body.ok !== true ||
      typeof body.jsonText !== 'string'
    ) {
      return {
        branch: 'bridge_error',
        message: 'Resposta do bridge sem { ok: true, jsonText: string }',
        status: response.status,
      }
    }

    return {
      branch: 'success',
      byteLengthSent: payload.byteLength,
      jsonText: body.jsonText,
      status: response.status,
    }
  } catch (caughtError) {
    const message =
      caughtError instanceof Error ? caughtError.message : 'Falha de rede ao contactar Jade bridge'

    return { branch: 'network_error', message }
  }
}
