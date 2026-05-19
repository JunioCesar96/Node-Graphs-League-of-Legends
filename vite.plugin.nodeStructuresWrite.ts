import fs from 'node:fs/promises'
import path from 'node:path'

import type { Plugin } from 'vite'

import {
  buildNodeBaseEmbedPayload,
  buildNodeBaseListEmbedPayload,
  buildNodeBaseListPointerPayload,
  buildNodeBaseParameterPayload,
  buildNodeBasePointerPayload,
  buildNodeBaseSchemaBody,
  collectSchemaIdsFromListEmbedBlocks,
  readEmbedBlocksFromSchemaJson,
  readListEmbedBlocksFromSchemaJson,
  readListPointerBlocksFromSchemaJson,
  readPointerBlocksFromSchemaJson,
} from './src/core/extractNodeBaseParameters'
import type { NodeStructureNomenclature } from './src/core/nodeSchema'
import { nodeParameterDefinitionFromJsonStub, parseNomenclatureFromStructureJson } from './src/core/nodeStructureJson'

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

async function listPackJsonFilesRecursive(packDir: string): Promise<string[]> {
  const out: string[] = []

  async function walk(dir: string): Promise<void> {
    const entries = await fs.readdir(dir, { withFileTypes: true })
    for (const entry of entries) {
      if (entry.name === 'temp') {
        continue
      }
      const fullPath = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        await walk(fullPath)
        continue
      }
      if (!entry.name.toLowerCase().endsWith('.json')) {
        continue
      }
      if (entry.name.toLowerCase() === 'parameters_list.json') {
        continue
      }
      out.push(fullPath)
    }
  }

  await walk(packDir)
  return out
}

async function buildPackSchemaIdIndex(packDir: string): Promise<Map<string, string>> {
  const index = new Map<string, string>()
  const files = await listPackJsonFilesRecursive(packDir)

  for (const filePath of files) {
    let fileJson: unknown
    try {
      fileJson = JSON.parse(await fs.readFile(filePath, 'utf8')) as unknown
    } catch {
      continue
    }
    if (!isRecord(fileJson)) {
      continue
    }
    const schemaId = fileJson.id
    if (typeof schemaId !== 'string' || schemaId.trim() === '') {
      continue
    }
    const key = schemaId.trim()
    if (!index.has(key)) {
      index.set(key, filePath)
    }
  }

  return index
}

function registerCollectionTypeInInfo(
  collectionTypeInfo: Record<string, { nomenclature: NodeStructureNomenclature }>,
  collectionType: string,
  nomenclature: NodeStructureNomenclature,
): void {
  if (!collectionTypeInfo[collectionType]) {
    collectionTypeInfo[collectionType] = { nomenclature }
  }
}

async function registerEmbedChildrenInInfo(
  fileJson: Record<string, unknown>,
  parentNomenclature: NodeStructureNomenclature,
  collectionTypeInfo: Record<string, { nomenclature: NodeStructureNomenclature }>,
  schemaIdIndex: Map<string, string>,
  errors: string[],
): Promise<void> {
  const blocks = readEmbedBlocksFromSchemaJson(fileJson)
  const schemaIds = collectSchemaIdsFromListEmbedBlocks(blocks)

  for (const schemaId of schemaIds) {
    const childPath = schemaIdIndex.get(schemaId)
    if (!childPath) {
      const catalogRef = blocks
        .flatMap((block) => block.internalStructures)
        .find((ref) => ref.schemaId === schemaId)
      const fallbackType = catalogRef?.name?.trim()
      if (fallbackType) {
        registerCollectionTypeInInfo(collectionTypeInfo, fallbackType, {
          ...parentNomenclature,
          collectionType: fallbackType,
        })
      } else {
        errors.push(`embed: schemaId "${schemaId}" sem ficheiro no pack`)
      }
      continue
    }

    let childJson: unknown
    try {
      childJson = JSON.parse(await fs.readFile(childPath, 'utf8')) as unknown
    } catch (err) {
      errors.push(`embed ${schemaId}: ${err instanceof Error ? err.message : String(err)}`)
      continue
    }

    if (!isRecord(childJson)) {
      errors.push(`embed ${schemaId}: JSON inválido`)
      continue
    }

    const childNom = parseNomenclatureFromStructureJson(childJson.nomenclature)
    if (childNom) {
      registerCollectionTypeInInfo(collectionTypeInfo, childNom.collectionType.trim(), childNom)
      continue
    }

    const catalogRef = blocks
      .flatMap((block) => block.internalStructures)
      .find((ref) => ref.schemaId === schemaId)
    const fallbackType = catalogRef?.name?.trim()
    if (fallbackType) {
      registerCollectionTypeInInfo(collectionTypeInfo, fallbackType, {
        ...parentNomenclature,
        collectionType: fallbackType,
      })
    } else {
      errors.push(`embed ${schemaId}: falta nomenclature no filho`)
    }
  }
}

async function registerListEmbedChildrenInInfo(
  fileJson: Record<string, unknown>,
  parentNomenclature: NodeStructureNomenclature,
  collectionTypeInfo: Record<string, { nomenclature: NodeStructureNomenclature }>,
  schemaIdIndex: Map<string, string>,
  errors: string[],
): Promise<void> {
  const blocks = readListEmbedBlocksFromSchemaJson(fileJson)
  const schemaIds = collectSchemaIdsFromListEmbedBlocks(blocks)

  for (const schemaId of schemaIds) {
    const childPath = schemaIdIndex.get(schemaId)
    if (!childPath) {
      const catalogRef = blocks
        .flatMap((block) => block.internalStructures)
        .find((ref) => ref.schemaId === schemaId)
      const fallbackType = catalogRef?.name?.trim()
      if (fallbackType) {
        registerCollectionTypeInInfo(collectionTypeInfo, fallbackType, {
          ...parentNomenclature,
          collectionType: fallbackType,
        })
      } else {
        errors.push(`listEmbed: schemaId "${schemaId}" sem ficheiro no pack`)
      }
      continue
    }

    let childJson: unknown
    try {
      childJson = JSON.parse(await fs.readFile(childPath, 'utf8')) as unknown
    } catch (err) {
      errors.push(
        `listEmbed ${schemaId}: ${err instanceof Error ? err.message : String(err)}`,
      )
      continue
    }

    if (!isRecord(childJson)) {
      errors.push(`listEmbed ${schemaId}: JSON inválido`)
      continue
    }

    const childNom = parseNomenclatureFromStructureJson(childJson.nomenclature)
    if (childNom) {
      registerCollectionTypeInInfo(collectionTypeInfo, childNom.collectionType.trim(), childNom)
      continue
    }

    const catalogRef = blocks
      .flatMap((block) => block.internalStructures)
      .find((ref) => ref.schemaId === schemaId)
    const fallbackType = catalogRef?.name?.trim()
    if (fallbackType) {
      registerCollectionTypeInInfo(collectionTypeInfo, fallbackType, {
        ...parentNomenclature,
        collectionType: fallbackType,
      })
    } else {
      errors.push(`listEmbed ${schemaId}: falta nomenclature no filho`)
    }
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function safeRelativeNodeStructureJsonPath(raw: string): string | null {
  const norm = raw.replace(/\\/g, '/').replace(/^\/+/g, '').replace(/\/+$/g, '')
  if (norm === '' || norm.includes('..')) {
    return null
  }
  if (!norm.toLowerCase().endsWith('.json')) {
    return null
  }
  return norm
}

/**
 * Em `npm run dev`:
 * - GET `/api/node-structures-folders` — subpastas de `src/nodeStructures/` (exceto `default`)
 * - POST `/api/node-structures-delete` — corpo `{ folder }`, remove a pasta escolhida
 * - POST `/api/node-structures-extract-base` — corpo `{ folder }`, extrai parâmetros base (temp + subpastas por collectionType)
 * - POST `/api/node-structures-patch-required-parameter` — corpo `{ relativePath, parameterId, add }`, actualiza `required_parameter` no ficheiro do schema
 * - POST `/api/node-structures-patch-linked-parameter-values` — corpo `{ relativePath, unlink?, parameterIdA, parameterIdB? }`, actualiza `linked_parameter_values`
 * - POST `/api/node-structures-patch-hash-string` — corpo `{ relativePath, hashStringParameterId, hashString }`, actualiza `hashString` / `hashStringParameterId` no JSON do schema
 * - POST `/api/node-structures-write-instance` — corpo `{ relativePath, instance }`, grava uma instância JSON na pasta mãe do schema
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
                const collectionTypeInfo: Record<string, { nomenclature: NodeStructureNomenclature }> = {}
                const schemaIdIndex = await buildPackSchemaIdIndex(targetDir)
                const schemaFiles = await listPackJsonFilesRecursive(targetDir)

                for (const filePath of schemaFiles) {
                  const fileLabel = path.relative(targetDir, filePath).replace(/\\/g, '/')

                  let fileJson: unknown
                  try {
                    fileJson = JSON.parse(await fs.readFile(filePath, 'utf8')) as unknown
                  } catch (err) {
                    errors.push(`${fileLabel}: ${err instanceof Error ? err.message : String(err)}`)
                    continue
                  }

                  if (!isRecord(fileJson)) {
                    errors.push(`${fileLabel}: raiz inválida`)
                    continue
                  }

                  const parsedNom = parseNomenclatureFromStructureJson(fileJson.nomenclature)
                  if (!parsedNom) {
                    continue
                  }

                  const collectionType = parsedNom.collectionType.trim()

                  registerCollectionTypeInInfo(collectionTypeInfo, collectionType, parsedNom)

                  await registerEmbedChildrenInInfo(
                    fileJson,
                    parsedNom,
                    collectionTypeInfo,
                    schemaIdIndex,
                    errors,
                  )

                  await registerListEmbedChildrenInInfo(
                    fileJson,
                    parsedNom,
                    collectionTypeInfo,
                    schemaIdIndex,
                    errors,
                  )

                  const subdirName = `${folder}_${safeCollectionTypeDirSegment(collectionType)}`
                  const subdirPath = path.resolve(targetDir, subdirName)
                  const subRel = path.relative(targetDir, subdirPath)
                  if (subRel.startsWith('..') || path.isAbsolute(subRel)) {
                    errors.push(`${fileLabel}: subpasta inválida`)
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

                  const embedBlocks = readEmbedBlocksFromSchemaJson(fileJson)
                  for (const block of embedBlocks) {
                    const embedPayload = buildNodeBaseEmbedPayload(collectionType, block)
                    if (!embedPayload) {
                      continue
                    }

                    const embedStem = safeJsonStem(embedPayload.id)
                    if (!embedStem) {
                      skipped.push(embedPayload.id)
                      continue
                    }

                    const embedOutFile = path.join(subdirPath, `${embedStem}.json`)
                    const embedOutRel = path.relative(subdirPath, embedOutFile)
                    if (embedOutRel.startsWith('..') || path.isAbsolute(embedOutRel)) {
                      skipped.push(embedPayload.id)
                      continue
                    }

                    if (knownIds.has(embedPayload.id)) {
                      skipped.push(embedPayload.id)
                      continue
                    }

                    if (await fileExists(embedOutFile)) {
                      skipped.push(embedPayload.id)
                      continue
                    }

                    await fs.mkdir(subdirPath, { recursive: true })
                    await fs.writeFile(
                      embedOutFile,
                      `${JSON.stringify(embedPayload, null, 2)}\n`,
                      'utf8',
                    )
                    knownIds.add(embedPayload.id)
                    created.push(`${subdirName}/${embedStem}.json`)
                  }

                  const listEmbedBlocks = readListEmbedBlocksFromSchemaJson(fileJson)
                  for (const block of listEmbedBlocks) {
                    const listEmbedPayload = buildNodeBaseListEmbedPayload(collectionType, block)
                    if (!listEmbedPayload) {
                      continue
                    }

                    const listEmbedStem = safeJsonStem(listEmbedPayload.id)
                    if (!listEmbedStem) {
                      skipped.push(listEmbedPayload.id)
                      continue
                    }

                    const listEmbedOutFile = path.join(subdirPath, `${listEmbedStem}.json`)
                    const listEmbedOutRel = path.relative(subdirPath, listEmbedOutFile)
                    if (listEmbedOutRel.startsWith('..') || path.isAbsolute(listEmbedOutRel)) {
                      skipped.push(listEmbedPayload.id)
                      continue
                    }

                    if (knownIds.has(listEmbedPayload.id)) {
                      skipped.push(listEmbedPayload.id)
                      continue
                    }

                    if (await fileExists(listEmbedOutFile)) {
                      skipped.push(listEmbedPayload.id)
                      continue
                    }

                    await fs.mkdir(subdirPath, { recursive: true })
                    await fs.writeFile(
                      listEmbedOutFile,
                      `${JSON.stringify(listEmbedPayload, null, 2)}\n`,
                      'utf8',
                    )
                    knownIds.add(listEmbedPayload.id)
                    created.push(`${subdirName}/${listEmbedStem}.json`)
                  }

                  const pointerBlocks = readPointerBlocksFromSchemaJson(fileJson)
                  for (const block of pointerBlocks) {
                    const pointerPayload = buildNodeBasePointerPayload(collectionType, block)
                    if (!pointerPayload) {
                      continue
                    }

                    const pointerStem = safeJsonStem(pointerPayload.id)
                    if (!pointerStem) {
                      skipped.push(pointerPayload.id)
                      continue
                    }

                    const pointerOutFile = path.join(subdirPath, `${pointerStem}.json`)
                    const pointerOutRel = path.relative(subdirPath, pointerOutFile)
                    if (pointerOutRel.startsWith('..') || path.isAbsolute(pointerOutRel)) {
                      skipped.push(pointerPayload.id)
                      continue
                    }

                    if (knownIds.has(pointerPayload.id)) {
                      skipped.push(pointerPayload.id)
                      continue
                    }

                    if (await fileExists(pointerOutFile)) {
                      skipped.push(pointerPayload.id)
                      continue
                    }

                    await fs.mkdir(subdirPath, { recursive: true })
                    await fs.writeFile(
                      pointerOutFile,
                      `${JSON.stringify(pointerPayload, null, 2)}\n`,
                      'utf8',
                    )
                    knownIds.add(pointerPayload.id)
                    created.push(`${subdirName}/${pointerStem}.json`)
                  }

                  const listPointerBlocks = readListPointerBlocksFromSchemaJson(fileJson)
                  for (const block of listPointerBlocks) {
                    const listPointerPayload = buildNodeBaseListPointerPayload(collectionType, block)
                    if (!listPointerPayload) {
                      continue
                    }

                    const listPointerStem = safeJsonStem(listPointerPayload.id)
                    if (!listPointerStem) {
                      skipped.push(listPointerPayload.id)
                      continue
                    }

                    const listPointerOutFile = path.join(subdirPath, `${listPointerStem}.json`)
                    const listPointerOutRel = path.relative(subdirPath, listPointerOutFile)
                    if (listPointerOutRel.startsWith('..') || path.isAbsolute(listPointerOutRel)) {
                      skipped.push(listPointerPayload.id)
                      continue
                    }

                    if (knownIds.has(listPointerPayload.id)) {
                      skipped.push(listPointerPayload.id)
                      continue
                    }

                    if (await fileExists(listPointerOutFile)) {
                      skipped.push(listPointerPayload.id)
                      continue
                    }

                    await fs.mkdir(subdirPath, { recursive: true })
                    await fs.writeFile(
                      listPointerOutFile,
                      `${JSON.stringify(listPointerPayload, null, 2)}\n`,
                      'utf8',
                    )
                    knownIds.add(listPointerPayload.id)
                    created.push(`${subdirName}/${listPointerStem}.json`)
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

        if (pathname === '/api/node-structures-patch-required-parameter' && req.method === 'POST') {
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

                const relativePath = safeRelativeNodeStructureJsonPath(String(parsed.relativePath ?? ''))
                const parameterId = typeof parsed.parameterId === 'string' ? parsed.parameterId.trim() : ''
                const add = parsed.add === true

                if (!relativePath || !parameterId) {
                  res.statusCode = 400
                  res.setHeader('Content-Type', 'application/json; charset=utf-8')
                  res.end(JSON.stringify({ ok: false, error: 'relativePath ou parameterId inválido' }))
                  return
                }

                const absFile = path.resolve(nodeStructuresRoot, relativePath)
                const relFromRoot = path.relative(nodeStructuresRoot, absFile)
                if (relFromRoot.startsWith('..') || path.isAbsolute(relFromRoot)) {
                  res.statusCode = 400
                  res.setHeader('Content-Type', 'application/json; charset=utf-8')
                  res.end(JSON.stringify({ ok: false, error: 'Caminho fora de nodeStructures' }))
                  return
                }

                if (!(await fileExists(absFile))) {
                  res.statusCode = 400
                  res.setHeader('Content-Type', 'application/json; charset=utf-8')
                  res.end(JSON.stringify({ ok: false, error: 'Ficheiro não existe' }))
                  return
                }

                const fileText = await fs.readFile(absFile, 'utf8')
                const docUnknown: unknown = JSON.parse(fileText) as unknown

                if (!isRecord(docUnknown)) {
                  res.statusCode = 400
                  res.setHeader('Content-Type', 'application/json; charset=utf-8')
                  res.end(JSON.stringify({ ok: false, error: 'JSON inválido' }))
                  return
                }

                const parametersRaw = docUnknown.parameters
                if (!Array.isArray(parametersRaw)) {
                  res.statusCode = 400
                  res.setHeader('Content-Type', 'application/json; charset=utf-8')
                  res.end(JSON.stringify({ ok: false, error: 'Campo parameters em falta' }))
                  return
                }

                const parameterIdSet = new Set<string>()
                for (const entry of parametersRaw) {
                  if (isRecord(entry) && typeof entry.id === 'string') {
                    parameterIdSet.add(entry.id)
                  }
                }

                const schemaDir = path.dirname(absFile)
                const dirEntries = await fs.readdir(schemaDir, { withFileTypes: true })

                for (const dirent of dirEntries) {
                  if (!dirent.isFile() || !dirent.name.toLowerCase().endsWith('.json')) {
                    continue
                  }

                  const siblingAbs = path.resolve(schemaDir, dirent.name)

                  if (siblingAbs === absFile) {
                    continue
                  }

                  try {
                    const siblingText = await fs.readFile(siblingAbs, 'utf8')
                    const siblingParsed: unknown = JSON.parse(siblingText) as unknown
                    const stub = nodeParameterDefinitionFromJsonStub(siblingParsed)

                    if (stub) {
                      parameterIdSet.add(stub.id)
                    }
                  } catch {
                    /** ignora JSON inválido na pasta do schema */
                  }
                }

                if (!parameterIdSet.has(parameterId)) {
                  res.statusCode = 400
                  res.setHeader('Content-Type', 'application/json; charset=utf-8')
                  res.end(JSON.stringify({ ok: false, error: 'parameterId não existe neste schema' }))
                  return
                }

                let current: string[] = []
                if (Array.isArray(docUnknown.required_parameter)) {
                  for (const entry of docUnknown.required_parameter) {
                    if (typeof entry === 'string' && parameterIdSet.has(entry) && !current.includes(entry)) {
                      current.push(entry)
                    }
                  }
                }

                let next: string[]
                if (add) {
                  next = current.includes(parameterId) ? current : [...current, parameterId]
                } else {
                  next = current.filter((id) => id !== parameterId)
                }

                const doc = { ...docUnknown, required_parameter: next }

                await fs.writeFile(absFile, `${JSON.stringify(doc, null, 2)}\n`, 'utf8')

                res.statusCode = 200
                res.setHeader('Content-Type', 'application/json; charset=utf-8')
                res.end(JSON.stringify({ ok: true, relativePath, required_parameter: next }))
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

        if (pathname === '/api/node-structures-patch-linked-parameter-values' && req.method === 'POST') {
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

                const relativePath = safeRelativeNodeStructureJsonPath(String(parsed.relativePath ?? ''))
                const parameterIdA = typeof parsed.parameterIdA === 'string' ? parsed.parameterIdA.trim() : ''
                const parameterIdBRaw =
                  typeof parsed.parameterIdB === 'string' ? parsed.parameterIdB.trim() : ''
                const parameterIdB = parameterIdBRaw.length > 0 ? parameterIdBRaw : ''
                const unlink = parsed.unlink === true

                if (!relativePath || !parameterIdA) {
                  res.statusCode = 400
                  res.setHeader('Content-Type', 'application/json; charset=utf-8')
                  res.end(JSON.stringify({ ok: false, error: 'relativePath ou parameterIdA inválido' }))
                  return
                }

                if (!unlink && !parameterIdB) {
                  res.statusCode = 400
                  res.setHeader('Content-Type', 'application/json; charset=utf-8')
                  res.end(JSON.stringify({ ok: false, error: 'parameterIdB em falta para vincular' }))
                  return
                }

                const absFile = path.resolve(nodeStructuresRoot, relativePath)
                const relFromRoot = path.relative(nodeStructuresRoot, absFile)
                if (relFromRoot.startsWith('..') || path.isAbsolute(relFromRoot)) {
                  res.statusCode = 400
                  res.setHeader('Content-Type', 'application/json; charset=utf-8')
                  res.end(JSON.stringify({ ok: false, error: 'Caminho fora de nodeStructures' }))
                  return
                }

                if (!(await fileExists(absFile))) {
                  res.statusCode = 400
                  res.setHeader('Content-Type', 'application/json; charset=utf-8')
                  res.end(JSON.stringify({ ok: false, error: 'Ficheiro não existe' }))
                  return
                }

                const fileText = await fs.readFile(absFile, 'utf8')
                const docUnknown: unknown = JSON.parse(fileText) as unknown

                if (!isRecord(docUnknown)) {
                  res.statusCode = 400
                  res.setHeader('Content-Type', 'application/json; charset=utf-8')
                  res.end(JSON.stringify({ ok: false, error: 'JSON inválido' }))
                  return
                }

                const parametersRaw = docUnknown.parameters
                if (!Array.isArray(parametersRaw)) {
                  res.statusCode = 400
                  res.setHeader('Content-Type', 'application/json; charset=utf-8')
                  res.end(JSON.stringify({ ok: false, error: 'Campo parameters em falta' }))
                  return
                }

                const parameterIdSet = new Set<string>()
                for (const entry of parametersRaw) {
                  if (isRecord(entry) && typeof entry.id === 'string') {
                    parameterIdSet.add(entry.id)
                  }
                }

                const schemaDir = path.dirname(absFile)
                const dirEntries = await fs.readdir(schemaDir, { withFileTypes: true })

                for (const dirent of dirEntries) {
                  if (!dirent.isFile() || !dirent.name.toLowerCase().endsWith('.json')) {
                    continue
                  }

                  const siblingAbs = path.resolve(schemaDir, dirent.name)

                  if (siblingAbs === absFile) {
                    continue
                  }

                  try {
                    const siblingText = await fs.readFile(siblingAbs, 'utf8')
                    const siblingParsed: unknown = JSON.parse(siblingText) as unknown
                    const stub = nodeParameterDefinitionFromJsonStub(siblingParsed)

                    if (stub) {
                      parameterIdSet.add(stub.id)
                    }
                  } catch {
                    /** ignora JSON inválido na pasta do schema */
                  }
                }

                if (!parameterIdSet.has(parameterIdA)) {
                  res.statusCode = 400
                  res.setHeader('Content-Type', 'application/json; charset=utf-8')
                  res.end(JSON.stringify({ ok: false, error: 'parameterIdA não existe neste schema' }))
                  return
                }

                if (!unlink) {
                  if (!parameterIdSet.has(parameterIdB)) {
                    res.statusCode = 400
                    res.setHeader('Content-Type', 'application/json; charset=utf-8')
                    res.end(JSON.stringify({ ok: false, error: 'parameterIdB não existe neste schema' }))
                    return
                  }
                  if (parameterIdA === parameterIdB) {
                    res.statusCode = 400
                    res.setHeader('Content-Type', 'application/json; charset=utf-8')
                    res.end(JSON.stringify({ ok: false, error: 'Par inválido' }))
                    return
                  }
                }

                const normalizePair = (a: string, b: string): [string, string] =>
                  a <= b ? [a, b] : [b, a]

                const dedupePairs = (pairs: [string, string][]): [string, string][] => {
                  const used = new Set<string>()
                  const filtered: [string, string][] = []
                  for (const [x, y] of pairs) {
                    if (used.has(x) || used.has(y)) {
                      continue
                    }
                    used.add(x)
                    used.add(y)
                    filtered.push([x, y])
                  }
                  return filtered
                }

                const readPairs = (): [string, string][] => {
                  const rawList = Array.isArray(docUnknown.linked_parameter_values)
                    ? docUnknown.linked_parameter_values
                    : []
                  const out: [string, string][] = []
                  for (const item of rawList) {
                    if (!Array.isArray(item) || item.length !== 2) {
                      continue
                    }
                    const x = item[0]
                    const y = item[1]
                    if (typeof x !== 'string' || typeof y !== 'string' || x === y) {
                      continue
                    }
                    if (!parameterIdSet.has(x) || !parameterIdSet.has(y)) {
                      continue
                    }
                    out.push(normalizePair(x, y))
                  }
                  return dedupePairs(out)
                }

                let nextPairs: [string, string][]

                if (unlink) {
                  nextPairs = readPairs().filter(([x, y]) => x !== parameterIdA && y !== parameterIdA)
                } else {
                  const norm = normalizePair(parameterIdA, parameterIdB)
                  nextPairs = readPairs().filter(
                    ([x, y]) => x !== norm[0] && x !== norm[1] && y !== norm[0] && y !== norm[1],
                  )
                  nextPairs.push(norm)
                  nextPairs = dedupePairs(nextPairs)
                }

                const doc = { ...docUnknown, linked_parameter_values: nextPairs }

                await fs.writeFile(absFile, `${JSON.stringify(doc, null, 2)}\n`, 'utf8')

                res.statusCode = 200
                res.setHeader('Content-Type', 'application/json; charset=utf-8')
                res.end(JSON.stringify({ ok: true, relativePath, linked_parameter_values: nextPairs }))
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

        if (pathname === '/api/node-structures-patch-hash-string' && req.method === 'POST') {
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

                const relativePath = safeRelativeNodeStructureJsonPath(String(parsed.relativePath ?? ''))
                const hashStringParameterId =
                  typeof parsed.hashStringParameterId === 'string' ? parsed.hashStringParameterId.trim() : ''
                const hashString = typeof parsed.hashString === 'string' ? parsed.hashString : ''

                if (!relativePath || !hashStringParameterId) {
                  res.statusCode = 400
                  res.setHeader('Content-Type', 'application/json; charset=utf-8')
                  res.end(JSON.stringify({ ok: false, error: 'relativePath ou hashStringParameterId inválido' }))
                  return
                }

                const absFile = path.resolve(nodeStructuresRoot, relativePath)
                const relFromRoot = path.relative(nodeStructuresRoot, absFile)
                if (relFromRoot.startsWith('..') || path.isAbsolute(relFromRoot)) {
                  res.statusCode = 400
                  res.setHeader('Content-Type', 'application/json; charset=utf-8')
                  res.end(JSON.stringify({ ok: false, error: 'Caminho fora de nodeStructures' }))
                  return
                }

                if (!(await fileExists(absFile))) {
                  res.statusCode = 400
                  res.setHeader('Content-Type', 'application/json; charset=utf-8')
                  res.end(JSON.stringify({ ok: false, error: 'Ficheiro não existe' }))
                  return
                }

                const fileText = await fs.readFile(absFile, 'utf8')
                const docUnknown: unknown = JSON.parse(fileText) as unknown

                if (!isRecord(docUnknown)) {
                  res.statusCode = 400
                  res.setHeader('Content-Type', 'application/json; charset=utf-8')
                  res.end(JSON.stringify({ ok: false, error: 'JSON inválido' }))
                  return
                }

                const parametersRaw = docUnknown.parameters
                if (!Array.isArray(parametersRaw)) {
                  res.statusCode = 400
                  res.setHeader('Content-Type', 'application/json; charset=utf-8')
                  res.end(JSON.stringify({ ok: false, error: 'Campo parameters em falta' }))
                  return
                }

                const parameterIdSet = new Set<string>()
                for (const entry of parametersRaw) {
                  if (isRecord(entry) && typeof entry.id === 'string') {
                    parameterIdSet.add(entry.id)
                  }
                }

                const schemaDir = path.dirname(absFile)
                const dirEntries = await fs.readdir(schemaDir, { withFileTypes: true })

                for (const dirent of dirEntries) {
                  if (!dirent.isFile() || !dirent.name.toLowerCase().endsWith('.json')) {
                    continue
                  }

                  const siblingAbs = path.resolve(schemaDir, dirent.name)

                  if (siblingAbs === absFile) {
                    continue
                  }

                  try {
                    const siblingText = await fs.readFile(siblingAbs, 'utf8')
                    const siblingParsed: unknown = JSON.parse(siblingText) as unknown
                    const stub = nodeParameterDefinitionFromJsonStub(siblingParsed)

                    if (stub) {
                      parameterIdSet.add(stub.id)
                    }
                  } catch {
                    /** ignora JSON inválido na pasta do schema */
                  }
                }

                if (!parameterIdSet.has(hashStringParameterId)) {
                  res.statusCode = 400
                  res.setHeader('Content-Type', 'application/json; charset=utf-8')
                  res.end(JSON.stringify({ ok: false, error: 'hashStringParameterId não existe neste schema' }))
                  return
                }

                let stringType = false
                for (const entry of parametersRaw) {
                  if (isRecord(entry) && entry.id === hashStringParameterId && entry.type === 'string') {
                    stringType = true
                    break
                  }
                }
                if (!stringType) {
                  for (const dirent of dirEntries) {
                    if (!dirent.isFile() || !dirent.name.toLowerCase().endsWith('.json')) {
                      continue
                    }
                    const siblingAbs = path.resolve(schemaDir, dirent.name)
                    if (siblingAbs === absFile) {
                      continue
                    }
                    try {
                      const siblingText = await fs.readFile(siblingAbs, 'utf8')
                      const siblingParsed: unknown = JSON.parse(siblingText) as unknown
                      const stub = nodeParameterDefinitionFromJsonStub(siblingParsed)
                      if (stub && stub.id === hashStringParameterId && stub.type === 'string') {
                        stringType = true
                        break
                      }
                    } catch {
                      /** ignora */
                    }
                  }
                }

                if (!stringType) {
                  res.statusCode = 400
                  res.setHeader('Content-Type', 'application/json; charset=utf-8')
                  res.end(JSON.stringify({ ok: false, error: 'Parâmetro hashString não é do tipo string' }))
                  return
                }

                const doc = {
                  ...docUnknown,
                  hashString,
                  hashStringParameterId,
                }

                await fs.writeFile(absFile, `${JSON.stringify(doc, null, 2)}\n`, 'utf8')

                res.statusCode = 200
                res.setHeader('Content-Type', 'application/json; charset=utf-8')
                res.end(
                  JSON.stringify({
                    ok: true,
                    hashString,
                    hashStringParameterId,
                    relativePath,
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

        if (pathname === '/api/node-structures-write-instance' && req.method === 'POST') {
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

                const relativePath = safeRelativeNodeStructureJsonPath(String(parsed.relativePath ?? ''))
                const instance = parsed.instance

                if (!relativePath || !isRecord(instance) || typeof instance.id !== 'string') {
                  res.statusCode = 400
                  res.setHeader('Content-Type', 'application/json; charset=utf-8')
                  res.end(JSON.stringify({ ok: false, error: 'relativePath ou instance inválido' }))
                  return
                }

                if (typeof instance.title !== 'string' || !Array.isArray(instance.parameters)) {
                  res.statusCode = 400
                  res.setHeader('Content-Type', 'application/json; charset=utf-8')
                  res.end(JSON.stringify({ ok: false, error: 'Campos title/parameters em falta' }))
                  return
                }

                const sourceFile = path.resolve(nodeStructuresRoot, relativePath)
                const relSourceFromRoot = path.relative(nodeStructuresRoot, sourceFile)
                if (relSourceFromRoot.startsWith('..') || path.isAbsolute(relSourceFromRoot)) {
                  res.statusCode = 400
                  res.setHeader('Content-Type', 'application/json; charset=utf-8')
                  res.end(JSON.stringify({ ok: false, error: 'Caminho fora de nodeStructures' }))
                  return
                }

                if (!(await fileExists(sourceFile))) {
                  res.statusCode = 400
                  res.setHeader('Content-Type', 'application/json; charset=utf-8')
                  res.end(JSON.stringify({ ok: false, error: 'Ficheiro de origem não existe' }))
                  return
                }

                const sourceDirRel = path.dirname(relativePath).replace(/\\/g, '/')
                const targetDirRel = sourceDirRel.includes('/') ? path.dirname(sourceDirRel) : sourceDirRel
                const targetDir = path.resolve(nodeStructuresRoot, targetDirRel)
                const relTargetFromRoot = path.relative(nodeStructuresRoot, targetDir)

                if (relTargetFromRoot.startsWith('..') || path.isAbsolute(relTargetFromRoot)) {
                  res.statusCode = 400
                  res.setHeader('Content-Type', 'application/json; charset=utf-8')
                  res.end(JSON.stringify({ ok: false, error: 'Pasta destino fora de nodeStructures' }))
                  return
                }

                const stem = safeJsonStem(instance.id)

                if (!stem) {
                  res.statusCode = 400
                  res.setHeader('Content-Type', 'application/json; charset=utf-8')
                  res.end(JSON.stringify({ ok: false, error: 'id da instância inválido' }))
                  return
                }

                await fs.mkdir(targetDir, { recursive: true })

                const fileName = `${stem}.json`
                const filePath = path.resolve(targetDir, fileName)
                const relFileFromTarget = path.relative(targetDir, filePath)

                if (relFileFromTarget.startsWith('..') || path.isAbsolute(relFileFromTarget)) {
                  res.statusCode = 400
                  res.setHeader('Content-Type', 'application/json; charset=utf-8')
                  res.end(JSON.stringify({ ok: false, error: 'Ficheiro destino inválido' }))
                  return
                }

                await fs.writeFile(filePath, `${JSON.stringify(instance, null, 2)}\n`, 'utf8')

                const savedRelativePath = path.relative(nodeStructuresRoot, filePath).replace(/\\/g, '/')

                res.statusCode = 200
                res.setHeader('Content-Type', 'application/json; charset=utf-8')
                res.end(JSON.stringify({ ok: true, relativePath: savedRelativePath }))
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
              const rootSchemaIdsRaw = parsed.rootSchemaIds
              const rootSchemaIdSet = new Set<string>()
              if (Array.isArray(rootSchemaIdsRaw)) {
                for (const entry of rootSchemaIdsRaw) {
                  if (typeof entry === 'string' && entry.trim().length > 0) {
                    rootSchemaIdSet.add(entry.trim())
                  }
                }
              }

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

                const titleRaw = typeof item.title === 'string' ? item.title.trim() : ''
                const typeDirSegment = safeCollectionTypeDirSegment(titleRaw || stem)
                const isRootEntity =
                  rootSchemaIdSet.size === 0 ? true : rootSchemaIdSet.has(String(item.id).trim())

                let filePath: string
                let writtenLabel: string

                if (isRootEntity) {
                  const fileName = `${stem}.json`
                  filePath = path.resolve(targetDir, fileName)
                  writtenLabel = fileName
                } else {
                  const subDirName = `${folder}_${typeDirSegment}`
                  const subDir = path.resolve(targetDir, subDirName)
                  const fileName = `${typeDirSegment}.json`
                  filePath = path.resolve(subDir, fileName)
                  writtenLabel = `${subDirName}/${fileName}`
                  await fs.mkdir(subDir, { recursive: true })
                }

                const relInside = path.relative(targetDir, filePath)
                if (relInside.startsWith('..') || path.isAbsolute(relInside)) {
                  skipped.push(item.id)
                  continue
                }

                await fs.writeFile(filePath, `${JSON.stringify(item, null, 2)}\n`, 'utf8')
                written.push(writtenLabel)
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
