import type { AddonManifestInfo } from '@/services/addonLoader.service'
import { isAllowedAddonSlotType } from '@/core/addonRitualSlotTypes'
import {
  fetchInputAddonLanguagePack,
  type InputAddonLanguagePack,
} from '@/core/inputAddonLanguage'
import { splitAddonUiHtmlStyles } from '@/core/addonUiTemplate'

export type InputAddonBindingChange = string | boolean | null

export type InputAddonBinding = {
  block: string
  parameter: string
  type: string
  change?: InputAddonBindingChange
}

export type InputAddonManifest = {
  id: string
  type: 'input'
  name: string
  category: string
  input: InputAddonBinding
  info?: AddonManifestInfo
  icon?: string
}

export type InputAddonExecuteFn = (
  inputs: Record<string, unknown>,
  hostDOM: HTMLElement,
) => Record<string, unknown> | Promise<Record<string, unknown>>

export type InputAddonPackage = {
  manifest: InputAddonManifest
  uiHtml: string
  uiCss: string
  execute: InputAddonExecuteFn
  languagePack: InputAddonLanguagePack
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
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

function isValidInputBinding(raw: unknown): raw is InputAddonBinding {
  if (!isRecord(raw)) {
    return false
  }
  if (typeof raw.block !== 'string' || !raw.block.trim()) {
    return false
  }
  if (typeof raw.parameter !== 'string' || !raw.parameter.trim()) {
    return false
  }
  if (typeof raw.type !== 'string' || !raw.type.trim()) {
    return false
  }
  if (!isAllowedAddonSlotType(raw.type.trim())) {
    return false
  }
  if (raw.change !== undefined) {
    const change = raw.change
    if (
      change !== null &&
      change !== false &&
      typeof change !== 'string' &&
      typeof change !== 'boolean'
    ) {
      return false
    }
  }
  return true
}

export function normalizeInputAddonManifest(manifest: InputAddonManifest): InputAddonManifest {
  return {
    ...manifest,
    input: {
      ...manifest.input,
      block: manifest.input.block.trim(),
      parameter: manifest.input.parameter.trim(),
      type: manifest.input.type.trim(),
    },
  }
}

export function validateInputAddonManifest(raw: unknown): raw is InputAddonManifest {
  if (!isRecord(raw)) {
    return false
  }
  if (typeof raw.id !== 'string' || !raw.id.trim()) {
    return false
  }
  if (raw.type !== 'input') {
    return false
  }
  if (typeof raw.name !== 'string' || !raw.name.trim()) {
    return false
  }
  if (typeof raw.category !== 'string') {
    return false
  }
  if (!isValidInputBinding(raw.input)) {
    return false
  }
  if (!isValidAddonInfo(raw.info)) {
    return false
  }
  if (raw.icon !== undefined && typeof raw.icon !== 'string') {
    return false
  }
  return true
}

function buildInputAddonPackageFromSandbox(
  manifest: InputAddonManifest,
  rawUiHtml: string,
  execute: InputAddonExecuteFn,
  languagePack: InputAddonLanguagePack,
): InputAddonPackage {
  const { html: uiHtml, css: uiCss } = splitAddonUiHtmlStyles(rawUiHtml)
  return {
    manifest,
    uiHtml,
    uiCss,
    execute,
    languagePack,
  }
}

export const InputAddonLoaderService = {
  async loadFromSandbox(inputAddonId: string, locale = 'pt'): Promise<InputAddonPackage> {
    const basePath = `/inputAddons/${encodeURIComponent(inputAddonId)}`

    const [manifestRes, uiRes, languagePack] = await Promise.all([
      fetch(`${basePath}/manifest.json`),
      fetch(`${basePath}/ui.html`),
      fetchInputAddonLanguagePack(inputAddonId, locale),
    ])

    if (!manifestRes.ok) {
      throw new Error(
        `Falha ao carregar manifest do input add-on "${inputAddonId}" (${manifestRes.status}).`,
      )
    }
    if (!uiRes.ok) {
      throw new Error(
        `Falha ao carregar ui.html do input add-on "${inputAddonId}" (${uiRes.status}).`,
      )
    }

    const manifestRaw: unknown = await manifestRes.json()
    if (!validateInputAddonManifest(manifestRaw)) {
      throw new Error(`Manifest inválido para input add-on "${inputAddonId}".`)
    }

    const rawUiHtml = await uiRes.text()

    const module = (await import(/* @vite-ignore */ `${basePath}/logic.js`)) as {
      logic?: { execute?: InputAddonExecuteFn }
    }

    if (!module.logic || typeof module.logic.execute !== 'function') {
      throw new Error(
        `Falha crítica: Input add-on ${inputAddonId} não exporta um método "logic.execute" válido.`,
      )
    }

    return buildInputAddonPackageFromSandbox(
      normalizeInputAddonManifest(manifestRaw),
      rawUiHtml,
      module.logic.execute,
      languagePack,
    )
  },

  async loadManifestOnly(inputAddonId: string): Promise<InputAddonManifest> {
    const basePath = `/inputAddons/${encodeURIComponent(inputAddonId)}`
    const res = await fetch(`${basePath}/manifest.json`)
    if (!res.ok) {
      throw new Error(
        `Falha ao carregar manifest do input add-on "${inputAddonId}" (${res.status}).`,
      )
    }
    const raw: unknown = await res.json()
    if (!validateInputAddonManifest(raw)) {
      throw new Error(`Manifest inválido para input add-on "${inputAddonId}".`)
    }
    return normalizeInputAddonManifest(raw)
  },
}
