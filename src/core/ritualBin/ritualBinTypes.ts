/** Resultado genérico de operações bin↔texto via ponte local (sem sidecar Jade). */
export type RitualBinBranch =
  | { branch: 'not_configured' }
  | { branch: 'network_error'; message: string }
  | { branch: 'codec_error'; message: string; status?: number }
  | { branch: 'success'; status: number; text: string; byteLengthSent: number }

export type RitualBinEncodeBranch =
  | { branch: 'not_configured' }
  | { branch: 'network_error'; message: string }
  | { branch: 'codec_error'; message: string; status?: number }
  | { branch: 'success'; status: number; bytesBase64: string; byteLength: number }

export type RitualEditorTextVia = 'unchanged' | 'local-decode' | 'fnv-lexicon' | 'native-unhash'

export type RitualEditorTextOutcome = {
  text: string
  changed: boolean
  via: RitualEditorTextVia
  notice?: string
}

export type LocalInvokeCapabilities = {
  ok: boolean
  provider?: string
  hashCount?: number
  features?: {
    decodeBin?: boolean
    encodeBin?: boolean
    unhashText?: boolean
    convertToBin?: boolean
  }
}
