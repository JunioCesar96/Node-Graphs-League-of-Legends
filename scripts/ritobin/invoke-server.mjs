/**
 * Ponte localhost Nativa — invoca executável Ritobin/League Toolkit configurável pelo utilizador.
 *
 * Endpoints:
 * - GET  /capabilities
 * - POST /convert         — body octet-stream (.bin) → { ok, text }
 * - POST /convert-to-bin  — body JSON { text } → { ok, bytesBase64, byteLength }
 *
 * Headers: X-Ritobin-Exe (caminho absoluto) ou RITOBIN_EXE_DEFAULT
 *
 * Env decode: RITOBIN_ARGS_BEFORE, RITOBIN_ARGS_AFTER, RITOBIN_INPUT_MODE=file|stdin
 * Env encode: RITOBIN_ENCODE_ARGS_BEFORE, RITOBIN_ENCODE_ARGS_AFTER
 */

import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import http from 'node:http'
import os from 'node:os'
import path from 'node:path'

const PORT = Number.parseInt(process.env.PORT ?? '', 10) || 8791
const INPUT_MODE = (process.env.RITOBIN_INPUT_MODE ?? 'file').trim().toLowerCase()

function parseArgList(rawEnv, fallback) {
  const raw = rawEnv?.trim()
  if (!raw) return [...fallback]
  try {
    const decoded = JSON.parse(raw)
    if (!Array.isArray(decoded)) return [...fallback]
    return decoded.map((candidate) =>
      typeof candidate === 'number' ? String(candidate) : String(candidate),
    )
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

function resolveExePath(incomingRequest) {
  const headerExe = incomingRequest.headers['x-ritobin-exe']
  const headerResolved = Array.isArray(headerExe) ? headerExe[0] : headerExe
  return (headerResolved ?? process.env.RITOBIN_EXE_DEFAULT ?? '').trim()
}

function jsonError(serverResponse, status, message) {
  serverResponse.setHeader('Content-Type', 'application/json; charset=utf-8')
  serverResponse.writeHead(status)
  serverResponse.end(JSON.stringify({ ok: false, message }))
}

function runDecodeExe(exePath, uploaded) {
  const before = parseArgList(process.env.RITOBIN_ARGS_BEFORE, [])
  const after = parseArgList(process.env.RITOBIN_ARGS_AFTER, [])

  if (INPUT_MODE === 'stdin') {
    const argv = [exePath, ...before, ...after].filter((segment) => segment.length > 0)
    return spawnSync(argv[0], argv.slice(1), {
      encoding: 'utf8',
      input: uploaded,
      maxBuffer: 512 * 1024 * 1024,
      shell: false,
      windowsHide: true,
    })
  }

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ritobin-in-'))
  const tempFile = path.join(tempDir, 'input.bin')

  try {
    fs.writeFileSync(tempFile, uploaded)
    const argv = [exePath, ...before, tempFile, ...after].filter((segment) => segment.length > 0)
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

function runEncodeExe(exePath, ritualText) {
  const before = parseArgList(process.env.RITOBIN_ENCODE_ARGS_BEFORE, [])
  const after = parseArgList(process.env.RITOBIN_ENCODE_ARGS_AFTER, [])
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ritobin-out-'))
  const tempIn = path.join(tempDir, 'input.py')
  const tempOut = path.join(tempDir, 'output.bin')

  try {
    fs.writeFileSync(tempIn, ritualText, 'utf8')
    const argv = [exePath, ...before, tempIn, tempOut, ...after].filter((segment) => segment.length > 0)
    const spawned = spawnSync(argv[0], argv.slice(1), {
      encoding: 'utf8',
      maxBuffer: 512 * 1024 * 1024,
      shell: false,
      windowsHide: true,
    })

    if (spawned.status !== 0) {
      return spawned
    }

    if (!fs.existsSync(tempOut)) {
      return {
        ...spawned,
        status: 422,
        stderr: `${spawned.stderr ?? ''}\n(output.bin não gerado — ajusta RITOBIN_ENCODE_ARGS_*)`,
      }
    }

    const bytes = fs.readFileSync(tempOut)
    return { ...spawned, encodedBytes: bytes }
  } finally {
    fs.rmSync(tempDir, { force: true, recursive: true })
  }
}

async function handleConvert(incomingRequest, serverResponse, exePath) {
  const uploaded = await drainRequest(incomingRequest)

  if (uploaded.byteLength === 0) {
    jsonError(serverResponse, 400, 'body vazio')
    return
  }

  const spawned = runDecodeExe(exePath, uploaded)

  if (!spawned) {
    jsonError(serverResponse, 500, 'spawn falhou')
    return
  }

  if (spawned.error) {
    jsonError(serverResponse, 500, spawned.error.message ?? String(spawned.error))
    return
  }

  if (spawned.status !== 0) {
    const stderrShort = (spawned.stderr ?? '').toString().slice(0, 4000)
    jsonError(serverResponse, 422, `exit ${String(spawned.status)}: ${stderrShort || '(sem stderr)'}`)
    return
  }

  const text = typeof spawned.stdout === 'string' ? spawned.stdout : ''

  serverResponse.setHeader('Content-Type', 'application/json; charset=utf-8')
  serverResponse.writeHead(200)
  serverResponse.end(
    JSON.stringify({
      byteLengthEcho: uploaded.byteLength,
      filename: incomingRequest.headers['x-original-filename'] ?? '?',
      ok: true,
      provider: 'ritobin-local-invoke',
      text,
    }),
  )
}

async function handleConvertToBin(incomingRequest, serverResponse, exePath) {
  const raw = await drainRequest(incomingRequest)
  let ritualText = ''

  try {
    const parsed = JSON.parse(raw.toString('utf8'))
    ritualText = typeof parsed?.text === 'string' ? parsed.text : ''
  } catch {
    jsonError(serverResponse, 400, 'JSON inválido — esperado { "text": "..." }')
    return
  }

  if (!ritualText.trim()) {
    jsonError(serverResponse, 400, 'text vazio')
    return
  }

  const spawned = runEncodeExe(exePath, ritualText)

  if (!spawned) {
    jsonError(serverResponse, 500, 'spawn falhou')
    return
  }

  if (spawned.error) {
    jsonError(serverResponse, 500, spawned.error.message ?? String(spawned.error))
    return
  }

  if (spawned.status !== 0) {
    const stderrShort = (spawned.stderr ?? '').toString().slice(0, 4000)
    jsonError(serverResponse, 422, `exit ${String(spawned.status)}: ${stderrShort || '(sem stderr)'}`)
    return
  }

  const bytes = spawned.encodedBytes
  if (!bytes || !(bytes instanceof Buffer)) {
    jsonError(serverResponse, 422, 'Executável não produziu output.bin')
    return
  }

  serverResponse.setHeader('Content-Type', 'application/json; charset=utf-8')
  serverResponse.writeHead(200)
  serverResponse.end(
    JSON.stringify({
      byteLength: bytes.byteLength,
      bytesBase64: bytes.toString('base64'),
      ok: true,
      provider: 'ritobin-local-invoke',
    }),
  )
}

const server = http.createServer(async (incomingRequest, serverResponse) => {
  serverResponse.setHeader('Access-Control-Allow-Origin', '*')

  if (incomingRequest.method === 'OPTIONS') {
    serverResponse.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    serverResponse.setHeader(
      'Access-Control-Allow-Headers',
      'Content-Type, X-Original-Filename, X-Ritobin-Exe',
    )
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
        provider: 'ritobin-local-invoke',
        features: { decodeBin: true, encodeBin: true },
      }),
    )
    return
  }

  if (incomingRequest.method === 'GET' && (urlPath === '/' || urlPath === '/health')) {
    serverResponse.setHeader('Content-Type', 'text/plain; charset=utf-8')
    serverResponse.writeHead(200)
    serverResponse.end(
      'ritobin-local-invoke — GET /capabilities · POST /convert · POST /convert-to-bin\n',
    )
    return
  }

  if (incomingRequest.method !== 'POST') {
    jsonError(serverResponse, 404, 'use GET /capabilities ou POST /convert | /convert-to-bin')
    return
  }

  const exePath = resolveExePath(incomingRequest)

  if (!exePath || !fs.existsSync(exePath)) {
    jsonError(
      serverResponse,
      400,
      'Defina X-Ritobin-Exe (caminho absoluto) ou RITOBIN_EXE_DEFAULT e confirme que o ficheiro existe.',
    )
    return
  }

  try {
    if (urlPath === '/convert') {
      await handleConvert(incomingRequest, serverResponse, exePath)
      return
    }

    if (urlPath === '/convert-to-bin') {
      await handleConvertToBin(incomingRequest, serverResponse, exePath)
      return
    }

    jsonError(serverResponse, 404, 'rota desconhecida')
  } catch (caught) {
    jsonError(serverResponse, 500, caught instanceof Error ? caught.message : String(caught))
  }
})

server.listen(PORT, '127.0.0.1', () => {
  process.stderr.write(
    `[ritobin-local-invoke] http://127.0.0.1:${PORT}  decode=${INPUT_MODE}  encode=file\n`,
  )
})
