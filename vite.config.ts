import path from 'node:path'

import react from '@vitejs/plugin-react'
import { loadEnv } from 'vite'
import { defineConfig } from 'vitest/config'

import { vitePluginNodeStructuresWrite } from './vite.plugin.nodeStructuresWrite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const bridgeTarget = env.JADE_BRIDGE_TARGET ?? 'http://127.0.0.1:8788'
  const ritobinBridgeTarget = env.RITOBIN_BRIDGE_TARGET ?? 'http://127.0.0.1:8791'

  /** Se não definires `VITE_RITOBIN_USE_PROXY`, reutiliza o mesmo modo que Jade (`VITE_JADE_USE_PROXY`). */
  const ritobinExplicit = env.VITE_RITOBIN_USE_PROXY
  const ritobinProxyFlagEffective =
    typeof ritobinExplicit === 'string' && ritobinExplicit.trim() !== ''
      ? ritobinExplicit.trim()
      : (env.VITE_JADE_USE_PROXY?.trim() ?? 'false')

  return {
    define: {
      'import.meta.env.VITE_LTK_HASH_AS_EDGE': JSON.stringify(env.VITE_LTK_HASH_AS_EDGE ?? 'true'),
      'import.meta.env.VITE_RITOBIN_USE_PROXY': JSON.stringify(ritobinProxyFlagEffective),
    },
    optimizeDeps: {
      include: ['monaco-editor', '@monaco-editor/react'],
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        '@jade': path.resolve(__dirname, '../Jade-League-Bin-Editor/src'),
      },
    },
    plugins: [react(), vitePluginNodeStructuresWrite(path.resolve(__dirname))],
    server: {
      proxy: {
        '^/api/jade(?:/|$)': {
          changeOrigin: true,
          rewrite: (requestPath) => requestPath.replace(/^\/api\/jade/, '') || '/',
          target: bridgeTarget,
        },
        '^/api/ritobin(?:/|$)': {
          changeOrigin: true,
          rewrite: (requestPath) => requestPath.replace(/^\/api\/ritobin/, '') || '/',
          target: ritobinBridgeTarget,
        },
      },
    },
    test: {
      environment: 'jsdom',
      globals: false,
      include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    },
  }
})
