import { needsBinConversionOnOpen, needsBinConversionOnSave, normalizeCodeDockFileName } from '@/core/codeDockFileTypes'
import { downloadBytesAsFile } from '@/core/jadeBridgeApi'
import {
  convertTextToBinViaBridge,
  base64ToUint8Array,
} from '@/core/jadeBridgeApi'
import { resolveBinFileForEditor } from '@/core/jadeEditorTextResolve'

import {
  openBinViaNativeCodec,
  saveBinViaNativeCodec,
  shouldUseNativeRitualBinCodec,
} from '@/core/ritualBin'

export type CodeDockBinOpenResult =
  | { branch: 'success'; text: string; via: string }
  | { branch: 'cancelled' }
  | { branch: 'error'; message: string }

export type CodeDockBinSaveResult =
  | { branch: 'success'; fileName: string; bytes: Uint8Array }
  | { branch: 'cancelled' }
  | { branch: 'error'; message: string }

function formatSidecarOpenError(
  branch: 'not_configured' | 'network_error' | 'bridge_error',
  message: string,
  status?: number,
): string {
  if (branch === 'not_configured') {
    return (
      'Sidecar externo não configurado.\n\n' +
      'Em dev: `npm run dev` → opção 2 (Bridge) ou `npm run dev:jade`.\n' +
      'Ou define `VITE_JADE_BIN_BRIDGE` / `VITE_JADE_USE_PROXY=true`.'
    )
  }

  if (branch === 'network_error') {
    return (
      `Não foi possível contactar o sidecar (${message}).\n\n` +
      'Confirma `npm run dev:jade` ou `jade:http-bridge:build`.'
    )
  }

  return `Sidecar respondeu com erro.\n${status !== undefined ? String(status) : ''} — ${message}`
}

/** Abre `.bin` — Nativo (codec local) ou sidecar externo conforme modo dev. */
export async function openBinFileForCodeDock(file: File): Promise<CodeDockBinOpenResult> {
  if (shouldUseNativeRitualBinCodec()) {
    return openBinViaNativeCodec(file)
  }

  const bridge = await resolveBinFileForEditor(file)

  if (bridge.ok) {
    return { branch: 'success', text: bridge.text, via: 'sidecar externo /convert' }
  }

  return {
    branch: 'error',
    message: formatSidecarOpenError(bridge.branch, bridge.message, bridge.status),
  }
}

/** Grava ritual → `.bin`. */
export async function saveBinContentForCodeDock(
  content: string,
  suggestedName: string,
): Promise<CodeDockBinSaveResult> {
  if (!needsBinConversionOnSave(suggestedName)) {
    return { branch: 'error', message: 'Extensão inválida para gravação binária.' }
  }

  if (shouldUseNativeRitualBinCodec()) {
    return saveBinViaNativeCodec(content, suggestedName)
  }

  const result = await convertTextToBinViaBridge(content)

  if (result.branch === 'not_configured') {
    return {
      branch: 'error',
      message: 'Gravar .bin requer sidecar externo (modo Bridge). Usa `npm run dev:jade`.',
    }
  }

  if (result.branch === 'network_error' || result.branch === 'bridge_error') {
    return { branch: 'error', message: result.message }
  }

  const normalized = normalizeCodeDockFileName(suggestedName)
  const fileName = normalized.toLowerCase().endsWith('.bin')
    ? normalized
    : `${normalized.replace(/\.py$/i, '')}.bin`

  return {
    branch: 'success',
    fileName,
    bytes: base64ToUint8Array(result.bytesBase64),
  }
}

export function needsBinOpenConversion(fileName: string): boolean {
  return needsBinConversionOnOpen(fileName)
}

export { downloadBytesAsFile, shouldUseNativeRitualBinCodec }
