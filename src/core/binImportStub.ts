import type { LeagueBinGraphDocumentV1 } from '@/core/leagueBinScene'

/**
 * Conversão placeholder para ficheiros .bin até haver parser real do Jade-League-Bin-Editor.
 * Produz um documento estrutura válido compatível com `parseSceneDocument`.
 */
export function stubBinStructureDocument(options?: {
  height?: number
  label?: string
  width?: number
}): LeagueBinGraphDocumentV1 {
  return {
    format: 'node-graphs-lol',
    version: 1,
    meta: {
      stub: options?.label ?? 'bin-import-stub',
      note: 'Jade-League-Bin-Editor não integrado nesta build.',
    },
    width: options?.width ?? 960,
    height: options?.height ?? 640,
    nodes: [],
    connections: [],
  }
}
