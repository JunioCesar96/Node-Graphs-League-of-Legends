import { spawn, type ChildProcess } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import type { Plugin } from 'vite'

const PORT = process.env.PORT ?? process.env.JADE_BRIDGE_PORT ?? '8788'

function resolveRustBridgeExe(projectRoot: string): string | null {
  const base = path.join(projectRoot, '..', 'Jade-League-Bin-Editor', 'src-tauri', 'target', 'release')
  const candidates = process.platform === 'win32'
    ? ['jade-http-bridge.exe', 'jade-http-bridge']
    : ['jade-http-bridge', 'jade-http-bridge.exe']

  for (const name of candidates) {
    const full = path.join(base, name)
    if (fs.existsSync(full)) {
      return full
    }
  }

  return null
}

/**
 * Em `vite dev`, arranca automaticamente a ponte Jade em 127.0.0.1:8788:
 * - `jade-http-bridge` (Rust, conversão real de .bin) se já estiver compilado;
 * - senão `scripts/jade/mock-bridge-server.mjs` (placeholder em /convert, sem `/unhash-text` real).
 *   Conversão e resolução de hashes exigem `npm run jade:http-bridge:build` (ou exe em `target/release/`).
 */
export function vitePluginJadeBridgeDev(projectRoot: string): Plugin {
  let child: ChildProcess | null = null
  let modeLabel = 'mock'

  return {
    name: 'jade-bridge-dev',
    apply: 'serve',
    configureServer(server) {
      const startBridge = () => {
        if (child && !child.killed) {
          return
        }

        const rustExe = resolveRustBridgeExe(projectRoot)
        const mockScript = path.join(projectRoot, 'scripts', 'jade', 'mock-bridge-server.mjs')
        const jadeAppExe = path.join(
          projectRoot,
          '..',
          'Jade-League-Bin-Editor',
          'src-tauri',
          'target',
          'release',
          process.platform === 'win32' ? 'jade-rust.exe' : 'jade-rust',
        )
        const env: NodeJS.ProcessEnv = { ...process.env, PORT: String(PORT) }
        if (fs.existsSync(jadeAppExe)) {
          env.JADE_APP_EXE = jadeAppExe
        }

        if (rustExe) {
          modeLabel = 'rust'
          child = spawn(rustExe, [], {
            cwd: path.dirname(rustExe),
            env,
            stdio: 'inherit',
            windowsHide: true,
          })
        } else {
          modeLabel = 'mock'
          child = spawn(process.execPath, [mockScript], {
            cwd: projectRoot,
            env,
            stdio: 'inherit',
            windowsHide: true,
          })
        }

        child.on('error', (err) => {
          console.error(`[jade-bridge-dev] falha ao arrancar (${modeLabel}):`, err.message)
        })

        child.on('exit', (code, signal) => {
          if (code !== null && code !== 0) {
            console.warn(`[jade-bridge-dev] processo terminou code=${code} signal=${signal ?? ''}`)
          }
          child = null
        })

        const label =
          modeLabel === 'rust'
            ? `Rust jade-http-bridge (${rustExe})`
            : `mock Node (${mockScript}) — conversão real: npm run jade:http-bridge:build && npm run dev`

        console.log(`[jade-bridge-dev] ${label} → http://127.0.0.1:${PORT}`)
      }

      if (server.httpServer?.listening) {
        startBridge()
      } else {
        server.httpServer?.once('listening', startBridge)
      }

      return () => {
        if (child && !child.killed) {
          child.kill()
          child = null
        }
      }
    },
  }
}

/** @internal — exposto para testes de resolução de path */
export const __testing = {
  resolveRustBridgeExe,
  pluginDir: path.dirname(fileURLToPath(import.meta.url)),
}
