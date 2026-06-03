import fs from 'node:fs/promises'
import path from 'node:path'

import type { Plugin } from 'vite'

import { handleAddonsListRequest } from './vite.addonsListHandler'
import {
  handleAddonsInstallAvailableRequest,
  handleAddonsInstallRequest,
} from './vite.addonsInstallHandler'
import { normalizeApiPathname } from './vite.devApiPath'
import { sanitizeBlockParameterFileStem, sanitizeBlockStructureFolderName } from './src/core/blockParameterFileStem'

function sanitizeBlockDefinitionFileStem(id: string): string | null {
  const t = id
    .normalize('NFKC')
    .trim()
    .toLowerCase()
    .replace(/[\s/\\]+/g, '-')
    .replace(/[^a-z0-9_-]/g, '')

  if (t === '' || t === '.' || t === '..' || t.length > 120) {
    return null
  }

  return t
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === 'string')
}

function isBlockParameterDocumentBase(raw: Record<string, unknown>): boolean {
  if (typeof raw.id !== 'string' || !raw.id.trim()) {
    return false
  }
  if (typeof raw.block !== 'string' || !raw.block.trim()) {
    return false
  }
  if (typeof raw.parameterName !== 'string') {
    return false
  }
  if (typeof raw.type !== 'string') {
    return false
  }
  if (typeof raw.name !== 'string' || raw.name.includes('_')) {
    return false
  }
  if (!isRecord(raw.source) || raw.source.kind !== 'parameter') {
    return false
  }
  if (typeof raw.source.parameterId !== 'string') {
    return false
  }
  if (!isRecord(raw.slots) || !isStringArray(raw.slots.out)) {
    return false
  }
  return true
}

function isBlockParameterDocument(raw: unknown): raw is Record<string, unknown> {
  if (!isRecord(raw)) {
    return false
  }
  if (!isBlockParameterDocumentBase(raw)) {
    return false
  }

  if (typeof raw.value === 'string') {
    return isStringArray(raw.slots.in)
  }

  if (raw.type === 'embed') {
    return typeof raw.embed === 'string' && raw.embed.trim().length > 0
  }

  if (raw.type === 'pointer') {
    return typeof raw.pointer === 'string' && raw.pointer.trim().length > 0
  }

  if (raw.type === 'mapHashPointer' || raw.type === 'mapHashEmbed' || raw.type === 'mapU64Pointer') {
    if (raw.mapKind !== raw.type) {
      return false
    }
    if (!Array.isArray(raw.entries)) {
      return false
    }
    return raw.entries.every(
      (entry) =>
        isRecord(entry) &&
        typeof entry.key === 'string' &&
        typeof entry.target === 'string',
    )
  }

  if (
    raw.type === 'listF32' ||
    raw.type === 'listString' ||
    raw.type === 'listHash' ||
    raw.type === 'listVector2' ||
    raw.type === 'listVector3' ||
    raw.type === 'listVector4'
  ) {
    return isStringArray(raw.items)
  }

  if (raw.type === 'optionF32' || raw.type === 'optionString' || raw.type === 'optionVector3') {
    return raw.item === null || typeof raw.item === 'string'
  }

  return false
}

function isBlockDefinitionDocument(raw: unknown): raw is Record<string, unknown> {
  if (!isRecord(raw)) {
    return false
  }
  if (typeof raw.id !== 'string' || !raw.id.trim()) {
    return false
  }
  if (typeof raw.block !== 'string' || !raw.block.trim()) {
    return false
  }
  if (typeof raw.blockName !== 'string' || !raw.blockName.trim()) {
    return false
  }
  if (typeof raw.type !== 'string' || !raw.type.trim()) {
    return false
  }
  if (typeof raw.name !== 'string' || raw.name.includes('_')) {
    return false
  }
  if (!isRecord(raw.source) || raw.source.kind !== 'block') {
    return false
  }
  if (typeof raw.source.nodeId !== 'string' || !raw.source.nodeId.trim()) {
    return false
  }
  if (typeof raw.color !== 'string' || !/^#[0-9a-fA-F]{6}$/.test(raw.color)) {
    return false
  }
  if (!Array.isArray(raw.headerSlots) || !raw.headerSlots.every((slot) => typeof slot === 'string')) {
    return false
  }
  if (!Array.isArray(raw.parameters) || !raw.parameters.every((entry) => typeof entry === 'string')) {
    return false
  }
  return true
}

function mergeBlockDefinitionParameters(
  incoming: Record<string, unknown>,
  existing: Record<string, unknown> | null,
): Record<string, unknown> {
  if (!existing) {
    return incoming
  }
  if (!isBlockDefinitionDocument(existing)) {
    return incoming
  }

  const incomingParams = Array.isArray(incoming.parameters)
    ? incoming.parameters.filter((entry): entry is string => typeof entry === 'string')
    : []
  const existingParams = Array.isArray(existing.parameters)
    ? existing.parameters.filter((entry): entry is string => typeof entry === 'string')
    : []

  const mergedParameters = [...new Set([...existingParams, ...incomingParams])]

  return {
    ...incoming,
    parameters: mergedParameters,
  }
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath)
    return true
  } catch {
    return false
  }
}

async function collectJsonFilesRecursive(dir: string): Promise<string[]> {
  let entries: Awaited<ReturnType<typeof fs.readdir>>
  try {
    entries = await fs.readdir(dir, { withFileTypes: true })
  } catch {
    return []
  }

  const files: string[] = []
  for (const entry of entries) {
    const fullPath = path.resolve(dir, entry.name)
    if (entry.isDirectory()) {
      files.push(...(await collectJsonFilesRecursive(fullPath)))
      continue
    }
    if (entry.isFile() && entry.name.toLowerCase().endsWith('.json')) {
      files.push(fullPath)
    }
  }
  return files
}

/**
 * Em `npm run dev`:
 * - POST `/api/block-parameters-write` — grava JSON em `src/blockStructures/parameters/{block}/`
 * - POST `/api/block-definitions-write` — grava JSON em `src/blockStructures/blocks/{blockName}/`
 * - GET `/api/block-definitions-list` — lista JSON em `src/blockStructures/blocks/**`
 * - GET `/api/block-parameters-list?block=` — lista JSON em `src/blockStructures/parameters/{block}/`
 */
export function vitePluginBlockParametersWrite(projectRoot: string): Plugin {
  return {
    name: 'node-graphs-block-parameters-write',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = new URL(req.url ?? '/', 'http://localhost')
        const pathname = normalizeApiPathname(req.url)

        if (pathname === '/api/addons-list' && req.method === 'GET') {
          void handleAddonsListRequest(projectRoot, res)
          return
        }

        if (pathname === '/api/addons-install-available' && req.method === 'GET') {
          handleAddonsInstallAvailableRequest(res)
          return
        }

        if (pathname === '/api/addons-install' && req.method === 'POST') {
          void handleAddonsInstallRequest(projectRoot, req, res)
          return
        }

        if (
          pathname !== '/api/block-parameters-write' &&
          pathname !== '/api/block-definitions-write' &&
          pathname !== '/api/block-definitions-list' &&
          pathname !== '/api/block-parameters-list'
        ) {
          next()
          return
        }

        if (pathname === '/api/block-parameters-list' && req.method === 'GET') {
          void (async () => {
            try {
              const blockRaw = url.searchParams.get('block') ?? ''
              const blockFolder = sanitizeBlockStructureFolderName(blockRaw)
              if (!blockFolder) {
                res.statusCode = 400
                res.setHeader('Content-Type', 'application/json; charset=utf-8')
                res.end(JSON.stringify({ ok: false, error: 'Parâmetro block em falta ou inválido' }))
                return
              }

              const parametersRoot = path.resolve(projectRoot, 'src', 'blockStructures', 'parameters')
              const relFromProject = path.relative(projectRoot, parametersRoot)
              if (relFromProject.startsWith('..') || path.isAbsolute(relFromProject)) {
                res.statusCode = 400
                res.setHeader('Content-Type', 'application/json; charset=utf-8')
                res.end(JSON.stringify({ ok: false, error: 'Pasta parameters inválida' }))
                return
              }

              const blockDir = path.resolve(parametersRoot, blockFolder)
              const relBlockDir = path.relative(parametersRoot, blockDir)
              if (relBlockDir.startsWith('..') || path.isAbsolute(relBlockDir)) {
                res.statusCode = 400
                res.setHeader('Content-Type', 'application/json; charset=utf-8')
                res.end(JSON.stringify({ ok: false, error: 'Pasta do bloco inválida' }))
                return
              }

              await fs.mkdir(blockDir, { recursive: true })
              const jsonFiles = await collectJsonFilesRecursive(blockDir)
              const parameters: Record<string, unknown>[] = []
              const skipped: string[] = []

              for (const filePath of jsonFiles) {
                const relInside = path.relative(blockDir, filePath)
                if (relInside.startsWith('..') || path.isAbsolute(relInside)) {
                  skipped.push(relInside)
                  continue
                }

                let raw: unknown
                try {
                  raw = JSON.parse(await fs.readFile(filePath, 'utf8')) as unknown
                } catch {
                  skipped.push(relInside)
                  continue
                }

                if (isBlockParameterDocument(raw)) {
                  parameters.push(raw)
                } else {
                  skipped.push(relInside)
                }
              }

              res.statusCode = 200
              res.setHeader('Content-Type', 'application/json; charset=utf-8')
              res.end(JSON.stringify({ ok: true, parameters, skipped }))
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
          })().catch(() => {
            res.statusCode = 500
            res.end('')
          })
          return
        }

        if (pathname === '/api/block-definitions-list' && req.method === 'GET') {
          void (async () => {
            try {
              const blocksRoot = path.resolve(projectRoot, 'src', 'blockStructures', 'blocks')
              const relFromProject = path.relative(projectRoot, blocksRoot)
              if (relFromProject.startsWith('..') || path.isAbsolute(relFromProject)) {
                res.statusCode = 400
                res.setHeader('Content-Type', 'application/json; charset=utf-8')
                res.end(JSON.stringify({ ok: false, error: 'Pasta blocks inválida' }))
                return
              }

              await fs.mkdir(blocksRoot, { recursive: true })
              const jsonFiles = await collectJsonFilesRecursive(blocksRoot)
              const definitions: Record<string, unknown>[] = []
              const skipped: string[] = []

              for (const filePath of jsonFiles) {
                const relInside = path.relative(blocksRoot, filePath)
                if (relInside.startsWith('..') || path.isAbsolute(relInside)) {
                  skipped.push(relInside)
                  continue
                }

                let raw: unknown
                try {
                  raw = JSON.parse(await fs.readFile(filePath, 'utf8')) as unknown
                } catch {
                  skipped.push(relInside)
                  continue
                }

                if (isBlockDefinitionDocument(raw)) {
                  definitions.push(raw)
                } else {
                  skipped.push(relInside)
                }
              }

              res.statusCode = 200
              res.setHeader('Content-Type', 'application/json; charset=utf-8')
              res.end(JSON.stringify({ ok: true, definitions, skipped }))
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
          })().catch(() => {
            res.statusCode = 500
            res.end('')
          })
          return
        }

        if (req.method !== 'POST') {
          next()
          return
        }

        const chunks: Buffer[] = []

        req.on('data', (chunk: Buffer) => {
          chunks.push(chunk)
        })

        req.on('end', () => {
          void (async () => {
            try {
              const rawBody = Buffer.concat(chunks).toString('utf8')
              const parsed: unknown = JSON.parse(rawBody) as unknown

              if (pathname === '/api/block-definitions-write') {
                const blocksRoot = path.resolve(projectRoot, 'src', 'blockStructures', 'blocks')
                const relFromProject = path.relative(projectRoot, blocksRoot)
                if (relFromProject.startsWith('..') || path.isAbsolute(relFromProject)) {
                  res.statusCode = 400
                  res.setHeader('Content-Type', 'application/json; charset=utf-8')
                  res.end(JSON.stringify({ ok: false, error: 'Pasta blocks inválida' }))
                  return
                }

                await fs.mkdir(blocksRoot, { recursive: true })

                const definitions: Record<string, unknown>[] = []
                if (isRecord(parsed) && Array.isArray(parsed.definitions)) {
                  for (const item of parsed.definitions) {
                    if (isBlockDefinitionDocument(item)) {
                      definitions.push(item)
                    }
                  }
                } else if (isRecord(parsed) && isBlockDefinitionDocument(parsed.definition)) {
                  definitions.push(parsed.definition)
                } else {
                  res.statusCode = 400
                  res.setHeader('Content-Type', 'application/json; charset=utf-8')
                  res.end(JSON.stringify({ ok: false, error: 'Corpo inválido' }))
                  return
                }

                if (definitions.length === 0) {
                  res.statusCode = 400
                  res.setHeader('Content-Type', 'application/json; charset=utf-8')
                  res.end(JSON.stringify({ ok: false, error: 'Nenhuma definição válida' }))
                  return
                }

                const written: string[] = []
                const overwritten: string[] = []
                const skipped: string[] = []
                const errors: string[] = []

                for (const definition of definitions) {
                  const blockFolder = sanitizeBlockStructureFolderName(definition.blockName as string)
                  const stem = sanitizeBlockDefinitionFileStem(definition.id as string)
                  if (!blockFolder || !stem) {
                    skipped.push(String(definition.id ?? '?'))
                    continue
                  }

                  const blockDir = path.resolve(blocksRoot, blockFolder)
                  await fs.mkdir(blockDir, { recursive: true })

                  const filePath = path.resolve(blockDir, `${stem}.json`)
                  const relInside = path.relative(blocksRoot, filePath)
                  if (relInside.startsWith('..') || path.isAbsolute(relInside)) {
                    skipped.push(stem)
                    continue
                  }

                  const existed = await fileExists(filePath)
                  let existingDefinition: Record<string, unknown> | null = null
                  if (existed) {
                    try {
                      const parsed = JSON.parse(await fs.readFile(filePath, 'utf8')) as unknown
                      if (isRecord(parsed)) {
                        existingDefinition = parsed
                      }
                    } catch {
                      existingDefinition = null
                    }
                  }

                  const mergedDefinition = mergeBlockDefinitionParameters(definition, existingDefinition)
                  await fs.writeFile(filePath, `${JSON.stringify(mergedDefinition, null, 2)}\n`, 'utf8')

                  const label = `${blockFolder}/${stem}.json`
                  if (existed) {
                    overwritten.push(label)
                  } else {
                    written.push(label)
                  }
                }

                if (definitions.length === 1 && written.length + overwritten.length === 1) {
                  res.statusCode = 200
                  res.setHeader('Content-Type', 'application/json; charset=utf-8')
                  res.end(
                    JSON.stringify({
                      ok: true,
                      written: written[0] ?? overwritten[0],
                      overwritten: overwritten.length > 0,
                      writtenAll: written,
                      overwrittenAll: overwritten,
                      skipped,
                      errors,
                    }),
                  )
                  return
                }

                res.statusCode = 200
                res.setHeader('Content-Type', 'application/json; charset=utf-8')
                res.end(
                  JSON.stringify({
                    ok: true,
                    written,
                    overwritten,
                    skipped,
                    errors,
                  }),
                )
                return
              }

              if (!isRecord(parsed) || !Array.isArray(parsed.parameters)) {
                res.statusCode = 400
                res.setHeader('Content-Type', 'application/json; charset=utf-8')
                res.end(JSON.stringify({ ok: false, error: 'Corpo inválido' }))
                return
              }

              const parametersRoot = path.resolve(projectRoot, 'src', 'blockStructures', 'parameters')
              const relFromProject = path.relative(projectRoot, parametersRoot)
              if (relFromProject.startsWith('..') || path.isAbsolute(relFromProject)) {
                res.statusCode = 400
                res.setHeader('Content-Type', 'application/json; charset=utf-8')
                res.end(JSON.stringify({ ok: false, error: 'Pasta parameters inválida' }))
                return
              }

              await fs.mkdir(parametersRoot, { recursive: true })

              const written: string[] = []
              const overwritten: string[] = []
              const skipped: string[] = []
              const errors: string[] = []

              for (const item of parsed.parameters) {
                if (!isBlockParameterDocument(item)) {
                  skipped.push('(documento inválido)')
                  continue
                }

                const blockFolder = sanitizeBlockStructureFolderName(item.block)
                const stem = sanitizeBlockParameterFileStem(item.id)
                if (!blockFolder || !stem) {
                  skipped.push(String(item.id ?? '?'))
                  continue
                }

                const blockDir = path.resolve(parametersRoot, blockFolder)
                await fs.mkdir(blockDir, { recursive: true })

                const filePath = path.resolve(blockDir, `${stem}.json`)
                const relInside = path.relative(parametersRoot, filePath)
                if (relInside.startsWith('..') || path.isAbsolute(relInside)) {
                  skipped.push(stem)
                  continue
                }

                const existed = await fileExists(filePath)
                await fs.writeFile(filePath, `${JSON.stringify(item, null, 2)}\n`, 'utf8')

                const label = `${blockFolder}/${stem}.json`
                if (existed) {
                  overwritten.push(label)
                } else {
                  written.push(label)
                }
              }

              res.statusCode = 200
              res.setHeader('Content-Type', 'application/json; charset=utf-8')
              res.end(
                JSON.stringify({
                  ok: true,
                  written,
                  overwritten,
                  skipped,
                  errors,
                }),
              )
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
          })().catch(() => {
            res.statusCode = 500
            res.end('')
          })
        })

        req.on('error', next)
      })
    },
  }
}
