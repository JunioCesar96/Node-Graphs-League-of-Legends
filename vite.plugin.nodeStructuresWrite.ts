import fs from 'node:fs/promises'
import path from 'node:path'

import type { Plugin } from 'vite'

import { buildNodeBaseParameterPayload, buildNodeBaseSchemaBody } from './src/core/extractNodeBaseParameters'

/** Pastas dentro de `src/nodeStructures/` que não podem ser criadas/eliminadas via API */
const RESERVED_NODE_STRUCTURE_FOLDERS = new Set(['default'])

function safePackFolder(name: string): string | null {
  const t = name
    .normalize('NFKC')
    .trim()
    .toLowerCase()
    .replace(/[\s/\\]+/g, '-')
    .replace(/[^a-z0-9_-]/g, '')

  if (t === '' || t === '.' || t === '..' || t.length > 48) {
    return null
  }

  return t
}

function safeJsonStem(id: string): string | null {
  const t = id
    .normalize('NFKC')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '')

  if (t === '' || t.length > 120) {
    return null
  }

  return t
}

function safeCollectionTypeDirSegment(collectionType: string): string {
  const t = collectionType.normalize('NFKC').trim()
  if (t === '') {
    return 'unknown'
  }
  return t.replace(/[\s/\\]+/g, '-').replace(/[^a-zA-Z0-9_-]/g, '')
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath)
    return true
  } catch {
    return false
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * Em `npm run dev`:
 * - GET `/api/node-structures-folders` — subpastas de `src/nodeStructures/` (exceto `default`)
 * - POST `/api/node-structures-delete` — corpo `{ folder }`, remove a pasta escolhida
 * - POST `/api/node-structures-extract-base` — corpo `{ folder }`, extrai parâmetros base (temp + subpastas por collectionType)
 * - POST `/api/node-structures-write` — corpo `{ folder, schemas }`, grava `.json` em `src/nodeStructures/<pasta>/`
 */
export function vitePluginNodeStructuresWrite(projectRoot: string): Plugin {
  return {
    name: 'node-graphs-node-structures-write',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const pathname = req.url?.split('?')[0]

        const nodeStructuresRoot = path.resolve(projectRoot, 'src', 'nodeStructures')

        if (pathname === '/api/node-structures-folders' && req.method === 'GET') {
          void (async () => {
            try {
              const entries = await fs.readdir(nodeStructuresRoot, { withFileTypes: true })
              const folders = entries
                .filter((e) => e.isDirectory())
                .map((e) => e.name)
                .filter((name) => !RESERVED_NODE_STRUCTURE_FOLDERS.has(name))
                .sort()

              res.statusCode = 200
              res.setHeader('Content-Type', 'application/json; charset=utf-8')
              res.end(JSON.stringify({ ok: true, folders }))
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

        if (pathname === '/api/node-structures-delete' && req.method === 'POST') {
          const chunks: Buffer[] = []

          req.on('data', (c: Buffer) => {
            chunks.push(c)
          })

          req.on('end', () => {
            void (async () => {
              try {
                const raw = Buffer.concat(chunks).toString('utf8')
                const parsed: unknown = JSON.parse(raw) as unknown

                if (!isRecord(parsed)) {
                  res.statusCode = 400
                  res.setHeader('Content-Type', 'application/json; charset=utf-8')
                  res.end(JSON.stringify({ ok: false, error: 'Corpo inválido' }))
                  return
                }

                const folder = safePackFolder(String(parsed.folder ?? ''))

                if (!folder || RESERVED_NODE_STRUCTURE_FOLDERS.has(folder)) {
                  res.statusCode = 400
                  res.setHeader('Content-Type', 'application/json; charset=utf-8')
                  res.end(JSON.stringify({ ok: false, error: 'Pasta inválida ou reservada' }))
                  return
                }

                const targetDir = path.resolve(nodeStructuresRoot, folder)
                const relative = path.relative(nodeStructuresRoot, targetDir)

                if (relative.startsWith('..') || path.isAbsolute(relative)) {
                  res.statusCode = 400
                  res.setHeader('Content-Type', 'application/json; charset=utf-8')
                  res.end(JSON.stringify({ ok: false, error: 'Pasta fora de nodeStructures' }))
                  return
                }

                await fs.rm(targetDir, { recursive: true, force: true })

                res.statusCode = 200
                res.setHeader('Content-Type', 'application/json; charset=utf-8')
                res.end(JSON.stringify({ ok: true, folder }))
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
          return
        }

        if (pathname === '/api/node-structures-extract-base' && req.method === 'POST') {
          const chunks: Buffer[] = []

          req.on('data', (c: Buffer) => {
            chunks.push(c)
          })

          req.on('end', () => {
            void (async () => {
              try {
                const rawBody = Buffer.concat(chunks).toString('utf8')
                const parsed: unknown = JSON.parse(rawBody) as unknown

                if (!isRecord(parsed)) {
                  res.statusCode = 400
                  res.setHeader('Content-Type', 'application/json; charset=utf-8')
                  res.end(JSON.stringify({ ok: false, error: 'Corpo inválido' }))
                  return
                }

                const folder = safePackFolder(String(parsed.folder ?? ''))

                if (!folder || RESERVED_NODE_STRUCTURE_FOLDERS.has(folder)) {
                  res.statusCode = 400
                  res.setHeader('Content-Type', 'application/json; charset=utf-8')
                  res.end(JSON.stringify({ ok: false, error: 'Pasta inválida ou reservada' }))
                  return
                }

                const targetDir = path.resolve(nodeStructuresRoot, folder)
                const relative = path.relative(nodeStructuresRoot, targetDir)

                if (relative.startsWith('..') || path.isAbsolute(relative)) {
                  res.statusCode = 400
                  res.setHeader('Content-Type', 'application/json; charset=utf-8')
                  res.end(JSON.stringify({ ok: false, error: 'Pasta fora de nodeStructures' }))
                  return
                }

                if (!(await fileExists(targetDir))) {
                  res.statusCode = 400
                  res.setHeader('Content-Type', 'application/json; charset=utf-8')
                  res.end(JSON.stringify({ ok: false, error: 'Pasta do pack não existe' }))
                  return
                }

                const tempDir = path.join(targetDir, 'temp')
                const listPath = path.join(tempDir, 'parameters_list.json')

                const knownIds = new Set<string>()
                if (await fileExists(listPath)) {
                  try {
                    const listRaw = await fs.readFile(listPath, 'utf8')
                    const listParsed: unknown = JSON.parse(listRaw) as unknown
                    if (Array.isArray(listParsed)) {
                      for (const entry of listParsed) {
                        if (typeof entry === 'string' && entry.trim() !== '') {
                          knownIds.add(entry.trim())
                        }
                      }
                    }
                  } catch {
                    /** ignora JSON inválido — reconstrói lista a partir do zero */
                  }
                }

                const created: string[] = []
                const skipped: string[] = []
                const errors: string[] = []
                const collectionTypeInfo: Record<
                  string,
                  { nomenclature: { group: string; collection: string; collectionType: string } }
                > = {}

                const rootEntries = await fs.readdir(targetDir, { withFileTypes: true })
                const schemaFiles = rootEntries.filter((e) => e.isFile() && e.name.toLowerCase().endsWith('.json'))

                for (const dirent of schemaFiles) {
                  const filePath = path.join(targetDir, dirent.name)

                  let fileJson: unknown
                  try {
                    fileJson = JSON.parse(await fs.readFile(filePath, 'utf8')) as unknown
                  } catch (err) {
                    errors.push(`${dirent.name}: ${err instanceof Error ? err.message : String(err)}`)
                    continue
                  }

                  if (!isRecord(fileJson)) {
                    errors.push(`${dirent.name}: raiz inválida`)
                    continue
                  }

                  const nom = fileJson.nomenclature
                  if (!isRecord(nom) || typeof nom.collectionType !== 'string' || nom.collectionType.trim() === '') {
                    errors.push(`${dirent.name}: falta nomenclature.collectionType`)
                    continue
                  }

                  const groupRaw = nom.group
                  const collectionRaw = nom.collection
                  if (
                    typeof groupRaw !== 'string' ||
                    !groupRaw.trim() ||
                    typeof collectionRaw !== 'string' ||
                    !collectionRaw.trim()
                  ) {
                    errors.push(`${dirent.name}: nomenclature incompleta (group/collection)`)
                    continue
                  }

                  const collectionType = nom.collectionType.trim()
                  const group = groupRaw.trim()
                  const collection = collectionRaw.trim()

                  if (!collectionTypeInfo[collectionType]) {
                    collectionTypeInfo[collectionType] = {
                      nomenclature: { group, collection, collectionType },
                    }
                  }

                  const subdirName = `${folder}_${safeCollectionTypeDirSegment(collectionType)}`
                  const subdirPath = path.resolve(targetDir, subdirName)
                  const subRel = path.relative(targetDir, subdirPath)
                  if (subRel.startsWith('..') || path.isAbsolute(subRel)) {
                    errors.push(`${dirent.name}: subpasta inválida`)
                    continue
                  }

                  const paramsRaw = fileJson.parameters
                  if (!Array.isArray(paramsRaw)) {
                    continue
                  }

                  for (const paramEntry of paramsRaw) {
                    if (!isRecord(paramEntry)) {
                      continue
                    }
                    const paramName = paramEntry.name
                    const paramType = paramEntry.type
                    if (typeof paramName !== 'string' || typeof paramType !== 'string') {
                      continue
                    }

                    const payload = buildNodeBaseParameterPayload(collectionType, paramName, paramType)
                    if (!payload) {
                      continue
                    }

                    const stem = safeJsonStem(payload.id)
                    if (!stem) {
                      skipped.push(payload.id)
                      continue
                    }

                    const outFile = path.join(subdirPath, `${stem}.json`)
                    const outRel = path.relative(subdirPath, outFile)
                    if (outRel.startsWith('..') || path.isAbsolute(outRel)) {
                      skipped.push(payload.id)
                      continue
                    }

                    if (knownIds.has(payload.id)) {
                      skipped.push(payload.id)
                      continue
                    }

                    if (await fileExists(outFile)) {
                      skipped.push(payload.id)
                      continue
                    }

                    await fs.mkdir(subdirPath, { recursive: true })
                    await fs.writeFile(outFile, `${JSON.stringify(payload, null, 2)}\n`, 'utf8')
                    knownIds.add(payload.id)
                    created.push(`${subdirName}/${stem}.json`)
                  }
                }

                await fs.mkdir(tempDir, { recursive: true })
                const ordered = Array.from(knownIds).sort((a, b) => a.localeCompare(b))
                await fs.writeFile(listPath, `${JSON.stringify(ordered, null, 2)}\n`, 'utf8')

                const baseCreated: string[] = []
                const baseSkipped: string[] = []

                for (const ct of Object.keys(collectionTypeInfo).sort((a, b) => a.localeCompare(b))) {
                  const entry = collectionTypeInfo[ct]
                  if (!entry) {
                    continue
                  }

                  const subdirName = `${folder}_${safeCollectionTypeDirSegment(ct)}`
                  const subdirPath = path.resolve(targetDir, subdirName)
                  const subRel = path.relative(targetDir, subdirPath)
                  if (subRel.startsWith('..') || path.isAbsolute(subRel)) {
                    errors.push(`base ${ct}: subpasta inválida`)
                    continue
                  }

                  const baseFile = path.join(subdirPath, `${ct}.json`)
                  const baseRelInside = path.relative(subdirPath, baseFile)
                  if (baseRelInside.startsWith('..') || path.isAbsolute(baseRelInside)) {
                    errors.push(`base ${ct}: caminho inválido`)
                    continue
                  }

                  if (await fileExists(baseFile)) {
                    baseSkipped.push(`${subdirName}/${ct}.json`)
                    continue
                  }

                  const body = buildNodeBaseSchemaBody(ct, entry.nomenclature)
                  await fs.mkdir(subdirPath, { recursive: true })
                  await fs.writeFile(baseFile, `${JSON.stringify(body, null, 2)}\n`, 'utf8')
                  baseCreated.push(`${subdirName}/${ct}.json`)
                }

                res.statusCode = 200
                res.setHeader('Content-Type', 'application/json; charset=utf-8')
                res.end(
                  JSON.stringify({
                    ok: true,
                    folder,
                    created,
                    skipped,
                    errors,
                    baseCreated,
                    baseSkipped,
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
          return
        }

        if (pathname !== '/api/node-structures-write' || req.method !== 'POST') {
          next()
          return
        }

        const chunks: Buffer[] = []

        req.on('data', (c: Buffer) => {
          chunks.push(c)
        })

        req.on('end', () => {
          void (async () => {
            try {
              const raw = Buffer.concat(chunks).toString('utf8')
              const parsed: unknown = JSON.parse(raw) as unknown

              if (!isRecord(parsed)) {
                res.statusCode = 400
                res.setHeader('Content-Type', 'application/json; charset=utf-8')
                res.end(JSON.stringify({ ok: false, error: 'Corpo inválido' }))
                return
              }

              const folder = safePackFolder(String(parsed.folder ?? ''))
              const schemasRaw = parsed.schemas

              if (!folder || !Array.isArray(schemasRaw)) {
                res.statusCode = 400
                res.setHeader('Content-Type', 'application/json; charset=utf-8')
                res.end(JSON.stringify({ ok: false, error: 'folder ou schemas em falta' }))
                return
              }

              if (RESERVED_NODE_STRUCTURE_FOLDERS.has(folder)) {
                res.statusCode = 400
                res.setHeader('Content-Type', 'application/json; charset=utf-8')
                res.end(JSON.stringify({ ok: false, error: 'Nome de pasta reservado' }))
                return
              }

              const targetDir = path.resolve(nodeStructuresRoot, folder)

              const relative = path.relative(nodeStructuresRoot, targetDir)
              if (relative.startsWith('..') || path.isAbsolute(relative)) {
                res.statusCode = 400
                res.setHeader('Content-Type', 'application/json; charset=utf-8')
                res.end(JSON.stringify({ ok: false, error: 'Pasta fora de nodeStructures' }))
                return
              }

              await fs.mkdir(targetDir, { recursive: true })

              const written: string[] = []
              const skipped: string[] = []

              for (const item of schemasRaw) {
                if (!isRecord(item) || typeof item.id !== 'string') {
                  skipped.push('(schema sem id)')
                  continue
                }

                const stem = safeJsonStem(item.id)

                if (!stem) {
                  skipped.push(item.id)
                  continue
                }

                const fileName = `${stem}.json`
                const filePath = path.resolve(targetDir, fileName)

                const relInside = path.relative(targetDir, filePath)
                if (relInside.startsWith('..') || path.isAbsolute(relInside)) {
                  skipped.push(item.id)
                  continue
                }

                await fs.writeFile(filePath, `${JSON.stringify(item, null, 2)}\n`, 'utf8')
                written.push(fileName)
              }

              res.statusCode = 200
              res.setHeader('Content-Type', 'application/json; charset=utf-8')
              res.end(
                JSON.stringify({
                  ok: true,
                  folder,
                  paths: written,
                  skippedIds: skipped,
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
