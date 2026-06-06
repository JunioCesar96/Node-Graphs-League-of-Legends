import { resolveLocalInvokeBase } from './localInvokeGateway'
import type { RitualBinEncodeBranch } from './ritualBinTypes'

/** Texto ritual → bytes `.bin` via motor nativo Rust (POST /convert-to-bin). */
export async function encodeBinArtifact(text: string): Promise<RitualBinEncodeBranch> {
  const base = resolveLocalInvokeBase()

  if (!base) {
    return { branch: 'not_configured' }
  }

  const endpoint = `${base.replace(/\/+$/, '')}/convert-to-bin`

  try {
    const response = await fetch(endpoint, {
      body: JSON.stringify({ text }),
      headers: {
        'Content-Type': 'application/json',
      },
      method: 'POST',
      mode: base.startsWith('http') ? 'cors' : 'same-origin',
    })

    const rawJson: unknown = await response.json().catch(() => null)

    if (!response.ok) {
      let message = `HTTP ${String(response.status)}`

      if (rawJson !== null && typeof rawJson === 'object' && 'message' in rawJson) {
        const candidate = Reflect.get(rawJson as object, 'message')
        if (typeof candidate === 'string') {
          message = candidate
        }
      }

      return { branch: 'codec_error', message, status: response.status }
    }

    const body = rawJson as { ok?: boolean; bytesBase64?: string; byteLength?: number } | null

    if (body?.ok !== true || typeof body.bytesBase64 !== 'string') {
      return {
        branch: 'codec_error',
        message: 'Resposta local sem { ok: true, bytesBase64: string }',
        status: response.status,
      }
    }

    return {
      branch: 'success',
      byteLength: body.byteLength ?? 0,
      bytesBase64: body.bytesBase64,
      status: response.status,
    }
  } catch (caught) {
    const message = caught instanceof Error ? caught.message : 'Falha de rede na ponte local'
    return { branch: 'network_error', message }
  }
}

export function ritualBinBase64ToBytes(encoded: string): Uint8Array {
  const binary = atob(encoded)
  const out = new Uint8Array(binary.length)

  for (let i = 0; i < binary.length; i += 1) {
    out[i] = binary.charCodeAt(i)
  }

  return out
}
