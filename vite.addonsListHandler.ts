import fs from 'node:fs/promises'
import path from 'node:path'
import type { ServerResponse } from 'node:http'

import { isAllowedAddonSlotType } from './src/core/addonRitualSlotTypes'
import { parseAddonDriveField } from './src/core/addonDrive'
import { isKnownAddonSystemFunction } from './src/core/addonSystemFunctions'

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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isValidAddonContextMenusField(raw: unknown): boolean {
  if (raw === undefined) {
    return true
  }
  if (!Array.isArray(raw)) {
    return false
  }
  for (const entry of raw) {
    if (!isRecord(entry)) {
      return false
    }
    if (typeof entry.name !== 'string' || !entry.name.trim()) {
      return false
    }
    if (!Array.isArray(entry.options)) {
      return false
    }
    for (const opt of entry.options) {
      if (!isRecord(opt)) {
        return false
      }
      if (typeof opt.name !== 'string' || typeof opt.action !== 'string') {
        return false
      }
    }
  }
  return true
}

export function isAddonManifest(raw: unknown): boolean {
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
    if (typeof slot.type !== 'string' || !isAllowedAddonSlotType(slot.type)) {
      return false
    }
    if (slot.direction !== 'input' && slot.direction !== 'output') {
      return false
    }
    if (slot.slotTip !== undefined && !isValidSlotTip(slot.slotTip)) {
      return false
    }
  }
  const menus = raw.cotexMenu ?? raw.contextMenu
  if (!isValidAddonContextMenusField(menus)) {
    return false
  }
  if (raw.functions !== undefined) {
    if (!Array.isArray(raw.functions)) {
      return false
    }
    for (const fn of raw.functions) {
      if (typeof fn !== 'string' || !fn.trim() || !isKnownAddonSystemFunction(fn.trim())) {
        return false
      }
    }
  }
  return true
}

export async function handleAddonsListRequest(
  projectRoot: string,
  res: ServerResponse,
): Promise<void> {
  try {
    const addonsRoot = path.resolve(projectRoot, 'public', 'addons')
    const relFromProject = path.relative(projectRoot, addonsRoot)
    if (relFromProject.startsWith('..') || path.isAbsolute(relFromProject)) {
      res.statusCode = 400
      res.setHeader('Content-Type', 'application/json; charset=utf-8')
      res.end(JSON.stringify({ ok: false, error: 'Pasta addons inválida' }))
      return
    }

    const entries = await fs.readdir(addonsRoot, { withFileTypes: true }).catch(() => [])
    const manifests: Record<string, unknown>[] = []
    const skipped: string[] = []

    for (const entry of entries) {
      if (!entry.isDirectory()) {
        continue
      }
      const manifestPath = path.resolve(addonsRoot, entry.name, 'manifest.json')
      const relManifest = path.relative(addonsRoot, manifestPath)
      if (relManifest.startsWith('..') || path.isAbsolute(relManifest)) {
        skipped.push(entry.name)
        continue
      }

      let raw: unknown
      try {
        raw = JSON.parse(await fs.readFile(manifestPath, 'utf8')) as unknown
      } catch {
        skipped.push(entry.name)
        continue
      }

      if (isAddonManifest(raw)) {
        manifests.push(raw)
      } else {
        skipped.push(entry.name)
      }
    }

    res.statusCode = 200
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.end(JSON.stringify({ ok: true, manifests, skipped }))
  } catch (err) {
    res.statusCode = 500
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.end(
      JSON.stringify({
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      }),
    )
  }
}
