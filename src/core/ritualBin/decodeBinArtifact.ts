import { resolveLocalInvokeBase } from './localInvokeGateway'
import type { RitualBinBranch } from './ritualBinTypes'

/**
 * Descodifica um ficheiro `.bin` para texto ritual via motor nativo Rust (POST /convert).
 */
export async function decodeBinArtifact(file: File): Promise<RitualBinBranch> {
  const base = resolveLocalInvokeBase()

  if (!base) {
    return { branch: 'not_configured' }
  }

  const endpoint = `${base.replace(/\/+$/, '')}/convert`
  const payload = await file.arrayBuffer()

  try {
    const response = await fetch(endpoint, {
      body: payload,
      headers: {
        'Content-Type': 'application/octet-stream',
        'X-Original-Filename': encodeURIComponent(file.name),
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

    const body = rawJson as { ok?: boolean; text?: string } | null

    if (body?.ok !== true || typeof body.text !== 'string') {
      return {
        branch: 'codec_error',
        message: 'Resposta local sem { ok: true, text: string }',
        status: response.status,
      }
    }

    return {
      branch: 'success',
      byteLengthSent: payload.byteLength,
      status: response.status,
      text: body.text,
    }
  } catch (caught) {
    const message = caught instanceof Error ? caught.message : 'Falha de rede na ponte local'
    return { branch: 'network_error', message }
  }
}
