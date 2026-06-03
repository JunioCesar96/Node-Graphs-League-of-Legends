import fs from 'node:fs'
import path from 'node:path'

import type { IncomingMessage, ServerResponse } from 'node:http'

import type { Connect } from 'vite'
import type { Plugin } from 'vite'

import { normalizeApiPathname } from './vite.devApiPath'

const TEXTURE_EXTS = new Set(['.tex', '.dds'])

function sendJson(res: ServerResponse, status: number, data: unknown) {
  const body = JSON.stringify(data)
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Content-Length', Buffer.byteLength(body))
  res.end(body)
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    req.on('data', (chunk) => chunks.push(Buffer.from(chunk)))
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    req.on('error', reject)
  })
}

function safeBaseName(name: string): string {
  const cleaned = String(name || 'model')
    .toLowerCase()
    .replace(/[^\w\-]+/g, '_')
    .replace(/^_+|_+$/g, '')
  return cleaned.slice(0, 64) || 'model'
}

function parseSknMaterialNames(sknBuffer: Buffer): string[] {
  if (sknBuffer.length < 8 || sknBuffer.readUInt32LE(0) !== 0x00112233) return ['Base']
  const major = sknBuffer.readUInt16LE(4)
  if (major === 0) return ['Base']
  const submeshCount = sknBuffer.readUInt32LE(8)
  const names: string[] = []
  let off = 12
  for (let i = 0; i < submeshCount; i++) {
    if (off + 80 > sknBuffer.length) break
    const name = sknBuffer.slice(off, off + 64).toString('utf8').replace(/\0/g, '').trim()
    names.push(name || `Material_${i}`)
    off += 80
  }
  return names.length ? names : ['Base']
}

function scanModelsDir(modelsDir: string) {
  fs.mkdirSync(modelsDir, { recursive: true })
  const files = fs.readdirSync(modelsDir)
  const byName = new Map<string, { baseName: string; format: string }>()

  files.forEach((file) => {
    const lower = file.toLowerCase()
    if (lower.endsWith('.glb') || lower.endsWith('.gltf')) {
      const baseName = path.basename(file, path.extname(file))
      byName.set(baseName, { baseName, format: 'gltf' })
    }
  })

  const models = [...byName.values()]
  models.sort((a, b) =>
    a.baseName.localeCompare(b.baseName, undefined, { numeric: true, sensitivity: 'base' }),
  )

  return { models, count: models.length }
}

function safeGltfFileName(fileName: string): string | null {
  const base = path.basename(String(fileName || ''))
  if (!base || base.includes('..') || base.includes('/') || base.includes('\\')) return null
  const lower = base.toLowerCase()
  if (!lower.endsWith('.glb') && !lower.endsWith('.gltf')) return null
  return base
}

export function vitePluginCharacterGltf(projectRoot: string): Plugin {
  const modelsDir = path.join(projectRoot, 'character-gltf')
  const texturesDir = path.join(projectRoot, 'character-gltf-textures')

  let lol2gltfRunner: typeof import('./scripts/lol2gltfRunner.mjs') | null = null

  async function loadRunner() {
    if (!lol2gltfRunner) {
      lol2gltfRunner = await import('./scripts/lol2gltfRunner.mjs')
    }
    return lol2gltfRunner
  }

  function saveTextureFile(relFolder: string, fileName: string, buffer: Buffer) {
    const folder = safeBaseName(relFolder || 'misc')
    const base = path.basename(String(fileName || 'texture.dds'))
    const ext = path.extname(base).toLowerCase()
    const safeName = safeBaseName(path.basename(base, ext)) + (TEXTURE_EXTS.has(ext) ? ext : '.dds')
    const outDir = path.join(texturesDir, folder)
    fs.mkdirSync(outDir, { recursive: true })
    const outPath = path.join(outDir, safeName)
    fs.writeFileSync(outPath, buffer)
    return { relPath: path.join('character-gltf-textures', folder, safeName), path: outPath }
  }

  const middleware: Connect.NextHandleFunction = (req, res, next) => {
    const pathname = normalizeApiPathname(req.url)

    if (pathname === '/api/character-gltf/health' && req.method === 'GET') {
      void loadRunner().then((runner) => {
        sendJson(res, 200, { ok: true, lol2gltf: runner.getStatus(projectRoot) })
      })
      return
    }

    if (pathname === '/api/character-gltf/list' && req.method === 'GET') {
      sendJson(res, 200, scanModelsDir(modelsDir))
      return
    }

    const serveMatch = pathname.match(/^\/api\/character-gltf\/([^/]+)$/)
    if (serveMatch && req.method === 'GET') {
      const safeName = safeGltfFileName(decodeURIComponent(serveMatch[1] ?? ''))
      if (!safeName) {
        sendJson(res, 400, { error: 'Nome de ficheiro inválido.' })
        return
      }
      const filePath = path.join(modelsDir, safeName)
      if (!filePath.startsWith(modelsDir) || !fs.existsSync(filePath)) {
        res.statusCode = 404
        res.end('Not found')
        return
      }
      const ext = path.extname(filePath).toLowerCase()
      res.statusCode = 200
      res.setHeader('Content-Type', ext === '.glb' ? 'model/gltf-binary' : 'model/gltf+json')
      fs.createReadStream(filePath).pipe(res)
      return
    }

    if (pathname === '/api/character-gltf/convert' && req.method === 'POST') {
      void (async () => {
        try {
          const runner = await loadRunner()
          const status = runner.getStatus(projectRoot)
          if (!status.available) {
            sendJson(res, 503, {
              error: 'lol2gltf não encontrado. Veja tools/lol2gltf/LEIA-ME.txt',
              lol2gltf: status,
              code: 'LOL2GLTF_NOT_FOUND',
            })
            return
          }

          const raw = await readBody(req)
          const payload = JSON.parse(raw || '{}') as {
            skn?: string
            skl?: string
            sknName?: string
            sklName?: string
            champion?: string
            baseName?: string
            anmFiles?: { name?: string; data?: string }[]
            texture?: { name?: string; data?: string }
          }

          const sknB64 = payload.skn
          const sklB64 = payload.skl
          if (!sknB64 || !sklB64) {
            sendJson(res, 400, { error: 'Campos skn e skl são obrigatórios.' })
            return
          }

          const baseName = payload.baseName
            ? runner.safeBaseName(payload.baseName)
            : payload.champion
              ? runner.championToGltfBaseName(payload.champion)
              : runner.championToGltfBaseName(payload.sknName || 'model')

          const anmFiles = (payload.anmFiles || []).map((f) => ({
            name: f.name || 'anim.anm',
            buffer: Buffer.from(f.data ?? '', 'base64'),
          }))

          const sknBuffer = Buffer.from(sknB64, 'base64')
          let texturePathForTool: string | null = null
          let textureRel: string | null = null

          if (payload.texture?.data) {
            const saved = saveTextureFile(
              baseName,
              payload.texture.name || 'texture.dds',
              Buffer.from(payload.texture.data, 'base64'),
            )
            texturePathForTool = saved.path
            textureRel = saved.relPath
          }

          const materialNames = texturePathForTool ? parseSknMaterialNames(sknBuffer) : []

          const result = await runner.convertSknToGlb({
            projectRoot,
            modelsDir,
            sknBuffer,
            sknName: payload.sknName || 'model.skn',
            sklBuffer: Buffer.from(sklB64, 'base64'),
            sklName: payload.sklName || 'model.skl',
            anmFiles,
            baseName,
            materialNames,
            texturePath: texturePathForTool,
          })

          sendJson(res, 200, {
            baseName: result.baseName,
            glb: result.glbRel,
            animCount: result.animCount,
            tool: result.tool,
            texture: textureRel,
          })
        } catch (err) {
          const error = err as Error & { code?: string }
          if (error.code === 'LOL2GLTF_NOT_FOUND') {
            const runner = await loadRunner()
            sendJson(res, 503, {
              error: 'lol2gltf não encontrado. Veja tools/lol2gltf/LEIA-ME.txt',
              lol2gltf: runner.getStatus(projectRoot),
              code: 'LOL2GLTF_NOT_FOUND',
            })
            return
          }
          sendJson(res, 500, { error: error.message || 'Erro ao converter com lol2gltf.' })
        }
      })()
      return
    }

    next()
  }

  return {
    name: 'character-gltf',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use(middleware)
      void loadRunner().then((runner) => {
        const status = runner.getStatus(projectRoot)
        if (status.available) {
          console.log(`[character-gltf] lol2gltf: ${status.path}`)
        } else {
          console.log('[character-gltf] lol2gltf não encontrado — veja tools/lol2gltf/LEIA-ME.txt')
        }
        console.log(`[character-gltf] modelos em ${modelsDir}`)
      })
    },
  }
}
