/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_JADE_BIN_BRIDGE?: string
  /** `'true'` | `'1'` | `'yes'`: em `pnpm dev`, usa `/api/jade` (proxy para `JADE_BRIDGE_TARGET`). */
  readonly VITE_JADE_USE_PROXY?: string
  /** URL absoluta da ponte `scripts/ritobin/invoke-server.mjs`. */
  readonly VITE_RITOBIN_INVOKE_BRIDGE?: string
  /** `'true'`: em dev, usa `/api/ritobin` → `RITOBIN_BRIDGE_TARGET` (loadEnv em `vite.config.ts`). */
  readonly VITE_RITOBIN_USE_PROXY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
