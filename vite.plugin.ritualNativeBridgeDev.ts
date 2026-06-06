import { spawn, type ChildProcess } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

import type { Plugin } from 'vite'

const PORT = process.env.RITUAL_NATIVE_BRIDGE_PORT ?? process.env.PORT ?? '8791'

function resolveNativeBridgeExe(projectRoot: string): { exe: string; label: string } | null {
  const base = path.join(projectRoot, '..', 'Jade-League-Bin-Editor', 'src-tauri', 'target', 'release')
  const candidates: Array<{ name: string; label: string }> =
    process.platform === 'win32'
      ? [
          { name: 'ritual-native-bridge.exe', label: 'ritual-native-bridge' },
          { name: 'jade-http-bridge.exe', label: 'jade-http-bridge (fallback)' },
        ]
      : [
          { name: 'ritual-native-bridge', label: 'ritual-native-bridge' },
          { name: 'jade-http-bridge', label: 'jade-http-bridge (fallback)' },
        ]

  for (const candidate of candidates) {
    const full = path.join(base, candidate.name)
    if (fs.existsSync(full)) {
      return { exe: full, label: candidate.label }
    }
  }

  return null
}

/**
 * Em `vite dev` (modo Nativo), arranca `ritual-native-bridge` (Rust) em 127.0.0.1:8791.
 * Conversão bin↔texto integrada — sem executável Ritobin externo.
 */
export function vitePluginRitualNativeBridgeDev(projectRoot: string): Plugin {
  let child: ChildProcess | null = null

  return {
    name: 'ritual-native-bridge-dev',
    apply: 'serve',
    configureServer(server) {
      const startBridge = () => {
        if (child && !child.killed) {
          return
        }

        const resolved = resolveNativeBridgeExe(projectRoot)

        if (!resolved) {
          console.warn(
            '[ritual-native-bridge-dev] binário não encontrado.\n' +
              '  Compila: npm run native:http-bridge:build\n' +
              '  Ou: npm run jade:http-bridge:build (fallback compatível)\n' +
              '  Depois reinicia npm run dev (modo Nativo).',
          )
          return
        }

        const env: NodeJS.ProcessEnv = {
          ...process.env,
          PORT: String(PORT),
        }

        child = spawn(resolved.exe, [], {
          cwd: path.dirname(resolved.exe),
          env,
          stdio: 'inherit',
          windowsHide: true,
        })

        child.on('error', (err) => {
          console.error('[ritual-native-bridge-dev] falha ao arrancar:', err.message)
        })

        child.on('exit', (code, signal) => {
          if (code !== null && code !== 0) {
            console.warn(`[ritual-native-bridge-dev] processo terminou code=${code} signal=${signal ?? ''}`)
          }
          child = null
        })

        console.log(
          `[ritual-bin-native] ${resolved.label} (${resolved.exe}) → http://127.0.0.1:${PORT}`,
        )
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

/** @internal */
export const __testing = {
  resolveNativeBridgeExe,
}
