import { loader } from '@monaco-editor/react'

let configurePromise: Promise<void> | null = null

/**
 * Configura o Monaco a partir de `node_modules` só quando o Code Dock precisa dele.
 * Evita centenas de pedidos ESM/CSS no arranque da app (ERR_INSUFFICIENT_RESOURCES em dev).
 */
export function configureMonacoLoader(): Promise<void> {
  if (configurePromise) {
    return configurePromise
  }

  configurePromise = import('monaco-editor').then((monaco) => {
    loader.config({ monaco })
  })

  return configurePromise
}
