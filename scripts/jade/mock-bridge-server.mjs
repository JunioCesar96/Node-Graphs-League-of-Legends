/**
 * Servidor minimalista para desenvolvimento — POST /convert (ritobin texto) e POST /convert-tree (BinTree JSON).
 * Jade real expõe conversão via Tauri; este mock serve apenas para desenvolvimento com `pnpm jade-bridge:dev`.
 *
 * Arranque: pnpm run jade-bridge:dev (porta configurável PORT=8788)
 *
 * POST /convert-tree com `JADE_CONVERT_TREE_BINARY` (caminho absoluto para `jade-export-bintree-json`:
 * faz parse real `.bin` → JSON stdout).
 */
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import http from 'node:http'
import os from 'node:os'
import path from 'node:path'

const PORT = Number.parseInt(process.env.PORT ?? '', 10) || 8788

const SAMPLE_PREFIX = `# Placeholder desde mock-bridge-server.mjs — substituir pela saída real de Jade (ritobin text).
`

const pathAlpha = 3735928559
const pathBeta = 111222333

/** Fixture mínimo + ObjectLink dentro de Container (cenário Jade típico) para desenvolvimento. */
const MOCK_BIN_TREE_SAMPLE = JSON.stringify({
  dependencies: [`mock_dep_${Math.floor(Date.now() / 86400000)}.bin.lua`],
  is_override: false,
  objects: {
    [String(pathAlpha)]: {
      class_hash: 2899102084,
      path_hash: pathAlpha,
      properties: {},
    },
    [String(pathBeta)]: {
      class_hash: 444555666,
      path_hash: pathBeta,
      properties: {
        '50': {
          kind: 'Container',
          name_hash: 50,
          value: {
            item_kind: 'ObjectLink',
            items: [{ kind: 'ObjectLink', value: pathAlpha }],
          },
        },
      },
    },
  },
  version: 3,
})

function invokeJadeExportBintreeJson(uploadBytes) {
  const binaryResolved = process.env.JADE_CONVERT_TREE_BINARY?.trim()

  if (!binaryResolved || !fs.existsSync(binaryResolved)) {
    return null
  }

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'jade-upload-'))
  const tempFilePath = path.join(tempDir, 'upload.bin')

  try {
    fs.writeFileSync(tempFilePath, uploadBytes)

    const prettyCli = !(process.env.JADE_BINTREE_JSON_COMPACT === '1')

    const spawnOptions = {
      encoding: 'utf8',
      maxBuffer: Math.min(480 * 1024 * 1024, Number.MAX_SAFE_INTEGER),
      shell: false,
      windowsHide: true,
    }

    const args = []

    if (!prettyCli) {
      args.push('--compact')
    }

    args.push(tempFilePath)

    const spawned = spawnSync(binaryResolved, args, spawnOptions)

    if ((spawned.error && typeof spawned.error.message === 'string') || spawned.status !== 0) {
      const stderrText = spawned.stderr ?? ''
      const errMsg = spawned.error?.message ?? `exit ${spawned.status}`
      throw new Error(
        `CLI jade-export-bintree-json: ${String(errMsg)} ${String(stderrText).slice(0, 400)}`.trim(),
      )
    }

    const output = typeof spawned.stdout === 'string' ? spawned.stdout : ''

    if (output.trim().length === 0) {
      throw new Error('CLI jade-export-bintree-json retornou stdout vazio')
    }

    return output
  } finally {
    fs.rmSync(tempDir, { force: true, recursive: true })
  }
}

async function collectRequestBody(request) {
  const chunks = []

  for await (const chunk of request) {
    chunks.push(chunk instanceof Buffer ? chunk : Buffer.from(chunk))
  }

  return Buffer.concat(chunks)
}

const server = http.createServer(async (incomingRequest, serverResponse) => {
  serverResponse.setHeader('Access-Control-Allow-Origin', '*')

  if (incomingRequest.method === 'OPTIONS') {
    serverResponse.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
    serverResponse.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Original-Filename')
    serverResponse.writeHead(204)
    serverResponse.end()
    return
  }

  const rawPath = incomingRequest.url?.split('?')[0] ?? '/'
  const urlPath = rawPath.replace(/\/+$/, '') || '/'

  if (incomingRequest.method === 'GET' && urlPath === '/capabilities') {
    serverResponse.setHeader('Content-Type', 'application/json; charset=utf-8')
    serverResponse.writeHead(200)
    serverResponse.end(
      JSON.stringify({
        ok: true,
        provider: 'mock-bridge',
        features: {
          convertToBin: false,
          unhashText: false,
          hashPreload: false,
        },
      }),
    )
    return
  }

  if (incomingRequest.method === 'GET' && (urlPath === '/' || urlPath === '/health')) {
    serverResponse.setHeader('Content-Type', 'text/plain; charset=utf-8')
    serverResponse.writeHead(200)
    serverResponse.end(
      'jade-bin-bridge mock — POST /convert (octet-stream → ritobin text), POST /convert-tree (→ BinTree jsonText)\n',
    )
    return
  }

  if (incomingRequest.method === 'GET' && urlPath === '/convert') {
    serverResponse.setHeader('Content-Type', 'text/plain; charset=utf-8')
    serverResponse.setHeader('Allow', 'OPTIONS, POST')
    serverResponse.writeHead(405)
    serverResponse.end(
      `Este URL só aceita POST com o body em octet-stream (bytes do .bin).\n` +
        `Não abras isto no browser como página — usa node-graphs-lol:\n` +
        `  File → Open… → escolher o .bin (com bridge activo).\n`,
    )
    return
  }

  if (incomingRequest.method === 'POST' && urlPath === '/unhash-text') {
    serverResponse.setHeader('Content-Type', 'application/json; charset=utf-8')
    serverResponse.writeHead(404)
    serverResponse.end(
      JSON.stringify({
        ok: false,
        message: 'Mock bridge — use npm run jade:http-bridge:build para /unhash-text real',
      }),
    )
    return
  }

  const allowedPosts = ['/convert', '/convert-tree']

  if (incomingRequest.method !== 'POST' || !allowedPosts.includes(urlPath)) {
    serverResponse.setHeader('Content-Type', 'application/json; charset=utf-8')
    serverResponse.writeHead(404)
    serverResponse.end(JSON.stringify({ message: `use POST /convert ou POST /convert-tree`, ok: false }))
    return
  }

  try {
    const uploaded = await collectRequestBody(incomingRequest)
    serverResponse.setHeader('Content-Type', 'application/json; charset=utf-8')

    let bodyJson

    if (urlPath === '/convert-tree') {
      let resolvedJsonText = MOCK_BIN_TREE_SAMPLE
      /** @type {boolean} */
      let viaCli = false
      /** @type {boolean} */
      let cliError = false
      /** @type {string} */
      let cliMessageHint = ''

      try {
        const candidate = invokeJadeExportBintreeJson(uploaded)

        if (candidate !== null) {
          resolvedJsonText = candidate
          viaCli = true
        }
      } catch (caught) {
        cliError = true
        cliMessageHint = caught instanceof Error ? caught.message : String(caught)
      }

      if (cliError && process.env.JADE_CONVERT_TREE_BINARY?.trim()) {
        serverResponse.writeHead(502)
        serverResponse.end(
          JSON.stringify({
            message: cliMessageHint || 'CLI jade-export-bintree-json falhou (verifique o caminho e permissões)',
            ok: false,
          }),
        )

        return
      }

      bodyJson = {
        byteLengthEcho: uploaded.byteLength,
        cliError,
        ...(cliMessageHint ? { cliMessageHint } : {}),
        filename: incomingRequest.headers['x-original-filename'] ?? '?',
        jsonText: resolvedJsonText,
        mock: !viaCli,
        ok: true,
        ...(viaCli ? { viaRustCli: true } : {}),
      }
    } else {
      bodyJson = {
        mock: true,
        ok: true,
        text: `${SAMPLE_PREFIX}# nome: ${incomingRequest.headers['x-original-filename'] ?? '?'}
# bytes: ${uploaded.byteLength}\n`,
      }
    }

    serverResponse.writeHead(200)
    serverResponse.end(JSON.stringify(bodyJson))
  } catch {
    serverResponse.setHeader('Content-Type', 'application/json; charset=utf-8')
    serverResponse.writeHead(500)
    serverResponse.end(JSON.stringify({ message: 'falha interna ao ler pedido', ok: false }))
  }
})

server.listen(PORT, '127.0.0.1', () => {
  process.stderr.write(
    `[jade-bin-bridge mock] listening on http://127.0.0.1:${PORT}/convert and /convert-tree\n`,
  )

  const hint = process.env.JADE_CONVERT_TREE_BINARY?.trim()

  if (hint) {
    process.stderr.write(`[jade-bin-bridge mock] JADE_CONVERT_TREE_BINARY=${hint}\n`)
  }
})
