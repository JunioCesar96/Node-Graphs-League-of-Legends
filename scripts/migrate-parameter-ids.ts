/**
 * Migra ids de parâmetros para `{collectionType}_parameter_{paramName}`.
 * Uso: npx vite-node scripts/migrate-parameter-ids.ts
 */

import { readFile, readdir, rename, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  migrateParameterId,
  migrateParameterIdLoose,
  nodeBaseParameterId,
} from '@/core/extractNodeBaseParameters'
import { parseNomenclatureFromStructureJson } from '@/core/nodeStructureJson'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(__dirname, '..')
const nodeStructuresRoot = path.join(projectRoot, 'src', 'nodeStructures')
const logicPath = path.join(projectRoot, 'src', 'data', 'workspace', 'logic.json')

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
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

function collectionTypeFromSubfolder(pack: string, subfolder: string): string | null {
  const prefix = `${pack}_`
  if (!subfolder.startsWith(prefix)) {
    return null
  }
  const segment = subfolder.slice(prefix.length).trim()
  return segment.length > 0 ? segment : null
}

function isParameterStub(raw: Record<string, unknown>): boolean {
  if ('title' in raw || 'internalStructures' in raw) {
    return false
  }
  const id = typeof raw.id === 'string' ? raw.id : ''
  if (id.includes('_embed_') || id.includes('_listEmbed_')) {
    return false
  }
  return (
    typeof raw.name === 'string' &&
    typeof raw.type === 'string' &&
    typeof raw.defaultValue === 'string'
  )
}

function isSchemaBodyFile(relPath: string, fileName: string): boolean {
  const segments = relPath.replace(/\\/g, '/').split('/')
  if (segments.length !== 3) {
    return false
  }
  const subfolder = segments[1] ?? ''
  const stem = fileName.replace(/\.json$/i, '')
  const typeSegment = collectionTypeFromSubfolder(segments[0] ?? '', subfolder)
  if (!typeSegment) {
    return false
  }
  return stem.localeCompare(typeSegment, undefined, { sensitivity: 'base' }) === 0
}

function buildParameterIdMap(
  raw: Record<string, unknown>,
  collectionType: string,
): Map<string, string> {
  const map = new Map<string, string>()
  const parameters = raw.parameters
  if (!Array.isArray(parameters)) {
    return map
  }
  for (const entry of parameters) {
    if (!isRecord(entry)) {
      continue
    }
    const name = typeof entry.name === 'string' ? entry.name : ''
    const oldId = typeof entry.id === 'string' ? entry.id : ''
    if (!name || !oldId) {
      continue
    }
    const newId = nodeBaseParameterId(collectionType, name)
    if (oldId !== newId) {
      map.set(oldId, newId)
    }
  }
  return map
}

function remapIdList(ids: unknown, map: Map<string, string>): string[] | undefined {
  if (!Array.isArray(ids)) {
    return undefined
  }
  const out: string[] = []
  for (const item of ids) {
    if (typeof item !== 'string') {
      continue
    }
    const next = map.get(item) ?? item
    if (!out.includes(next)) {
      out.push(next)
    }
  }
  return out
}

function remapLinkedPairs(
  raw: unknown,
  map: Map<string, string>,
): Array<readonly [string, string]> | undefined {
  if (!Array.isArray(raw)) {
    return undefined
  }
  const out: Array<readonly [string, string]> = []
  for (const item of raw) {
    if (!Array.isArray(item) || item.length < 2) {
      continue
    }
    const a = typeof item[0] === 'string' ? (map.get(item[0]) ?? item[0]) : ''
    const b = typeof item[1] === 'string' ? (map.get(item[1]) ?? item[1]) : ''
    if (a && b) {
      out.push([a, b])
    }
  }
  return out.length > 0 ? out : undefined
}

async function migrateSchemaBodyFile(absPath: string): Promise<number> {
  const text = await readFile(absPath, 'utf8')
  const raw = JSON.parse(text) as unknown
  if (!isRecord(raw)) {
    return 0
  }

  const nom = parseNomenclatureFromStructureJson(raw.nomenclature)
  const collectionType =
    nom?.collectionType?.trim() ||
    (typeof raw.title === 'string' ? raw.title.trim() : '') ||
    (typeof raw.id === 'string' ? raw.id.trim() : '')

  if (!collectionType) {
    return 0
  }

  const idMap = buildParameterIdMap(raw, collectionType)
  let changes = idMap.size

  if (Array.isArray(raw.parameters)) {
    for (const entry of raw.parameters) {
      if (!isRecord(entry) || typeof entry.name !== 'string') {
        continue
      }
      const newId = nodeBaseParameterId(collectionType, entry.name)
      if (entry.id !== newId) {
        entry.id = newId
      }
    }
  }

  if ('required_parameter' in raw) {
    const next = remapIdList(raw.required_parameter, idMap)
    if (next !== undefined) {
      raw.required_parameter = next
    }
  }

  if ('linked_parameter_values' in raw) {
    const next = remapLinkedPairs(raw.linked_parameter_values, idMap)
    if (next !== undefined) {
      raw.linked_parameter_values = next
    } else if (Array.isArray(raw.linked_parameter_values) && raw.linked_parameter_values.length === 0) {
      raw.linked_parameter_values = []
    }
  }

  if (typeof raw.hashStringParameterId === 'string') {
    const next = idMap.get(raw.hashStringParameterId)
    if (next) {
      raw.hashStringParameterId = next
      changes += 1
    }
  }

  if (changes > 0) {
    await writeFile(absPath, `${JSON.stringify(raw, null, 2)}\n`, 'utf8')
  }

  return changes
}

async function migrateParameterStubFile(
  absPath: string,
  collectionType: string,
): Promise<{ renamed: boolean; oldPath?: string }> {
  const text = await readFile(absPath, 'utf8')
  const raw = JSON.parse(text) as unknown
  if (!isRecord(raw) || !isParameterStub(raw)) {
    return { renamed: false }
  }

  const oldId = typeof raw.id === 'string' ? raw.id : ''
  const name = typeof raw.name === 'string' ? raw.name : ''
  const newId = migrateParameterId(collectionType, oldId, name)

  if (newId === oldId && absPath.includes('_parameter_')) {
    return { renamed: false }
  }

  raw.id = newId
  const newStem = safeJsonStem(newId)
  const dir = path.dirname(absPath)
  const newPath = newStem ? path.join(dir, `${newStem}.json`) : absPath

  await writeFile(newPath, `${JSON.stringify(raw, null, 2)}\n`, 'utf8')

  if (newPath !== absPath) {
    await rm(absPath, { force: true })
    return { renamed: true, oldPath: absPath }
  }

  return { renamed: true }
}

async function migrateParametersList(absPath: string): Promise<void> {
  const text = await readFile(absPath, 'utf8')
  const list = JSON.parse(text) as unknown
  if (!Array.isArray(list)) {
    return
  }

  const out: string[] = []
  for (const item of list) {
    if (typeof item !== 'string') {
      continue
    }
    if (item.includes('_embed_') || item.includes('_listEmbed_')) {
      out.push(item)
      continue
    }
    if (item.includes('_parameter_')) {
      out.push(item)
      continue
    }
    const parts = item.split('_')
    if (parts.length >= 2) {
      const ct = parts[0]!
      const name = parts.slice(1).join('_')
      out.push(nodeBaseParameterId(ct, name))
    } else {
      out.push(item)
    }
  }

  const unique = [...new Set(out)].sort((a, b) => a.localeCompare(b))
  await writeFile(absPath, `${JSON.stringify(unique, null, 2)}\n`, 'utf8')
}

async function migrateLogicJson(): Promise<number> {
  let text: string
  try {
    text = await readFile(logicPath, 'utf8')
  } catch {
    return 0
  }

  const doc = JSON.parse(text) as unknown
  if (!isRecord(doc) || !isRecord(doc.nodes)) {
    return 0
  }

  let changes = 0

  for (const nodePayload of Object.values(doc.nodes)) {
    if (!isRecord(nodePayload)) {
      continue
    }

    const values = nodePayload.values
    if (isRecord(values)) {
      const nextValues: Record<string, string> = {}
      for (const [key, value] of Object.entries(values)) {
        if (key.includes('_embed_') || key.includes('_listEmbed_')) {
          nextValues[key] = String(value)
          continue
        }
        const newKey = migrateParameterIdLoose(key)
        if (newKey !== key) {
          changes += 1
        }
        nextValues[newKey] = String(value)
      }
      nodePayload.values = nextValues
    }

    const req = nodePayload.required_parameter
    if (Array.isArray(req)) {
      const nextReq: string[] = []
      for (const id of req) {
        if (typeof id !== 'string') {
          continue
        }
        const migrated = migrateParameterIdLoose(id)
        if (migrated !== id) {
          changes += 1
        }
        if (!nextReq.includes(migrated)) {
          nextReq.push(migrated)
        }
      }
      nodePayload.required_parameter = nextReq
    }

    const links = nodePayload.parameter_value_links
    if (Array.isArray(links)) {
      const nextLinks: Array<readonly [string, string]> = []
      for (const pair of links) {
        if (!Array.isArray(pair) || pair.length < 2) {
          continue
        }
        const a = typeof pair[0] === 'string' ? pair[0] : ''
        const b = typeof pair[1] === 'string' ? pair[1] : ''
        const mapPair = (id: string) => {
          const m = migrateParameterIdLoose(id)
          if (m !== id) {
            changes += 1
          }
          return m
        }
        nextLinks.push([mapPair(a), mapPair(b)])
      }
      nodePayload.parameter_value_links = nextLinks
    }
  }

  if (changes > 0) {
    await writeFile(logicPath, `${JSON.stringify(doc, null, 2)}\n`, 'utf8')
  }

  return changes
}

async function walkJsonFiles(dir: string, rel = ''): Promise<string[]> {
  const out: string[] = []
  const entries = await readdir(dir, { withFileTypes: true })
  for (const ent of entries) {
    const nextRel = rel ? `${rel}/${ent.name}` : ent.name
    const abs = path.join(dir, ent.name)
    if (ent.isDirectory()) {
      out.push(...(await walkJsonFiles(abs, nextRel)))
    } else if (ent.isFile() && ent.name.endsWith('.json')) {
      out.push(abs)
    }
  }
  return out
}

async function main(): Promise<void> {
  let stubCount = 0
  let schemaCount = 0
  let listCount = 0

  const files = await walkJsonFiles(nodeStructuresRoot)

  for (const absPath of files) {
    const rel = path.relative(nodeStructuresRoot, absPath)
    const fileName = path.basename(absPath)

    if (fileName === 'parameters_list.json') {
      await migrateParametersList(absPath)
      listCount += 1
      continue
    }

    const segments = rel.replace(/\\/g, '/').split('/')
    if (segments.length === 3 && isSchemaBodyFile(rel, fileName)) {
      schemaCount += await migrateSchemaBodyFile(absPath)
      continue
    }

    if (segments.length === 3) {
      const pack = segments[0] ?? ''
      const subfolder = segments[1] ?? ''
      const collectionType = collectionTypeFromSubfolder(pack, subfolder)
      if (!collectionType) {
        continue
      }

      const text = await readFile(absPath, 'utf8')
      const raw = JSON.parse(text) as unknown
      if (isRecord(raw) && isParameterStub(raw)) {
        await migrateParameterStubFile(absPath, collectionType)
        stubCount += 1
      }
    }
  }

  const logicChanges = await migrateLogicJson()

  console.log(`Stubs de parâmetro migrados: ${String(stubCount)}`)
  console.log(`Schemas base actualizados (campos): ${String(schemaCount)}`)
  console.log(`parameters_list.json: ${String(listCount)}`)
  console.log(`logic.json alterações: ${String(logicChanges)}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
