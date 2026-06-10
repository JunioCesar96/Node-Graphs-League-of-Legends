import { resolveAddonI18nText, type AddonLanguagePack } from '@/core/addonLanguage'
import { addonSlotId } from '@/core/addonSlotConnections'
import type { AddonManifest, AddonSlot } from '@/services/addonLoader.service'

const INLINE_SLOT_MARKER_RE = /\{slot:([^}]+)\}([\s\S]*?)\{\/slot\}/g

export function normalizeAddonSlotVisibility(value: boolean | string | undefined): boolean {
  if (value === undefined) {
    return true
  }
  if (value === false || value === 'false') {
    return false
  }
  return true
}

export function isAddonSlotPinVisible(slot: AddonSlot): boolean {
  return normalizeAddonSlotVisibility(slot.slot)
}

function isDefaultSlotColor(value: string | undefined): boolean {
  const trimmed = value?.trim().toLowerCase()
  return !trimmed || trimmed === 'default'
}

export function resolveAddonSlotTip(
  slot: AddonSlot,
  locale: string,
  languagePack?: AddonLanguagePack,
): string | undefined {
  if (!slot.slotTip?.length) {
    return undefined
  }
  const lang = locale.trim().toLowerCase().slice(0, 2)
  let resolved: string | undefined
  for (const entry of slot.slotTip) {
    const direct = entry[lang]?.trim()
    if (direct) {
      resolved = direct
      break
    }
  }
  if (!resolved) {
    for (const entry of slot.slotTip) {
      const fallback = entry.en?.trim() || entry.pt?.trim()
      if (fallback) {
        resolved = fallback
        break
      }
    }
  }
  if (!resolved) {
    return undefined
  }
  return languagePack && Object.keys(languagePack).length > 0
    ? resolveAddonI18nText(resolved, languagePack)
    : resolved
}

export function resolveAddonSlotPinBorderColor(slot: AddonSlot, connected: boolean): string | undefined {
  if (connected) {
    const connectedColor = slot.slotConnectedColor?.trim()
    if (connectedColor && !isDefaultSlotColor(connectedColor)) {
      return connectedColor
    }
  }
  const baseColor = slot.slotColor?.trim()
  if (baseColor && !isDefaultSlotColor(baseColor)) {
    return baseColor
  }
  return undefined
}

export function parseInlineAddonSlotNames(uiHtml: string): Set<string> {
  const names = new Set<string>()
  const re = new RegExp(INLINE_SLOT_MARKER_RE.source, 'g')
  let match: RegExpExecArray | null
  while ((match = re.exec(uiHtml)) !== null) {
    const name = match[1]?.trim()
    if (name) {
      names.add(name)
    }
  }
  return names
}

/** Extrai blocos `<style>` do ui.html do add-on para inject seguro no card. */
export function splitAddonUiHtmlStyles(uiHtml: string): { html: string; css: string } {
  const chunks: string[] = []
  const html = uiHtml.replace(/<style\b[^>]*>([\s\S]*?)<\/style>/gi, (_full, css: string) => {
    const trimmed = css.trim()
    if (trimmed) {
      chunks.push(trimmed)
    }
    return ''
  })
  return { html: html.trim(), css: chunks.join('\n\n') }
}

export function findAddonUiRoot(container: HTMLElement): HTMLElement | null {
  const marked = container.querySelector('[class*="addon-"][class*="-ui"]')
  if (marked instanceof HTMLElement) {
    return marked
  }
  const first = container.firstElementChild
  return first instanceof HTMLElement ? first : null
}

export function applyAddonUiStyles(container: HTMLElement, css: string): void {
  const existing = container.querySelector('style[data-addon-ui-styles="1"]')
  if (!css.trim()) {
    existing?.remove()
    return
  }
  const styleEl = existing instanceof HTMLStyleElement ? existing : document.createElement('style')
  styleEl.setAttribute('data-addon-ui-styles', '1')
  styleEl.textContent = css
  if (!existing) {
    container.prepend(styleEl)
  }
}

export type AddonUiRootSize = {
  width?: string
  height?: string
}

/** Lê width/height definidos no bloco `<style>` para a classe raiz do ui (ex.: `.addon-string-prefix-ui`). */
export function parseAddonUiRootSize(css: string, preferredRootClass?: string): AddonUiRootSize {
  if (preferredRootClass?.trim()) {
    const escaped = preferredRootClass.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const direct = parseCssBlockSize(css, escaped)
    if (direct.width || direct.height) {
      return direct
    }
  }

  const generic = /\.(addon-[a-z0-9-]+-ui)\s*\{([^}]*)\}/gi
  let match: RegExpExecArray | null
  while ((match = generic.exec(css)) !== null) {
    const parsed = parseDeclarationBlock(match[2] ?? '')
    if (parsed.width || parsed.height) {
      return parsed
    }
  }

  return {}
}

function parseCssBlockSize(css: string, className: string): AddonUiRootSize {
  const blockRe = new RegExp(`\\.${className}\\s*\\{([^}]*)\\}`, 'i')
  const block = blockRe.exec(css)
  if (!block?.[1]) {
    return {}
  }
  return parseDeclarationBlock(block[1])
}

function parseDeclarationBlock(body: string): AddonUiRootSize {
  const width = /(?:^|;)\s*width\s*:\s*([^;]+)/i.exec(body)?.[1]?.trim()
  const height = /(?:^|;)\s*height\s*:\s*([^;]+)/i.exec(body)?.[1]?.trim()
  return {
    ...(width ? { width } : {}),
    ...(height ? { height } : {}),
  }
}

export function parseCssPxLength(value: string | undefined): number | undefined {
  if (!value) {
    return undefined
  }
  const match = /^(\d+(?:\.\d+)?)\s*px$/i.exec(value.trim())
  if (!match) {
    return undefined
  }
  return Math.round(Number(match[1]))
}

export function findAddonUiRootClass(html: string): string | undefined {
  const match = /class\s*=\s*["'](addon-[\w-]+-ui)["']/i.exec(html)
  return match?.[1]
}

export function resolveAddonCardWidthPx(
  cardWidth: number | undefined,
  fallback = 280,
): number {
  return cardWidth && cardWidth > 0 ? cardWidth : fallback
}

/** Largura/altura renderizada do card (article) após layout do ui.html. */
export function measureAddonCardSize(card: HTMLElement): { widthPx: number; heightPx: number } {
  const rect = card.getBoundingClientRect()
  return {
    widthPx: Math.max(1, Math.ceil(rect.width)),
    heightPx: Math.max(1, Math.ceil(rect.height)),
  }
}

export function preprocessAddonUiHtml(uiHtml: string, manifest: AddonManifest): string {
  return uiHtml.replace(INLINE_SLOT_MARKER_RE, (_full, rawName: string, inner: string) => {
    const name = rawName.trim()
    const slotDef = manifest.data.find((slot) => slot.name === name)
    if (!slotDef) {
      return inner
    }

    const hidden = !isAddonSlotPinVisible(slotDef) ? ' data-addon-slot-hidden="1"' : ''
    return (
      `<span class="addon-slot-line" data-addon-slot-line="${name}" ` +
      `data-addon-slot-direction="${slotDef.direction}"${hidden}>${inner}</span>`
    )
  })
}

function createPinHost(name: string): HTMLElement {
  const host = document.createElement('span')
  host.className = 'addon-grid-slot-pin-host'
  host.setAttribute('data-addon-slot-pin-host', name)
  return host
}

function createHiddenInputAnchor(name: string): HTMLElement {
  const anchor = document.createElement('span')
  anchor.className = 'addon-grid-slot-hidden-anchor'
  anchor.setAttribute('data-addon-input-slot', name)
  return anchor
}

function unwrapSlotLine(slotLine: HTMLElement): void {
  const parent = slotLine.parentElement
  if (!parent) {
    slotLine.remove()
    return
  }
  while (slotLine.firstChild) {
    parent.insertBefore(slotLine.firstChild, slotLine)
  }
  slotLine.remove()
}

function appendSlotPinToGridColumns(
  name: string,
  slotDef: AddonSlot,
  colIn: HTMLElement,
  colOut: HTMLElement,
): void {
  if (slotDef.direction === 'input') {
    if (isAddonSlotPinVisible(slotDef)) {
      colIn.appendChild(createPinHost(name))
    } else {
      colIn.appendChild(createHiddenInputAnchor(name))
    }
    return
  }

  if (slotDef.direction === 'output' && isAddonSlotPinVisible(slotDef)) {
    colOut.appendChild(createPinHost(name))
  }
}

function buildGridRowFromBlock(block: HTMLElement, manifest: AddonManifest): HTMLElement | null {
  const slotLines = [...block.querySelectorAll('[data-addon-slot-line]')].filter(
    (node): node is HTMLElement => node instanceof HTMLElement,
  )
  if (slotLines.length === 0) {
    return null
  }

  const row = document.createElement('div')
  row.className = 'addon-grid-row'
  row.setAttribute(
    'data-addon-grid-row',
    slotLines[0]?.getAttribute('data-addon-slot-line')?.trim() ?? 'row',
  )

  const colIn = document.createElement('div')
  colIn.className = 'addon-grid-col addon-grid-col--input'

  const colBody = document.createElement('div')
  colBody.className = 'addon-grid-col addon-grid-col--body'

  const colOut = document.createElement('div')
  colOut.className = 'addon-grid-col addon-grid-col--output'

  for (const slotLine of slotLines) {
    const name = slotLine.getAttribute('data-addon-slot-line')?.trim()
    if (!name) {
      continue
    }
    const slotDef = manifest.data.find((slot) => slot.name === name)
    if (!slotDef) {
      continue
    }
    unwrapSlotLine(slotLine)
    appendSlotPinToGridColumns(name, slotDef, colIn, colOut)
  }

  colBody.appendChild(block)
  row.append(colIn, colBody, colOut)
  return row
}

/** Grelha 3 colunas: entrada | corpo | saída, alinhada às linhas {slot:...}. */
export function applyAddonBodyGridLayout(root: HTMLElement, manifest: AddonManifest): void {
  const uiRoot = findAddonUiRoot(root)
  if (!uiRoot) {
    return
  }

  const grid = document.createElement('div')
  grid.className = 'addon-body-grid'

  for (const child of [...uiRoot.childNodes]) {
    if (!(child instanceof HTMLElement)) {
      continue
    }

    const gridRow = buildGridRowFromBlock(child, manifest)
    if (gridRow) {
      grid.appendChild(gridRow)
      continue
    }

    const fullRow = document.createElement('div')
    fullRow.className = 'addon-grid-row addon-grid-row--full'
    const fullCol = document.createElement('div')
    fullCol.className = 'addon-grid-col addon-grid-col--full'
    fullCol.appendChild(child)
    fullRow.appendChild(fullCol)
    grid.appendChild(fullRow)
  }

  uiRoot.replaceChildren(grid)
}

export function bindAddonHiddenInputSlotAnchors(
  root: HTMLElement,
  instanceId: string,
  manifest: AddonManifest,
  locale = 'pt',
  languagePack?: AddonLanguagePack,
): void {
  root.querySelectorAll('[data-addon-input-slot]').forEach((element) => {
    if (!(element instanceof HTMLElement)) {
      return
    }
    const name = element.getAttribute('data-addon-input-slot')?.trim()
    if (!name) {
      return
    }
    const slotDef = manifest.data.find((slot) => slot.name === name && slot.direction === 'input')
    if (!slotDef) {
      return
    }
    element.setAttribute('data-addon-slot-id', addonSlotId(name, 'input'))
    element.setAttribute('data-addon-slot-node-id', instanceId)
    element.setAttribute('data-addon-slot-direction', 'input')
    element.setAttribute('data-addon-slot-hidden', '1')
    const tip = resolveAddonSlotTip(slotDef, locale, languagePack)
    if (tip) {
      element.title = tip
    }
  })
}

export function listAddonDockSlots(manifest: AddonManifest, uiHtml: string): AddonSlot[] {
  const inlineNames = parseInlineAddonSlotNames(uiHtml)
  return manifest.data.filter((slot) => isAddonSlotPinVisible(slot) && !inlineNames.has(slot.name))
}

export type AddonInlinePinHost = {
  name: string
  element: HTMLElement
}

export function collectAddonInlinePinHosts(
  root: HTMLElement,
  manifest: AddonManifest,
): AddonInlinePinHost[] {
  const hosts: AddonInlinePinHost[] = []
  root.querySelectorAll('[data-addon-slot-pin-host]').forEach((node) => {
    if (!(node instanceof HTMLElement)) {
      return
    }
    const name = node.getAttribute('data-addon-slot-pin-host')?.trim()
    if (!name) {
      return
    }
    const slotDef = manifest.data.find((slot) => slot.name === name)
    if (!slotDef || !isAddonSlotPinVisible(slotDef)) {
      return
    }
    hosts.push({ name, element: node })
  })
  return hosts
}
