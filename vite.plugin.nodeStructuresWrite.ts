import fs from 'node:fs/promises'
import path from 'node:path'

import type { Plugin } from 'vite'

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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * Em `npm run dev`:
 * - GET `/api/node-structures-folders` — subpastas de `src/nodeStructures/` (exceto `default`)
 * - POST `/api/node-structures-delete` — corpo `{ folder }`, remove a pasta escolhida
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
