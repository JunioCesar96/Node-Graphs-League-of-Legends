import fs from 'node:fs/promises'
import path from 'node:path'
import type { ServerResponse } from 'node:http'

import { isAllowedAddonSlotType } from './src/core/addonRitualSlotTypes'

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

function isValidInputBinding(raw: unknown): boolean {
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

export function isInputAddonManifest(raw: unknown): boolean {
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

export async function handleInputAddonsListRequest(
  projectRoot: string,
  res: ServerResponse,
): Promise<void> {
  try {
    const inputAddonsRoot = path.resolve(projectRoot, 'public', 'inputAddons')
    const relFromProject = path.relative(projectRoot, inputAddonsRoot)
    if (relFromProject.startsWith('..') || path.isAbsolute(relFromProject)) {
      res.statusCode = 400
      res.setHeader('Content-Type', 'application/json; charset=utf-8')
      res.end(JSON.stringify({ ok: false, error: 'Pasta inputAddons inválida' }))
      return
    }

    const entries = await fs.readdir(inputAddonsRoot, { withFileTypes: true }).catch(() => [])
    const manifests: Record<string, unknown>[] = []
    const skipped: string[] = []

    for (const entry of entries) {
      if (!entry.isDirectory()) {
        continue
      }
      const manifestPath = path.resolve(inputAddonsRoot, entry.name, 'manifest.json')
      const relManifest = path.relative(inputAddonsRoot, manifestPath)
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

      if (isInputAddonManifest(raw)) {
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
