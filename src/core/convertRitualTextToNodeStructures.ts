import type { ConvertRitobinToStructuresResult } from '@/core/convertRitobinTextToNodeStructures'
import { convertRitobinStructureTextToNodeSchemas } from '@/core/convertRitobinTextToNodeStructures'
import { convertParsedVfxToNodeSchemas } from '@/core/convertVfxToNodeStructures'
import { normalizeLineEndings, parseVfxContent } from '@/core/jadeVfxParse'

export type { ConvertRitobinToStructuresResult }

/**
 * Preferencialmente VFX (como o Particle Editor do Jade); senão conversão genérica ritual → structs.
 */
export function convertRitualTextToNodeSchemas(source: string): ConvertRitobinToStructuresResult {
  const normalized = normalizeLineEndings(source)

  const looksVfx =
    /=\s*VfxSystemDefinitionData\s*\{/.test(normalized) || /\bVfxSystemDefinitionData\s*\{/.test(normalized)

  if (looksVfx) {
    const parsed = parseVfxContent(normalized)

    if (parsed.systemOrder.length > 0) {
      return convertParsedVfxToNodeSchemas(parsed)
    }
  }

  return convertRitobinStructureTextToNodeSchemas(source)
}
