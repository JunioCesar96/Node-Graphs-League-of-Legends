/**
 * Arranque interactivo do Vite: escolhe ponte Nativa (motor Rust) ou Bridge Jade.
 * Nativo é o padrão (Enter).
 *
 * Ignora o prompt se:
 * - DEV_BIN_BRIDGE=native|jade já estiver definido
 * - CI=true
 * - --no-prompt ou --native / --jade
 */

import { spawn } from 'node:child_process'
import readline from 'node:readline'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(__dirname, '..')

const rawArgs = process.argv.slice(2)
const viteArgs = rawArgs.filter((arg) => !['--no-prompt', '--native', '--jade'].includes(arg))

function resolveModeFromArgs() {
  if (rawArgs.includes('--jade')) return 'jade'
  if (rawArgs.includes('--native')) return 'native'
  const preset = process.env.DEV_BIN_BRIDGE?.trim().toLowerCase()
  if (preset === 'jade' || preset === 'native') return preset
  return null
}

function applyBridgeEnv(mode) {
  const useJade = mode === 'jade'
  return {
    ...process.env,
    DEV_BIN_BRIDGE: mode,
    VITE_DEV_BIN_BACKEND: mode,
    VITE_JADE_USE_PROXY: useJade ? 'true' : 'false',
    VITE_RITOBIN_USE_PROXY: useJade ? 'false' : 'true',
  }
}

function printModeBanner(mode) {
  if (mode === 'jade') {
    console.log('[dev] Modo: Bridge Jade → jade-http-bridge em 127.0.0.1:8788')
    return
  }
  console.log('[dev] Modo: Nativo → ritual-bin-native em 127.0.0.1:8791 (motor Rust integrado)')
}

async function promptBridgeMode() {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })

  const question = `
Modo de conversão .bin em desenvolvimento:
  [1] Nativo — motor Rust integrado (padrão)
  [2] Bridge Jade — jade-http-bridge (Rust)

Escolha [1/2] (Enter = Nativo): `

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close()
      const trimmed = answer.trim().toLowerCase()
      if (trimmed === '2' || trimmed === 'j' || trimmed === 'jade') {
        resolve('jade')
        return
      }
      resolve('native')
    })
  })
}

async function main() {
  const skipPrompt =
    rawArgs.includes('--no-prompt') ||
    process.env.CI === 'true' ||
    process.env.CI === '1'

  let mode = resolveModeFromArgs()

  if (!mode && !skipPrompt && process.stdin.isTTY) {
    mode = await promptBridgeMode()
  }

  if (!mode) {
    mode = 'native'
  }

  printModeBanner(mode)

  const env = applyBridgeEnv(mode)
  const viteBin = path.join(projectRoot, 'node_modules', 'vite', 'bin', 'vite.js')

  const child = spawn(process.execPath, [viteBin, ...viteArgs], {
    cwd: projectRoot,
    env,
    stdio: 'inherit',
    windowsHide: false,
  })

  child.on('exit', (code, signal) => {
    if (signal) {
      process.kill(process.pid, signal)
      return
    }
    process.exit(code ?? 0)
  })
}

main().catch((error) => {
  console.error('[dev] Falha ao arrancar:', error)
  process.exit(1)
})
