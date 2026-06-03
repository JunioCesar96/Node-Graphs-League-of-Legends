import { parseAddonDriveField, type AddonDrive, type AddonManifestDrive } from '@/core/addonDrive'
import { readAddonContextMenusFromManifest, validateAddonContextMenusField } from '@/core/addonContextMenu'

export type { AddonDrive, AddonManifestDrive } from '@/core/addonDrive'

export type AddonSlotType = 'string' | 'number' | 'boolean' | 'object'

export type AddonSlotTipEntry = Record<string, string | undefined>

export type AddonSlotTip = AddonSlotTipEntry[] | AddonSlotTipEntry

export type AddonContextMenuOption = {
  /** Rótulo ou chave i18n, ex.: `"[{10}]"`. */
  name: string
  action: string
}

export type AddonContextMenuDef = {
  name: string
  options: AddonContextMenuOption[]
}

export type AddonManifestInfo = {
  link?: string
  author?: string
  version?: string
  /** Texto ou chave i18n `{n}` / `[{n}]`. */
  description?: string
  license?: string
  tags?: string[]
  docs?: string
}

export type AddonSlot = {
  name: string
  type: AddonSlotType
  direction: 'input' | 'output'
  /** Quando false, o slot existe na lógica mas não mostra pino de ligação. */
  slot?: boolean | string
  /** Cor do pino; "default" usa o tema. */
  slotColor?: string
  /** Cor do pino quando ligado; omitido usa slotColor. */
  slotConnectedColor?: string
  /** Dicas: array `[{ "pt": "…" }]` ou mapa `{ "pt": "{7}" }` com chaves i18n. */
  slotTip?: AddonSlotTip
}

export type AddonManifest = {
  id: string
  /** Nome ou chave i18n, ex.: `"[{0}]"` ou `"{0}"`. */
  name: string
  category: string
  drive: AddonManifestDrive
  data: AddonSlot[]
  get: boolean
  set: boolean
  headerColor?: string
  backgroundColor?: string
  backgroundImage?: string
  borderColor?: string
  borderRadius?: string
  borderWidth?: string
  borderStyle?: string
  headerFontSize?: string
  headerFontWeight?: string
  headerFontColor?: string
  headerBackgroundColor?: string
  headerBackgroundImage?: string
  icon?: string
  /** Metadados para o painel Ctrl+K (autor, versão, tags, links). */
  info?: AddonManifestInfo
  /** Menus de contexto (clique direito) declarados no manifest. */
  cotexMenu?: AddonContextMenuDef[]
}

export type AddonExecuteFn = (
  inputs: Record<string, unknown>,
  cardDOM: HTMLElement,
) => Record<string, unknown> | Promise<Record<string, unknown>>

export type AddonContextMenuHandler = (
  action: string,
  cardDOM: HTMLElement,
  context: { menuName: string },
) => void | Promise<void>

export type AddonPackage = {
  manifest: AddonManifest
  uiHtml: string
  uiCss: string
  execute: AddonExecuteFn
  onContextMenuAction?: AddonContextMenuHandler
  /** Pack carregado de `addons/{id}/language/{locale}.json`. */
  languagePack: AddonLanguagePack
  /** Largura do card em px (extraída do ui.html ou manifest). */
  cardWidthPx?: number
  cardHeightPx?: number
}

import { fetchAddonLanguagePack, type AddonLanguagePack } from '@/core/addonLanguage'
import {
  findAddonUiRootClass,
  parseAddonUiRootSize,
  parseCssPxLength,
  splitAddonUiHtmlStyles,
} from '@/core/addonUiTemplate'

function buildAddonPackageFromSandbox(
  manifest: AddonManifest,
  rawUiHtml: string,
  execute: AddonExecuteFn,
  languagePack: AddonLanguagePack,
  onContextMenuAction?: AddonContextMenuHandler,
): AddonPackage {
  const { html: uiHtml, css: uiCss } = splitAddonUiHtmlStyles(rawUiHtml)
  const rootClass = findAddonUiRootClass(uiHtml)
  const rootSize = parseAddonUiRootSize(uiCss, rootClass)
  return {
    manifest,
    uiHtml,
    uiCss,
    execute,
    onContextMenuAction,
    languagePack,
    cardWidthPx: parseCssPxLength(rootSize.width),
    cardHeightPx: parseCssPxLength(rootSize.height),
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

const SLOT_TYPES: ReadonlySet<string> = new Set(['string', 'number', 'boolean', 'object'])

function normalizeAddonSlotTip(tip: AddonSlotTip | undefined): AddonSlotTipEntry[] | undefined {
  if (tip === undefined) {
    return undefined
  }
  if (Array.isArray(tip)) {
    return tip
  }
  return [tip]
}

function normalizeAddonSlot(slot: AddonSlot): AddonSlot {
  const visible =
    slot.slot === undefined ? true : slot.slot !== false && slot.slot !== 'false'
  const slotTip = normalizeAddonSlotTip(slot.slotTip)
  return { ...slot, slot: visible, slotTip }
}

const OPTIONAL_MANIFEST_STRING_FIELDS = [
  'headerColor',
  'backgroundColor',
  'backgroundImage',
  'borderColor',
  'borderRadius',
  'borderWidth',
  'borderStyle',
  'headerFontSize',
  'headerFontWeight',
  'headerFontColor',
  'headerBackgroundColor',
  'headerBackgroundImage',
  'icon',
] as const

function isValidSlotTip(raw: unknown): boolean {
  if (Array.isArray(raw)) {
    return raw.every((entry) => isRecord(entry))
  }
  return isRecord(raw)
}

function isValidAddonInfo(raw: unknown): boolean {
  if (raw === undefined) {
    return true
  }
  if (!isRecord(raw)) {
    return false
  }
  for (const field of ['link', 'author', 'version', 'description', 'license', 'docs'] as const) {
    if (raw[field] !== undefined && typeof raw[field] !== 'string') {
      return false
    }
  }
  if (raw.tags !== undefined) {
    if (!Array.isArray(raw.tags)) {
      return false
    }
    if (!raw.tags.every((tag) => typeof tag === 'string')) {
      return false
    }
  }
  return true
}

export function normalizeAddonManifest(manifest: AddonManifest): AddonManifest {
  const parsed = parseAddonDriveField(manifest.drive)
  const drive: AddonManifestDrive =
    parsed === null
      ? manifest.drive
      : parsed.length === 1
        ? parsed[0]!
        : parsed
  const cotexMenu = readAddonContextMenusFromManifest(manifest)
  return {
    ...manifest,
    drive,
    data: manifest.data.map(normalizeAddonSlot),
    ...(cotexMenu?.length ? { cotexMenu } : {}),
  }
}

export function validateAddonManifest(raw: unknown, source = 'manifest'): raw is AddonManifest {
  if (!isRecord(raw)) {
    return false
  }
  if (typeof raw.id !== 'string' || !raw.id.trim()) {
    return false
  }
  if (typeof raw.name !== 'string' || !raw.name.trim()) {
    return false
  }
  if (typeof raw.category !== 'string') {
    return false
  }
  if (parseAddonDriveField(raw.drive) === null) {
    return false
  }
  if (typeof raw.get !== 'boolean' || typeof raw.set !== 'boolean') {
    return false
  }
  for (const field of OPTIONAL_MANIFEST_STRING_FIELDS) {
    if (raw[field] !== undefined && typeof raw[field] !== 'string') {
      return false
    }
  }
  if (!Array.isArray(raw.data)) {
    return false
  }
  for (const slot of raw.data) {
    if (!isRecord(slot)) {
      return false
    }
    if (typeof slot.name !== 'string' || !slot.name.trim()) {
      return false
    }
    if (typeof slot.type !== 'string' || !SLOT_TYPES.has(slot.type)) {
      return false
    }
    if (slot.direction !== 'input' && slot.direction !== 'output') {
      return false
    }
    if (slot.slot !== undefined && typeof slot.slot !== 'boolean' && typeof slot.slot !== 'string') {
      return false
    }
    if (slot.slotColor !== undefined && typeof slot.slotColor !== 'string') {
      return false
    }
    if (slot.slotConnectedColor !== undefined && typeof slot.slotConnectedColor !== 'string') {
      return false
    }
    if (slot.slotTip !== undefined && !isValidSlotTip(slot.slotTip)) {
      return false
    }
  }
  const menus = (raw as Record<string, unknown>).cotexMenu ?? (raw as Record<string, unknown>).contextMenu
  if (!validateAddonContextMenusField(menus)) {
    return false
  }
  if (!isValidAddonInfo(raw.info)) {
    return false
  }
  return true
}

export const AddonLoaderService = {
  async loadFromSandbox(addonId: string, locale = 'pt'): Promise<AddonPackage> {
    const basePath = `/addons/${encodeURIComponent(addonId)}`

    const [manifestRes, uiRes, languagePack] = await Promise.all([
      fetch(`${basePath}/manifest.json`),
      fetch(`${basePath}/ui.html`),
      fetchAddonLanguagePack(addonId, locale),
    ])

    if (!manifestRes.ok) {
      throw new Error(`Falha ao carregar manifest do add-on "${addonId}" (${manifestRes.status}).`)
    }
    if (!uiRes.ok) {
      throw new Error(`Falha ao carregar ui.html do add-on "${addonId}" (${uiRes.status}).`)
    }

    const manifestRaw: unknown = await manifestRes.json()
    if (!validateAddonManifest(manifestRaw)) {
      throw new Error(`Manifest inválido para add-on "${addonId}".`)
    }

    const rawUiHtml = await uiRes.text()

    const module = (await import(/* @vite-ignore */ `${basePath}/logic.js`)) as {
      logic?: {
        execute?: AddonExecuteFn
        onContextMenuAction?: AddonContextMenuHandler
      }
    }

    if (!module.logic || typeof module.logic.execute !== 'function') {
      throw new Error(
        `Falha crítica: Add-on ${addonId} não exporta um método "logic.execute" válido.`,
      )
    }

    const onContextMenuAction =
      typeof module.logic.onContextMenuAction === 'function'
        ? module.logic.onContextMenuAction.bind(module.logic)
        : undefined

    return buildAddonPackageFromSandbox(
      normalizeAddonManifest(manifestRaw),
      rawUiHtml,
      module.logic.execute,
      languagePack,
      onContextMenuAction,
    )
  },

  async loadManifestOnly(addonId: string): Promise<AddonManifest> {
    const basePath = `/addons/${encodeURIComponent(addonId)}`
    const res = await fetch(`${basePath}/manifest.json`)
    if (!res.ok) {
      throw new Error(`Falha ao carregar manifest do add-on "${addonId}" (${res.status}).`)
    }
    const raw: unknown = await res.json()
    if (!validateAddonManifest(raw)) {
      throw new Error(`Manifest inválido para add-on "${addonId}".`)
    }
    return normalizeAddonManifest(raw)
  },
}
