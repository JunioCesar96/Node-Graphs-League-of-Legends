import { resolveLocalInvokeBase } from './localInvokeGateway'
import type { LocalInvokeCapabilities } from './ritualBinTypes'

export async function fetchLocalInvokeCapabilities(): Promise<LocalInvokeCapabilities | null> {
  const base = resolveLocalInvokeBase()

  if (!base) {
    return null
  }

  try {
    const response = await fetch(`${base.replace(/\/+$/, '')}/capabilities`)
    if (!response.ok) {
      return null
    }

    return (await response.json()) as LocalInvokeCapabilities
  } catch {
    return null
  }
}
