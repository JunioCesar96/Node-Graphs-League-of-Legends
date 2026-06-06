import type { JadeBinConversionResult } from '@/core/jadeBinBridge'

import { decodeBinArtifact } from './decodeBinArtifact'
import { resolveLocalInvokeBase } from './localInvokeGateway'

export function computeRitobinInvokeBase(options: {
  dev: boolean
  explicitUrl: string | undefined
  useProxyRaw: string | undefined
}): string | null {
  if (options.explicitUrl?.trim()) {
    return options.explicitUrl.trim().replace(/\/+$/, '')
  }

  const proxyRaw = options.useProxyRaw?.trim().toLowerCase()
  const proxyOn = proxyRaw === 'true' || proxyRaw === '1' || proxyRaw === 'yes'

  if (options.dev && proxyOn) {
    return '/api/ritobin'
  }

  return null
}

/** @deprecated Alias — `decodeBinArtifact`. */
export async function convertBinViaRitobinExeBridge(
  file: File,
  ritobinExePath: string,
): Promise<JadeBinConversionResult> {
  void ritobinExePath
  const result = await decodeBinArtifact(file)

  if (result.branch === 'success') {
    return {
      branch: 'success',
      byteLengthSent: result.byteLengthSent,
      status: result.status,
      text: result.text,
    }
  }

  if (result.branch === 'not_configured') {
    return { branch: 'not_configured' }
  }

  if (result.branch === 'network_error') {
    return { branch: 'network_error', message: result.message }
  }

  return { branch: 'bridge_error', message: result.message, status: result.status ?? 0 }
}

export { resolveLocalInvokeBase }
