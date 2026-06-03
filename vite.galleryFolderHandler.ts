import { execFile } from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'
import { promisify } from 'node:util'
import type { IncomingMessage, ServerResponse } from 'node:http'

const execFileAsync = promisify(execFile)

const GALLERY_TEXTURE_EXTENSIONS = new Set([
  '.tex',
  '.dds',
  '.dss',
  '.png',
  '.jpg',
  '.jpeg',
  '.webp',
  '.bmp',
  '.gif',
  '.tga',
])

let lastPickedRoot: string | null = null

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    req.on('data', (chunk) => chunks.push(Buffer.from(chunk)))
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    req.on('error', reject)
  })
}

function isGalleryTextureExtension(extension: string): boolean {
  return GALLERY_TEXTURE_EXTENSIONS.has(extension.toLowerCase())
}

export type GalleryPickedFile = {
  relativePath: string
  absolutePath: string
}

async function pickWindowsFolderDialog(): Promise<string | null> {
  const script = [
    'Add-Type -AssemblyName System.Windows.Forms',
    '$dialog = New-Object System.Windows.Forms.FolderBrowserDialog',
    '$dialog.Description = "Galeria — Root Folder (Raiz)"',
    '$dialog.ShowNewFolderButton = $false',
    'if ($dialog.ShowDialog() -ne [System.Windows.Forms.DialogResult]::OK) { exit 1 }',
    '[Console]::OutputEncoding = [System.Text.Encoding]::UTF8',
    'Write-Output $dialog.SelectedPath',
  ].join('; ')

  const { stdout } = await execFileAsync(
    'powershell',
    ['-NoProfile', '-Sta', '-Command', script],
    { timeout: 300_000, windowsHide: false },
  )

  const folder = stdout.trim()
  return folder || null
}

async function walkGalleryTextures(
  directory: string,
  root: string,
  output: GalleryPickedFile[],
): Promise<void> {
  const entries = await fs.readdir(directory, { withFileTypes: true })
  for (const entry of entries) {
    const absolutePath = path.join(directory, entry.name)
    if (entry.isDirectory()) {
      await walkGalleryTextures(absolutePath, root, output)
      continue
    }
    if (!entry.isFile()) {
      continue
    }
    const extension = path.extname(entry.name).toLowerCase()
    if (!GALLERY_TEXTURE_EXTENSIONS.has(extension)) {
      continue
    }
    const relativePath = path.relative(root, absolutePath).split(path.sep).join('/')
    output.push({ relativePath, absolutePath })
  }
}

export function handleGalleryNativeAvailableRequest(res: ServerResponse): void {
  res.statusCode = 200
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.end(JSON.stringify({ available: process.platform === 'win32' }))
}

export async function handleGalleryPickFolderBaseRequest(res: ServerResponse): Promise<void> {
  if (process.platform !== 'win32') {
    res.statusCode = 501
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.end(JSON.stringify({ ok: false, error: 'Seleção nativa só disponível no Windows (dev).' }))
    return
  }

  try {
    const base = await pickWindowsFolderDialog()
    if (!base) {
      res.statusCode = 204
      res.end()
      return
    }

    lastPickedRoot = path.resolve(base)

    res.statusCode = 200
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.end(JSON.stringify({ ok: true, base }))
  } catch (error) {
    res.statusCode = 500
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.end(
      JSON.stringify({
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      }),
    )
  }
}

export async function handleGalleryScanDirectoryRequest(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  if (process.platform !== 'win32') {
    res.statusCode = 501
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.end(JSON.stringify({ ok: false, error: 'Scan só disponível no Windows (dev).' }))
    return
  }

  if (!lastPickedRoot) {
    res.statusCode = 403
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.end(JSON.stringify({ ok: false, error: 'Defina Root Folder (Raiz) primeiro.' }))
    return
  }

  try {
    const raw = await readBody(req)
    const body = raw.trim() ? (JSON.parse(raw) as { directory?: string }) : {}
    const directory = String(body.directory || '').trim()
    if (!directory) {
      res.statusCode = 400
      res.end(JSON.stringify({ ok: false, error: 'Missing directory' }))
      return
    }

    const resolved = path.resolve(directory)
    if (!isPathUnderRoot(resolved, lastPickedRoot)) {
      res.statusCode = 403
      res.end(JSON.stringify({ ok: false, error: 'Path outside Root Folder' }))
      return
    }

    const stat = await fs.stat(resolved)
    const files: GalleryPickedFile[] = []

    if (stat.isFile()) {
      const extension = path.extname(resolved).toLowerCase()
      if (!isGalleryTextureExtension(extension)) {
        res.statusCode = 400
        res.end(JSON.stringify({ ok: false, error: 'Not a supported texture file' }))
        return
      }
      files.push({
        absolutePath: resolved,
        relativePath: path.basename(resolved),
      })
    } else if (stat.isDirectory()) {
      await walkGalleryTextures(resolved, resolved, files)
      files.sort((a, b) => a.relativePath.localeCompare(b.relativePath))
    } else {
      res.statusCode = 400
      res.end(JSON.stringify({ ok: false, error: 'Invalid path' }))
      return
    }

    res.statusCode = 200
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.end(
      JSON.stringify({
        ok: true,
        base: stat.isDirectory() ? resolved : path.dirname(resolved),
        files,
      }),
    )
  } catch (error) {
    res.statusCode = 500
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.end(
      JSON.stringify({
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      }),
    )
  }
}

export async function handleGalleryPickFolderRequest(res: ServerResponse): Promise<void> {
  if (process.platform !== 'win32') {
    res.statusCode = 501
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.end(JSON.stringify({ ok: false, error: 'Seleção nativa só disponível no Windows (dev).' }))
    return
  }

  try {
    const base = await pickWindowsFolderDialog()
    if (!base) {
      res.statusCode = 204
      res.end()
      return
    }

    const files: GalleryPickedFile[] = []
    await walkGalleryTextures(base, base, files)
    files.sort((a, b) => a.relativePath.localeCompare(b.relativePath))

    lastPickedRoot = path.resolve(base)

    res.statusCode = 200
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.end(
      JSON.stringify({
        ok: true,
        base,
        files,
      }),
    )
  } catch (error) {
    res.statusCode = 500
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.end(
      JSON.stringify({
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      }),
    )
  }
}

export async function handleGalleryFileRequest(
  filePathParam: string | null,
  res: ServerResponse,
): Promise<void> {
  if (!filePathParam?.trim()) {
    res.statusCode = 400
    res.end('Missing path')
    return
  }

  if (!lastPickedRoot) {
    res.statusCode = 403
    res.end('No gallery folder picked in this session')
    return
  }

  let decoded = filePathParam
  try {
    decoded = decodeURIComponent(filePathParam)
  } catch {
    decoded = filePathParam
  }

  const resolved = path.resolve(decoded)
  if (!isPathUnderRoot(resolved, lastPickedRoot)) {
    res.statusCode = 403
    res.end('Path outside last picked folder')
    return
  }

  try {
    const data = await fs.readFile(resolved)
    res.statusCode = 200
    res.setHeader('Content-Type', 'application/octet-stream')
    res.end(data)
  } catch (error) {
    res.statusCode = 500
    res.end(error instanceof Error ? error.message : String(error))
  }
}

function isPathUnderRoot(filePath: string, root: string): boolean {
  const resolvedFile = path.resolve(filePath)
  const resolvedRoot = path.resolve(root)
  return (
    resolvedFile === resolvedRoot ||
    resolvedFile.startsWith(resolvedRoot + path.sep) ||
    resolvedFile.startsWith(resolvedRoot + '/')
  )
}
