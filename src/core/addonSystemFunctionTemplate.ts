import type { AddonManifest } from '@/services/addonLoader.service'

const SYSTEM_FUNCTION_MARKER_RE = /\{function:([^}]+)\}([\s\S]*?)\{\/function\}/gi

export function parseAddonSystemFunctionNames(uiHtml: string): Set<string> {
  const names = new Set<string>()
  const re = new RegExp(SYSTEM_FUNCTION_MARKER_RE.source, 'gi')
  let match: RegExpExecArray | null
  while ((match = re.exec(uiHtml)) !== null) {
    const name = match[1]?.trim()
    if (name) {
      names.add(name)
    }
  }
  return names
}

function manifestAllowsFunction(manifest: AddonManifest, functionName: string): boolean {
  const allowed = manifest.functions
  if (!allowed?.length) {
    return false
  }
  return allowed.includes(functionName)
}

/** Substitui `{function:nome}…{/function}` por região com atributo para clique. */
export function preprocessAddonSystemFunctionRegions(uiHtml: string, manifest: AddonManifest): string {
  return uiHtml.replace(SYSTEM_FUNCTION_MARKER_RE, (_full, rawName: string, inner: string) => {
    const name = rawName.trim()
    if (!name || !manifestAllowsFunction(manifest, name)) {
      return inner
    }
    return `<div class="addon-system-function" data-addon-system-function="${name}">${inner}</div>`
  })
}
