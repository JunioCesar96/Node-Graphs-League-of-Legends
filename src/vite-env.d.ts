/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_JADE_BIN_BRIDGE?: string
  /** `'true'` | `'1'` | `'yes'`: em dev, usa `/api/jade` (proxy para `JADE_BRIDGE_TARGET`). */
  readonly VITE_JADE_USE_PROXY?: string
  /** URL absoluta da ponte `scripts/ritobin/invoke-server.mjs`. */
  readonly VITE_RITOBIN_INVOKE_BRIDGE?: string
  /** `'true'`: em dev, usa `/api/ritobin` → `RITOBIN_BRIDGE_TARGET`. */
  readonly VITE_RITOBIN_USE_PROXY?: string
  /** `native` | `jade` — escolha em `npm run dev`. */
  readonly VITE_DEV_BIN_BACKEND?: 'native' | 'jade'
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
