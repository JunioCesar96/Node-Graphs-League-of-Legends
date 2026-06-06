function stripTrailingSlash(url: string): string {
  return url.replace(/\/+$/, '')
}

/**
 * URL da ponte local (modo Nativo): `VITE_RITOBIN_INVOKE_BRIDGE` ou proxy `/api/ritobin` → motor Rust 8791.
 */
export function resolveLocalInvokeBase(): string | null {
  const explicit = import.meta.env.VITE_RITOBIN_INVOKE_BRIDGE?.trim()

  if (explicit) {
    return stripTrailingSlash(explicit)
  }

  const proxyRaw = import.meta.env.VITE_RITOBIN_USE_PROXY?.trim().toLowerCase()
  const proxyOn = proxyRaw === 'true' || proxyRaw === '1' || proxyRaw === 'yes'

  if (import.meta.env.DEV && proxyOn) {
    return '/api/ritobin'
  }

  return null
}

/** Modo dev escolhido em `scripts/dev.mjs` (Nativo vs Bridge externo). */
export function isNativeRitualBinDevMode(): boolean {
  const backend = import.meta.env.VITE_DEV_BIN_BACKEND?.trim().toLowerCase()

  if (backend === 'native') {
    return true
  }

  if (backend === 'jade') {
    return false
  }

  const ritobinOn = import.meta.env.VITE_RITOBIN_USE_PROXY?.trim().toLowerCase()
  const jadeOn = import.meta.env.VITE_JADE_USE_PROXY?.trim().toLowerCase()

  return (ritobinOn === 'true' || ritobinOn === '1') && jadeOn !== 'true' && jadeOn !== '1'
}
