/**
 * Regenera stubs de parâmetro / EMBED / LIST_EMBED a partir dos corpos de schema convertidos.
 * Uso: npx vite-node scripts/regenerate-node-base-stubs.ts [pack]
 */

import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  buildNodeBaseEmbedPayload,
  buildNodeBaseListEmbedPayload,
  buildNodeBaseListPointerPayload,
  buildNodeBasePointerPayload,
  readEmbedBlocksFromSchemaJson,
  readListEmbedBlocksFromSchemaJson,
  readListPointerBlocksFromSchemaJson,
  readPointerBlocksFromSchemaJson,
} from '@/core/extractNodeBaseParameters'
import { parseNomenclatureFromStructureJson } from '@/core/nodeStructureJson'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(__dirname, '..')
const nodeStructuresRoot = path.join(projectRoot, 'src', 'nodeStructures')
const packFilter = process.argv[2]?.trim()

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

function isSchemaBodyFile(relPath: string, fileName: string): boolean {
  const segments = relPath.replace(/\\/g, '/').split('/')
  if (segments.length !== 3) {
    return false
  }
  const pack = segments[0] ?? ''
  const subfolder = segments[1] ?? ''
  const stem = fileName.replace(/\.json$/i, '')
  const typeSegment = collectionTypeFromSubfolder(pack, subfolder)
  if (!typeSegment) {
    return false
  }
  return stem.localeCompare(typeSegment, undefined, { sensitivity: 'base' }) === 0
}

async function walkSchemaBodies(pack: string): Promise<string[]> {
  const packDir = path.join(nodeStructuresRoot, pack)
  const out: string[] = []

  async function walk(dir: string, rel: string): Promise<void> {
    const entries = await readdir(dir, { withFileTypes: true })
    for (const ent of entries) {
      const nextRel = rel ? `${rel}/${ent.name}` : ent.name
      const abs = path.join(dir, ent.name)
      if (ent.isDirectory()) {
        await walk(abs, nextRel)
      } else if (ent.isFile() && ent.name.endsWith('.json') && isSchemaBodyFile(nextRel, ent.name)) {
        out.push(abs)
      }
    }
  }

  await walk(packDir, pack)
  return out
}

async function regeneratePack(pack: string): Promise<void> {
  const bodies = await walkSchemaBodies(pack)
  const knownIds = new Set<string>()
  let paramCount = 0
  let embedCount = 0
  let pointerCount = 0
  let listEmbedCount = 0
  let listPointerCount = 0

  for (const absPath of bodies) {
    const rel = path.relative(nodeStructuresRoot, absPath)
    const segments = rel.replace(/\\/g, '/').split('/')
    const subfolder = segments[1] ?? ''
    const collectionType = collectionTypeFromSubfolder(pack, subfolder)
    if (!collectionType) {
      continue
    }

    const text = await readFile(absPath, 'utf8')
    const raw = JSON.parse(text) as unknown
    if (!isRecord(raw)) {
      continue
    }

    const nom = parseNomenclatureFromStructureJson(raw.nomenclature)
    const ct =
      nom?.collectionType?.trim() ||
      collectionType ||
      (typeof raw.title === 'string' ? raw.title.trim() : '')

    if (!ct) {
      continue
    }

    const dir = path.dirname(absPath)
    await mkdir(dir, { recursive: true })

    const parameters = raw.parameters
    if (Array.isArray(parameters)) {
      for (const entry of parameters) {
        if (!isRecord(entry)) {
          continue
        }
        const id = typeof entry.id === 'string' ? entry.id : ''
        const name = typeof entry.name === 'string' ? entry.name : ''
        const typ = typeof entry.type === 'string' ? entry.type : ''
        const defaultValue =
          typeof entry.defaultValue === 'string' ? entry.defaultValue : ''
        if (!id || !name || !typ) {
          continue
        }

        const stem = safeJsonStem(id)
        if (!stem) {
          continue
        }

        const payload = { id, name, type: typ, defaultValue }
        await writeFile(path.join(dir, `${stem}.json`), `${JSON.stringify(payload, null, 2)}\n`, 'utf8')
        knownIds.add(id)
        paramCount += 1
      }
    }

    for (const block of readEmbedBlocksFromSchemaJson(raw)) {
      const payload = buildNodeBaseEmbedPayload(ct, block)
      if (!payload) {
        continue
      }
      const stem = safeJsonStem(payload.id)
      if (!stem) {
        continue
      }
      await writeFile(path.join(dir, `${stem}.json`), `${JSON.stringify(payload, null, 2)}\n`, 'utf8')
      knownIds.add(payload.id)
      embedCount += 1
    }

    for (const block of readListEmbedBlocksFromSchemaJson(raw)) {
      const payload = buildNodeBaseListEmbedPayload(ct, block)
      if (!payload) {
        continue
      }
      const stem = safeJsonStem(payload.id)
      if (!stem) {
        continue
      }
      await writeFile(path.join(dir, `${stem}.json`), `${JSON.stringify(payload, null, 2)}\n`, 'utf8')
      knownIds.add(payload.id)
      listEmbedCount += 1
    }

    for (const block of readPointerBlocksFromSchemaJson(raw)) {
      const payload = buildNodeBasePointerPayload(ct, block)
      if (!payload) {
        continue
      }
      const stem = safeJsonStem(payload.id)
      if (!stem) {
        continue
      }
      await writeFile(path.join(dir, `${stem}.json`), `${JSON.stringify(payload, null, 2)}\n`, 'utf8')
      knownIds.add(payload.id)
      pointerCount += 1
    }

    for (const block of readListPointerBlocksFromSchemaJson(raw)) {
      const payload = buildNodeBaseListPointerPayload(ct, block)
      if (!payload) {
        continue
      }
      const stem = safeJsonStem(payload.id)
      if (!stem) {
        continue
      }
      await writeFile(path.join(dir, `${stem}.json`), `${JSON.stringify(payload, null, 2)}\n`, 'utf8')
      knownIds.add(payload.id)
      listPointerCount += 1
    }
  }

  const tempDir = path.join(nodeStructuresRoot, pack, 'temp')
  await mkdir(tempDir, { recursive: true })
  const ordered = [...knownIds].sort((a, b) => a.localeCompare(b))
  await writeFile(
    path.join(tempDir, 'parameters_list.json'),
    `${JSON.stringify(ordered, null, 2)}\n`,
    'utf8',
  )

  console.log(
    `${pack}: parâmetros=${String(paramCount)} embed=${String(embedCount)} pointer=${String(pointerCount)} listEmbed=${String(listEmbedCount)} listPointer=${String(listPointerCount)} lista=${String(ordered.length)}`,
  )
}

async function main(): Promise<void> {
  const packs = packFilter
    ? [packFilter]
    : (await readdir(nodeStructuresRoot, { withFileTypes: true }))
        .filter((e) => e.isDirectory())
        .map((e) => e.name)
        .filter((name) => !['default'].includes(name))

  for (const pack of packs) {
    await regeneratePack(pack)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
