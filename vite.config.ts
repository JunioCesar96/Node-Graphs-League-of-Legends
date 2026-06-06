import path from 'node:path'

import react from '@vitejs/plugin-react'
import { loadEnv } from 'vite'
import { defineConfig } from 'vitest/config'

import { vitePluginCharacterGltf } from './vite.plugin.characterGltf'
import { vitePluginJadeBridgeDev } from './vite.plugin.jadeBridgeDev'
import { vitePluginRitualNativeBridgeDev } from './vite.plugin.ritualNativeBridgeDev'
import { vitePluginLanguage } from './vite.plugin.language'
import { vitePluginAddonsList } from './vite.plugin.addonsList'
import { vitePluginGalleryFolder } from './vite.plugin.galleryFolder'
import { vitePluginBlockParametersWrite } from './vite.plugin.blockParametersWrite'
import { vitePluginNodeStructuresWrite } from './vite.plugin.nodeStructuresWrite'
import { vitePluginWorkspaceSync } from './vite.plugin.workspaceSync'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const bridgeTarget = env.JADE_BRIDGE_TARGET ?? 'http://127.0.0.1:8788'
  const ritobinBridgeTarget = env.RITOBIN_BRIDGE_TARGET ?? 'http://127.0.0.1:8791'

  const devBinBridge = (process.env.DEV_BIN_BRIDGE ?? env.DEV_BIN_BRIDGE ?? 'native')
    .trim()
    .toLowerCase()

  /** Se não definires `VITE_RITOBIN_USE_PROXY`, activa só no modo Nativo em dev. */
  const ritobinExplicit = env.VITE_RITOBIN_USE_PROXY
  const ritobinProxyFlagEffective =
    typeof ritobinExplicit === 'string' && ritobinExplicit.trim() !== ''
      ? ritobinExplicit.trim()
      : mode === 'development' && devBinBridge === 'native'
        ? 'true'
        : 'false'

  const jadeExplicit = env.VITE_JADE_USE_PROXY
  const jadeUseProxyEffective =
    typeof jadeExplicit === 'string' && jadeExplicit.trim() !== ''
      ? jadeExplicit.trim()
      : mode === 'development' && devBinBridge === 'jade'
        ? 'true'
        : 'false'

  return {
    define: {
      'import.meta.env.VITE_JTK_HASH_AS_EDGE': JSON.stringify(env.VITE_LTK_HASH_AS_EDGE ?? 'true'),
      'import.meta.env.VITE_DEV_BIN_BACKEND': JSON.stringify(devBinBridge),
      'import.meta.env.VITE_JADE_USE_PROXY': JSON.stringify(jadeUseProxyEffective),
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
    plugins: [
      react(),
      ...(mode === 'development'
        ? [
            ...(devBinBridge === 'jade'
              ? [vitePluginJadeBridgeDev(path.resolve(__dirname))]
              : [vitePluginRitualNativeBridgeDev(path.resolve(__dirname))]),
            vitePluginCharacterGltf(path.resolve(__dirname)),
            vitePluginGalleryFolder(),
          ]
        : []),
      vitePluginNodeStructuresWrite(path.resolve(__dirname)),
      vitePluginAddonsList(path.resolve(__dirname)),
      vitePluginBlockParametersWrite(path.resolve(__dirname)),
      vitePluginWorkspaceSync(path.resolve(__dirname)),
      vitePluginLanguage(path.resolve(__dirname)),
    ],
    server: {
      watch: {
        ignored: [
          '**/src/nodeStructures/**',
          '**/src/blockStructures/parameters/**',
          '**/src/blockStructures/blocks/**',
          '**/src/blockStructures/slashCommands/**',
        ],
      },
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
