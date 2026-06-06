import { spawn, type ChildProcess } from 'node:child_process'
import path from 'node:path'

import type { Plugin } from 'vite'

const PORT = process.env.RITOBIN_BRIDGE_PORT ?? process.env.PORT ?? '8791'

/**
 * Em `vite dev` (modo Nativo), arranca `scripts/ritobin/invoke-server.mjs` em 127.0.0.1:8791.
 */
export function vitePluginRitobinBridgeDev(projectRoot: string): Plugin {
  let child: ChildProcess | null = null

  return {
    name: 'ritobin-bridge-dev',
    apply: 'serve',
    configureServer(server) {
      const startBridge = () => {
        if (child && !child.killed) {
          return
        }

        const script = path.join(projectRoot, 'scripts', 'ritobin', 'invoke-server.mjs')
        const env: NodeJS.ProcessEnv = {
          ...process.env,
          PORT: String(PORT),
        }

        child = spawn(process.execPath, [script], {
          cwd: projectRoot,
          env,
          stdio: 'inherit',
          windowsHide: true,
        })

        child.on('error', (err) => {
          console.error('[ritobin-bridge-dev] falha ao arrancar:', err.message)
        })

        child.on('exit', (code, signal) => {
          if (code !== null && code !== 0) {
            console.warn(`[ritobin-bridge-dev] processo terminou code=${code} signal=${signal ?? ''}`)
          }
          child = null
        })

        console.log(`[ritobin-local-invoke] invoke-server → http://127.0.0.1:${PORT}`)
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
