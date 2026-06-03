import { resolveAddonI18nText, type AddonLanguagePack } from '@/core/addonLanguage'
import type { AddonContextMenuDef, AddonManifest } from '@/services/addonLoader.service'

const CONTEXT_MENU_MARKER_RE = /\{cotexMenu:([^}]+)\}([\s\S]*?)\{\/cotexMenu\}/gi

export function readAddonContextMenusFromManifest(raw: unknown): AddonContextMenuDef[] | undefined {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return undefined
  }
  const record = raw as Record<string, unknown>
  const menus = record.cotexMenu ?? record.contextMenu
  if (!Array.isArray(menus)) {
    return undefined
  }
  return normalizeAddonContextMenus(menus)
}

export function normalizeAddonContextMenus(raw: unknown): AddonContextMenuDef[] {
  if (!Array.isArray(raw)) {
    return []
  }
  const menus: AddonContextMenuDef[] = []
  for (const entry of raw) {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
      continue
    }
    const item = entry as Record<string, unknown>
    const name = typeof item.name === 'string' ? item.name.trim() : ''
    if (!name) {
      continue
    }
    const optionsRaw = item.options
    if (!Array.isArray(optionsRaw)) {
      continue
    }
    const options: AddonContextMenuDef['options'] = []
    for (const opt of optionsRaw) {
      if (!opt || typeof opt !== 'object' || Array.isArray(opt)) {
        continue
      }
      const optRecord = opt as Record<string, unknown>
      const label = typeof optRecord.name === 'string' ? optRecord.name.trim() : ''
      const action = typeof optRecord.action === 'string' ? optRecord.action.trim() : ''
      if (!label || !action) {
        continue
      }
      options.push({ name: label, action })
    }
    if (options.length > 0) {
      menus.push({ name, options })
    }
  }
  return menus
}

export function parseAddonContextMenuRegionNames(uiHtml: string): Set<string> {
  const names = new Set<string>()
  const re = new RegExp(CONTEXT_MENU_MARKER_RE.source, 'gi')
  let match: RegExpExecArray | null
  while ((match = re.exec(uiHtml)) !== null) {
    const name = match[1]?.trim()
    if (name) {
      names.add(name)
    }
  }
  return names
}

/** Substitui `{cotexMenu:nome}…{/cotexMenu}` por região com atributo para clique direito. */
export function preprocessAddonContextMenuRegions(uiHtml: string, manifest: AddonManifest): string {
  const menus = manifest.cotexMenu
  if (!menus?.length) {
    return uiHtml.replace(CONTEXT_MENU_MARKER_RE, '$2')
  }
  const menuNames = new Set(menus.map((menu) => menu.name))
  return uiHtml.replace(CONTEXT_MENU_MARKER_RE, (_full, rawName: string, inner: string) => {
    const name = rawName.trim()
    if (!name || !menuNames.has(name)) {
      return inner
    }
    return (
      `<div class="addon-context-menu-region" data-addon-context-menu="${name}" ` +
      `data-addon-context-menu-bound="0">${inner}</div>`
    )
  })
}

export function findAddonContextMenuDef(
  manifest: AddonManifest,
  menuName: string,
): AddonContextMenuDef | undefined {
  return manifest.cotexMenu?.find((menu) => menu.name === menuName)
}

export type ResolvedAddonContextMenuItem = {
  action: string
  label: string
}

export function resolveAddonContextMenuItems(
  menu: AddonContextMenuDef,
  languagePack?: AddonLanguagePack,
): ResolvedAddonContextMenuItem[] {
  return menu.options.map((option) => ({
    action: option.action,
    label:
      languagePack && Object.keys(languagePack).length > 0
        ? resolveAddonI18nText(option.name, languagePack)
        : option.name,
  }))
}

export function validateAddonContextMenusField(raw: unknown): boolean {
  if (raw === undefined) {
    return true
  }
  if (!Array.isArray(raw)) {
    return false
  }
  for (const entry of raw) {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
      return false
    }
    const item = entry as Record<string, unknown>
    if (typeof item.name !== 'string' || !item.name.trim()) {
      return false
    }
    if (!Array.isArray(item.options)) {
      return false
    }
    for (const opt of item.options) {
      if (!opt || typeof opt !== 'object' || Array.isArray(opt)) {
        return false
      }
      const optRecord = opt as Record<string, unknown>
      if (typeof optRecord.name !== 'string' || typeof optRecord.action !== 'string') {
        return false
      }
    }
  }
  return true
}
