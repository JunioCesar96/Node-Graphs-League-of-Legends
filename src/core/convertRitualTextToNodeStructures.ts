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

/** Só VFX Particle Editor Jade (`… = VfxSystemDefinitionData {`); erro se não for esse formato. */
export function convertRitualTextJadeFxEditor(source: string): ConvertRitobinToStructuresResult {
  const normalized = normalizeLineEndings(source)

  const looksVfx =
    /=\s*VfxSystemDefinitionData\s*\{/.test(normalized) || /\bVfxSystemDefinitionData\s*\{/.test(normalized)

  if (!looksVfx) {
    return {
      ok: false,
      error:
        'Converter [Jade fx_editor]: o texto deve conter blocos «… = VfxSystemDefinitionData {» (Particle Editor Jade). Para structs rituais genéricos usa «Converter [Class Group]».',
    }
  }

  const parsed = parseVfxContent(normalized)

  return convertParsedVfxToNodeSchemas(parsed)
}

/** Structs/classes rituais (blocos «TipoName {»); mesmo motor que structs genéricas, sem ramo VFX. */
export function convertRitualTextClassGroup(source: string): ConvertRitobinToStructuresResult {
  return convertRitobinStructureTextToNodeSchemas(normalizeLineEndings(source))
}
