import type { NodeParameterDefinition } from '@/core/nodeSchema'

const PARAMETER_ID_MARKER = '_parameter_'

/**
 * Nome de campo no ritual Class Group (PascalCase / prefixo `m` de membro).
 * Inverte a normalização camelCase do editor sem alterar `mResourceResolver`.
 */
export function ritualExportFieldName(fieldName: string): string {
  const trimmed = fieldName.trim()
  if (trimmed.length === 0) {
    return trimmed
  }
  if (/^m[A-Z]/.test(trimmed)) {
    return trimmed
  }
  return trimmed[0]!.toUpperCase() + trimmed.slice(1)
}

/** Preferir sufixo canónico do `parameter.id` (`Type_parameter_Field`). */
export function ritualExportFieldNameFromParameter(
  parameter: Pick<NodeParameterDefinition, 'id' | 'name'>,
): string {
  const markerIndex = parameter.id.indexOf(PARAMETER_ID_MARKER)
  if (markerIndex >= 0) {
    const suffix = parameter.id.slice(markerIndex + PARAMETER_ID_MARKER.length)
    if (suffix.length > 0) {
      return ritualExportFieldName(suffix)
    }
  }
  return ritualExportFieldName(parameter.name)
}

export function ritualExportBlockTitle(title: string): string {
  return ritualExportFieldName(title)
}
