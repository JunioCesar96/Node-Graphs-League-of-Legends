import type { IncomingMessage, ServerResponse } from 'node:http'
import fs from 'node:fs/promises'
import path from 'node:path'

import { isInputAddonManifest } from './vite.inputAddonsListHandler'

const MAX_BODY_BYTES = 64 * 1024 * 1024

type InstallFileEntry = {
  path: string
  content: string
  binary?: boolean
}

type InstallPayload = {
  files?: InstallFileEntry[]
}

function sendJson(res: ServerResponse, statusCode: number, body: unknown): void {
  res.statusCode = statusCode
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.end(JSON.stringify(body))
}

async function readRequestBody(req: IncomingMessage, maxBytes = MAX_BODY_BYTES): Promise<Buffer> {
  const chunks: Buffer[] = []
  let size = 0

  for await (const chunk of req) {
    const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
    size += buf.length
    if (size > maxBytes) {
      throw new Error('Payload demasiado grande.')
    }
    chunks.push(buf)
  }

  return Buffer.concat(chunks)
}

function safeRelativePath(relativePath: string): boolean {
  const normalized = path.posix.normalize(relativePath.replace(/\\/g, '/'))
  if (normalized === '.' || normalized.startsWith('../') || normalized.includes('/../')) {
    return false
  }
  return normalized.length > 0 && normalized.length <= 260
}

function safeInputAddonId(id: string): boolean {
  return /^[a-z0-9_-]+$/.test(id) && id.length > 0 && id.length <= 120
}

async function updateInputAddonsIndex(inputAddonsRoot: string, inputAddonId: string): Promise<void> {
  const indexPath = path.resolve(inputAddonsRoot, 'index.json')
  let ids: string[] = []

  try {
    const raw = JSON.parse(await fs.readFile(indexPath, 'utf8')) as unknown
    if (Array.isArray(raw)) {
      ids = raw.filter((entry): entry is string => typeof entry === 'string' && entry.trim() !== '')
    }
  } catch {
    ids = []
  }

  if (!ids.includes(inputAddonId)) {
    ids.push(inputAddonId)
    ids.sort((left, right) => left.localeCompare(right))
    await fs.writeFile(indexPath, `${JSON.stringify(ids, null, 2)}\n`, 'utf8')
  }
}

export function handleInputAddonsInstallAvailableRequest(res: ServerResponse): void {
  sendJson(res, 200, { ok: true })
}

export async function handleInputAddonsInstallRequest(
  projectRoot: string,
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  try {
    const body = await readRequestBody(req)
    const payload = JSON.parse(body.toString('utf8')) as InstallPayload
    const files = payload.files

    if (!Array.isArray(files) || files.length === 0) {
      sendJson(res, 400, { ok: false, error: 'Nenhum ficheiro recebido.' })
      return
    }

    const manifestEntry = files.find((entry) => entry.path.replace(/\\/g, '/') === 'manifest.json')
    if (!manifestEntry) {
      sendJson(res, 400, { ok: false, error: 'manifest.json não encontrado na raiz do input add-on.' })
      return
    }

    let manifestRaw: unknown
    try {
      manifestRaw = JSON.parse(manifestEntry.content) as unknown
    } catch {
      sendJson(res, 400, { ok: false, error: 'manifest.json inválido.' })
      return
    }

    if (!isInputAddonManifest(manifestRaw)) {
      sendJson(res, 400, { ok: false, error: 'manifest.json não cumpre o schema de input add-on.' })
      return
    }

    const inputAddonId = manifestRaw.id.trim()
    if (!safeInputAddonId(inputAddonId)) {
      sendJson(res, 400, { ok: false, error: 'ID do input add-on inválido.' })
      return
    }

    const inputAddonsRoot = path.resolve(projectRoot, 'public', 'inputAddons')
    const relFromProject = path.relative(projectRoot, inputAddonsRoot)
    if (relFromProject.startsWith('..') || path.isAbsolute(relFromProject)) {
      sendJson(res, 400, { ok: false, error: 'Pasta inputAddons inválida.' })
      return
    }

    const targetDir = path.resolve(inputAddonsRoot, inputAddonId)
    const relTarget = path.relative(inputAddonsRoot, targetDir)
    if (relTarget.startsWith('..') || path.isAbsolute(relTarget)) {
      sendJson(res, 400, { ok: false, error: 'Destino de instalação inválido.' })
      return
    }

    await fs.mkdir(targetDir, { recursive: true })

    for (const entry of files) {
      if (typeof entry.path !== 'string' || typeof entry.content !== 'string') {
        sendJson(res, 400, { ok: false, error: 'Entrada de ficheiro inválida.' })
        return
      }

      const relativePath = entry.path.replace(/\\/g, '/')
      if (!safeRelativePath(relativePath)) {
        sendJson(res, 400, { ok: false, error: `Caminho inválido: ${relativePath}` })
        return
      }

      const filePath = path.resolve(targetDir, relativePath)
      const relFile = path.relative(targetDir, filePath)
      if (relFile.startsWith('..') || path.isAbsolute(relFile)) {
        sendJson(res, 400, { ok: false, error: `Caminho inválido: ${relativePath}` })
        return
      }

      await fs.mkdir(path.dirname(filePath), { recursive: true })
      const buffer = entry.binary ? Buffer.from(entry.content, 'base64') : Buffer.from(entry.content, 'utf8')
      await fs.writeFile(filePath, buffer)
    }

    await updateInputAddonsIndex(inputAddonsRoot, inputAddonId)

    sendJson(res, 200, {
      ok: true,
      manifest: manifestRaw,
      installedPath: path.join('public', 'inputAddons', inputAddonId),
    })
  } catch (err) {
    sendJson(res, 500, {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    })
  }
}
