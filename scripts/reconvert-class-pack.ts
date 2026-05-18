/**
 * Re-converte o pack `class` a partir de `estrutura_bin.py` e remove artefactos órfãos.
 * Uso: npx vite-node scripts/reconvert-class-pack.ts
 */

import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { convertRitualTextClassGroup } from '@/core/convertRitualTextToNodeStructures'
import type { NodeSchemaDefinition } from '@/core/nodeSchema'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(__dirname, '..')
const packFolder = process.argv[2]?.trim() || 'class'
const targetDir = path.join(projectRoot, 'src', 'nodeStructures', packFolder)
const sourcePath = path.join(projectRoot, 'estrutura_bin.py')

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

function resolveWritePath(
  item: NodeSchemaDefinition,
  rootSchemaIdSet: Set<string>,
): { absPath: string; relLabel: string } | null {
  const stem = safeJsonStem(item.id)
  if (!stem) {
    return null
  }

  const titleRaw = item.title.trim()
  const typeDirSegment = safeCollectionTypeDirSegment(titleRaw || stem)
  const isRootEntity = rootSchemaIdSet.size === 0 ? true : rootSchemaIdSet.has(item.id.trim())

  if (isRootEntity) {
    const fileName = `${stem}.json`
    return {
      absPath: path.join(targetDir, fileName),
      relLabel: fileName,
    }
  }

  const subDirName = `${packFolder}_${typeDirSegment}`
  const fileName = `${typeDirSegment}.json`
  return {
    absPath: path.join(targetDir, subDirName, fileName),
    relLabel: `${subDirName}/${fileName}`,
  }
}

async function collectJsonFiles(dir: string): Promise<string[]> {
  const out: string[] = []
  let entries: { name: string; isDirectory: () => boolean }[]

  try {
    entries = await readdir(dir, { withFileTypes: true })
  } catch {
    return out
  }

  for (const ent of entries) {
    const full = path.join(dir, ent.name)
    if (ent.isDirectory()) {
      out.push(...(await collectJsonFiles(full)))
    } else if (ent.name.endsWith('.json')) {
      out.push(full)
    }
  }

  return out
}

async function main(): Promise<void> {
  const raw = await readFile(sourcePath, 'utf8')
  const converted = convertRitualTextClassGroup(raw)

  if (!converted.ok) {
    console.error('Conversão falhou:', converted.error)
    process.exit(1)
  }

  const rootSchemaIdSet = new Set(converted.rootSchemaIds ?? [])
  const writtenPaths = new Set<string>()
  const writtenLabels: string[] = []

  await mkdir(targetDir, { recursive: true })

  for (const schema of converted.schemas) {
    const resolved = resolveWritePath(schema, rootSchemaIdSet)
    if (!resolved) {
      console.warn('Ignorado schema sem stem válido:', schema.id)
      continue
    }

    await mkdir(path.dirname(resolved.absPath), { recursive: true })
    await writeFile(resolved.absPath, `${JSON.stringify(schema, null, 2)}\n`, 'utf8')
    writtenPaths.add(path.resolve(resolved.absPath))
    writtenLabels.push(resolved.relLabel)
  }

  const existing = await collectJsonFiles(targetDir)
  let removed = 0

  for (const file of existing) {
    const abs = path.resolve(file)
    const base = path.basename(abs).toLowerCase()

    if (/_mflags\.json$/i.test(base)) {
      await rm(abs, { force: true })
      removed += 1
      continue
    }

    if (!writtenPaths.has(abs)) {
      await rm(abs, { force: true })
      removed += 1
    }
  }

  const tempDir = path.join(targetDir, 'temp')
  await rm(tempDir, { recursive: true, force: true })

  console.log(`Schemas escritos: ${String(writtenLabels.length)}`)
  console.log(`Entidades raiz: ${String(rootSchemaIdSet.size)}`)
  console.log(`Ficheiros removidos (órfãos/mflags/temp): ${String(removed)}`)
  if (converted.warnings.length > 0) {
    console.log('Avisos (primeiros 5):')
    for (const w of converted.warnings.slice(0, 5)) {
      console.log(' -', w)
    }
  }
}

main().catch((err: unknown) => {
  console.error(err)
  process.exit(1)
})
