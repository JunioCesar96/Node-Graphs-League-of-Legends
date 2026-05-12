/**
 * Ponte localhost que invoca um executável ritobin/LeagueToolkit (configurável) sobre bytes RAW `.bin`.
 * Segurança: escuta apenas 127.0.0.1. O caminho do .exe pode vir do header `X-Ritobin-Exe` ou de `RITOBIN_EXE_DEFAULT`.
 *
 * Contrato compatível com o frontend Jade `POST /convert`:
 * - Body: application/octet-stream (ficheiro .bin)
 * - Resposta: `{ ok: true, text: string }` | `{ ok: false, message: string }`
 *
 * Variáveis:
 * - PORT (default 8791)
 * - RITOBIN_EXE_DEFAULT — opcional fallback se falta header
 * - RITOBIN_INPUT_MODE — `file` (default): grava temp + passa caminho nos args · `stdin`: envia body no stdin do processo
 * - RITOBIN_ARGS_BEFORE / RITOBIN_ARGS_AFTER — JSON array de strings (ex.: '["decode"]')
 */

import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import http from 'node:http'
import os from 'node:os'
import path from 'node:path'

const PORT = Number.parseInt(process.env.PORT ?? '', 10) || 8791

const INPUT_MODE = (process.env.RITOBIN_INPUT_MODE ?? 'file').trim().toLowerCase()

/** @returns {unknown[]} */
function parseArgList(rawEnv, fallback) {
  const raw = rawEnv?.trim()

  if (!raw) {
    return [...fallback]
  }

  try {
    const decoded = JSON.parse(raw)

    if (!Array.isArray(decoded)) {
      return [...fallback]
    }

    const flat = decoded.map((candidate) =>
      typeof candidate === 'number' ? String(candidate) : String(candidate),
    )

    return flat
  } catch {
    return [...fallback]
  }
}

async function drainRequest(request) {
  const chunks = []

  for await (const chunk of request) {
    chunks.push(chunk instanceof Buffer ? chunk : Buffer.from(chunk))
  }

  return Buffer.concat(chunks)
}

/** @returns {spawnSync.SyncReturnType<string>?} */
function runExeWithStdin(exePath, argvBefore, argvAfter, uploaded) {
  const argv = [exePath, ...argvBefore, ...argvAfter].filter((segment) => segment.length > 0)

  return spawnSync(argv[0], argv.slice(1), {
    encoding: 'utf8',
    input: uploaded,
    maxBuffer: 512 * 1024 * 1024,
    shell: false,
    windowsHide: true,
  })
}

/** @returns {spawnSync.SyncReturnType<string>?} */
function runExeWithTempFile(exePath, argvBefore, argvAfter, uploaded) {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ritobin-in-'))
  const tempFile = path.join(tempDir, 'input.bin')

  try {
    fs.writeFileSync(tempFile, uploaded)

    const argv = [exePath, ...argvBefore, tempFile, ...argvAfter].filter((segment) => segment.length > 0)

    return spawnSync(argv[0], argv.slice(1), {
      encoding: 'utf8',
      maxBuffer: 512 * 1024 * 1024,
      shell: false,
      windowsHide: true,
    })
  } finally {
    fs.rmSync(tempDir, { force: true, recursive: true })
  }
}

const server = http.createServer(async (incomingRequest, serverResponse) => {
  serverResponse.setHeader('Access-Control-Allow-Origin', '*')

  if (incomingRequest.method === 'OPTIONS') {
    serverResponse.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
    serverResponse.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Original-Filename, X-Ritobin-Exe')
    serverResponse.writeHead(204)
    serverResponse.end()
    return
  }

  const rawPath = incomingRequest.url?.split('?')[0] ?? '/'
  const urlPath = rawPath.replace(/\/+$/, '') || '/'

  if (incomingRequest.method === 'GET' && (urlPath === '/' || urlPath === '/health')) {
    serverResponse.setHeader('Content-Type', 'text/plain; charset=utf-8')
    serverResponse.writeHead(200)
    serverResponse.end(
      'ritobin-invoke — POST /convert (octet-stream) + header X-Ritobin-Exe ou RITOBIN_EXE_DEFAULT\n',
    )
    return
  }

  if (incomingRequest.method !== 'POST' || urlPath !== '/convert') {
    serverResponse.setHeader('Content-Type', 'application/json; charset=utf-8')
    serverResponse.writeHead(404)
    serverResponse.end(JSON.stringify({ message: 'use POST /convert', ok: false }))
    return
  }

  const headerExe = incomingRequest.headers['x-ritobin-exe']
  const headerResolved = Array.isArray(headerExe) ? headerExe[0] : headerExe
  const exePath = (headerResolved ?? process.env.RITOBIN_EXE_DEFAULT ?? '').trim()

  if (!exePath || !fs.existsSync(exePath)) {
    serverResponse.setHeader('Content-Type', 'application/json; charset=utf-8')
    serverResponse.writeHead(400)
    serverResponse.end(
      JSON.stringify({
        message:
          'Defina X-Ritobin-Exe (caminho absoluto) ou RITOBIN_EXE_DEFAULT e confirme que o ficheiro existe.',
        ok: false,
      }),
    )
    return
  }

  try {
    const uploaded = await drainRequest(incomingRequest)

    if (uploaded.byteLength === 0) {
      serverResponse.setHeader('Content-Type', 'application/json; charset=utf-8')
      serverResponse.writeHead(400)
      serverResponse.end(JSON.stringify({ message: 'body vazio', ok: false }))
      return
    }

    const before = parseArgList(process.env.RITOBIN_ARGS_BEFORE, [])
    const after = parseArgList(process.env.RITOBIN_ARGS_AFTER, [])

    const spawned =
      INPUT_MODE === 'stdin'
        ? runExeWithStdin(exePath, before, after, uploaded)
        : runExeWithTempFile(exePath, before, after, uploaded)

    if (!spawned) {
      serverResponse.setHeader('Content-Type', 'application/json; charset=utf-8')
      serverResponse.writeHead(500)
      serverResponse.end(JSON.stringify({ message: 'spawn falhou', ok: false }))
      return
    }

    if (spawned.error) {
      serverResponse.setHeader('Content-Type', 'application/json; charset=utf-8')
      serverResponse.writeHead(500)
      serverResponse.end(
        JSON.stringify({
          message: spawned.error.message ?? String(spawned.error),
          ok: false,
        }),
      )
      return
    }

    if (spawned.status !== 0) {
      const stderrShort = (spawned.stderr ?? '').toString().slice(0, 4000)

      serverResponse.setHeader('Content-Type', 'application/json; charset=utf-8')
      serverResponse.writeHead(422)
      serverResponse.end(
        JSON.stringify({
          message: `exit ${String(spawned.status)}: ${stderrShort || '(sem stderr)'}`,
          ok: false,
        }),
      )
      return
    }

    const text = typeof spawned.stdout === 'string' ? spawned.stdout : ''

    serverResponse.setHeader('Content-Type', 'application/json; charset=utf-8')
    serverResponse.writeHead(200)
    serverResponse.end(
      JSON.stringify({
        byteLengthEcho: uploaded.byteLength,
        filename: incomingRequest.headers['x-original-filename'] ?? '?',
        mock: false,
        ok: true,
        text,
        viaRitobinExe: true,
      }),
    )
  } catch (caught) {
    serverResponse.setHeader('Content-Type', 'application/json; charset=utf-8')
    serverResponse.writeHead(500)
    serverResponse.end(
      JSON.stringify({
        message: caught instanceof Error ? caught.message : String(caught),
        ok: false,
      }),
    )
  }
})

server.listen(PORT, '127.0.0.1', () => {
  process.stderr.write(
    `[ritobin-invoke] http://127.0.0.1:${PORT}/convert  (X-Ritobin-Exe ou RITOBIN_EXE_DEFAULT; mode=${INPUT_MODE})\n`,
  )
})
