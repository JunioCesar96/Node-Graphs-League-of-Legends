/**
 * Classificação de linhas ritual Class Group: parâmetro simples vs estrutural.
 * Alinhado a `feature_md/prompet/refaturacao.md`.
 */

export type RitualFieldKind = 'metadata' | 'simple' | 'structural' | 'mapEntry' | 'unknown'

export type ParsedRitualField = {
  kind: RitualFieldKind
  fieldName?: string
  ritType?: string
  rawValue?: string
  mapKey?: string
  typeName?: string
  listType?: string
  childTypeName?: string
}

const STRUCT_ONLY_LINE = /^#?([A-Za-z_]\w*)\s*\{\s*(?:\})?\s*(?:\/\/[^\n]*)?\s*$/
const FIELD_SCALAR_REGEX =
  /^\s*([A-Za-z_]\w*)\s*:\s*([^=\n]*?)=\s*((?!\{)[^\n]*)$/

/** `FresnelColor: rgba = { 20, 77, 26, 255 }` — valor entre chavetas na mesma linha. */
const FIELD_SCALAR_BRACED_REGEX =
  /^\s*([A-Za-z_]\w*)\s*:\s*([^=\n]*?)=\s*\{([^}]*)\}\s*$/
const INLINE_EMBED_OPEN_REGEX =
  /^\s*([A-Za-z_]\w*)\s*:\s*\bembed\s*=\s*([A-Za-z_]\w*)\s*\{\s*(?:\})?\s*$/
const INLINE_POINTER_OPEN_REGEX =
  /^\s*([A-Za-z_]\w*)\s*:\s*\bpointer\s*=\s*([A-Za-z_]\w*)\s*\{\s*(?:\})?\s*$/
const INLINE_LINK_OPEN_REGEX =
  /^\s*([A-Za-z_]\w*)\s*:\s*\blink\s*=\s*([A-Za-z_]\w*)\s*\{\s*(?:\})?\s*$/
const INLINE_POINTER_LINK_OPEN_REGEX =
  /^\s*([A-Za-z_]\w*)\s*:\s*\b(pointer|link)\s*=\s*([A-Za-z_]\w*)\s*\{\s*(?:\})?\s*$/
const INLINE_CHILD_OPEN_REGEX =
  /^\s*([A-Za-z_]\w*)\s*:\s*\b(embed|pointer|link)\s*=\s*([A-Za-z_]\w*)\s*\{\s*(?:\})?\s*$/
const LIST_STRUCTURAL_OPEN_REGEX =
  /^\s*([A-Za-z_]\w*)\s*:\s*(list2?\[[^\]]+\]|list\[[^\]]+\])\s*=\s*\{\s*$/
/** Chave string `"path"` ou hash `0x1c1ea8de` em `entries: map[hash,embed]`. */
const MAP_ENTRY_HEAD_REGEX = /^\s*(?:"([^"]+)"|(0x[0-9a-fA-F]+))\s*=\s*(\w+)\s*\{\s*$/
const METADATA_LINE_REGEX = /^\s*(type|version)\s*:/i

const PRIMITIVE_TYPE_REGEX =
  /\b(u8|u16|u32|u64|i8|i16|i32|i64|s8|s16|s32|s64|f32|f64|bool|string|hash|flag|symbol|keyword|vec[234]|rgb|rgba|mtx44|link)\b/i

/** Lista estrutural genérica (ex. `list[link]`) → filhos em Internal_Structures. */
export function isStructuralListType(listTypeBracket: string): boolean {
  const inner = listTypeBracket.replace(/^list2?\[/i, '').replace(/\]$/, '').trim()
  if (
    isEmbedListType(listTypeBracket) ||
    isEmbedList2Type(listTypeBracket) ||
    isPointerListType(listTypeBracket) ||
    isPointerList2Type(listTypeBracket)
  ) {
    return false
  }
  return /\b(embed|pointer|link)\b/i.test(inner)
}

/** `list[embed]` → bloco LIST_EMBED no schema. */
export function isEmbedListType(listTypeBracket: string): boolean {
  if (!/^list\[/i.test(listTypeBracket)) {
    return false
  }
  const inner = listTypeBracket.replace(/^list\[/i, '').replace(/\]$/, '').trim()
  return /\bembed\b/i.test(inner)
}

/** `list2[embed]` → bloco LIST2_EMBED (instâncias estilo embed). */
export function isEmbedList2Type(listTypeBracket: string): boolean {
  if (!/^list2\[/i.test(listTypeBracket)) {
    return false
  }
  const inner = listTypeBracket.replace(/^list2\[/i, '').replace(/\]$/, '').trim()
  return /\bembed\b/i.test(inner)
}

/** `list[pointer]` → bloco LIST_POINTER no schema. */
export function isPointerListType(listTypeBracket: string): boolean {
  if (!/^list\[/i.test(listTypeBracket)) {
    return false
  }
  const inner = listTypeBracket.replace(/^list\[/i, '').replace(/\]$/, '').trim()
  return /\bpointer\b/i.test(inner)
}

/** `list2[pointer]` → bloco LIST2_POINTER (instâncias estilo pointer). */
export function isPointerList2Type(listTypeBracket: string): boolean {
  if (!/^list2\[/i.test(listTypeBracket)) {
    return false
  }
  const inner = listTypeBracket.replace(/^list2\[/i, '').replace(/\]$/, '').trim()
  return /\bpointer\b/i.test(inner)
}

/** Lista de primitivos (list[f32], list[string]) → parâmetro simples no pai. */
export function isPrimitiveListType(listTypeBracket: string): boolean {
  return /^list2?\[/i.test(listTypeBracket) && !isStructuralListType(listTypeBracket)
}

export function isPrimitiveRitType(ritType: string): boolean {
  const t = ritType.trim()
  if (!t) {
    return false
  }
  if (/^link$/i.test(t)) {
    return true
  }
  if (/\b(embed|pointer|link|map)\b/i.test(t)) {
    return false
  }
  if (/^list2?\[/i.test(t)) {
    return isPrimitiveListType(t)
  }
  if (/^option\[/i.test(t)) {
    return true
  }
  if (/^map\[hash,link\]/i.test(t)) {
    return true
  }
  return PRIMITIVE_TYPE_REGEX.test(t)
}

export function classifyRitualLine(lineRaw: string): ParsedRitualField {
  const t = lineRaw.trim()

  if (t === '' || t.startsWith('#')) {
    return { kind: 'unknown' }
  }

  if (METADATA_LINE_REGEX.test(t)) {
    return { kind: 'metadata' }
  }

  const mapEntry = MAP_ENTRY_HEAD_REGEX.exec(lineRaw)
  const mapKey = mapEntry?.[1] ?? mapEntry?.[2]
  if (mapKey && mapEntry?.[3]) {
    return {
      kind: 'mapEntry',
      mapKey,
      typeName: mapEntry[3],
    }
  }

  if (LIST_STRUCTURAL_OPEN_REGEX.test(lineRaw)) {
    const m = LIST_STRUCTURAL_OPEN_REGEX.exec(lineRaw)
    if (m?.[1] && m[2]) {
      const listType = m[2]
      if (
        isEmbedListType(listType) ||
        isEmbedList2Type(listType) ||
        isPointerListType(listType) ||
        isPointerList2Type(listType) ||
        isStructuralListType(listType)
      ) {
        return {
          kind: 'structural',
          fieldName: m[1],
          listType,
          ritType: listType,
        }
      }
      return {
        kind: 'simple',
        fieldName: m[1],
        listType,
        ritType: listType,
      }
    }
  }

  const embedInline = INLINE_EMBED_OPEN_REGEX.exec(lineRaw)
  if (embedInline?.[1] && embedInline[2]) {
    return {
      kind: 'structural',
      fieldName: embedInline[1],
      ritType: 'embed',
      childTypeName: embedInline[2],
    }
  }

  const pointerInline = INLINE_POINTER_OPEN_REGEX.exec(lineRaw)
  if (pointerInline?.[1] && pointerInline[2]) {
    return {
      kind: 'structural',
      fieldName: pointerInline[1],
      ritType: 'pointer',
      childTypeName: pointerInline[2],
    }
  }

  const linkInline = INLINE_LINK_OPEN_REGEX.exec(lineRaw)
  if (linkInline?.[1] && linkInline[2]) {
    return {
      kind: 'structural',
      fieldName: linkInline[1],
      ritType: 'link',
      childTypeName: linkInline[2],
    }
  }

  if (STRUCT_ONLY_LINE.test(t) && lineRaw.includes('{')) {
    const head = STRUCT_ONLY_LINE.exec(t)
    if (head?.[1]) {
      return {
        kind: 'structural',
        childTypeName: head[1],
      }
    }
  }

  const bracedScalar = FIELD_SCALAR_BRACED_REGEX.exec(lineRaw)
  if (bracedScalar?.[1] && bracedScalar[2]) {
    const ritType = bracedScalar[2].trim()
    const rawValue = `{ ${String(bracedScalar[3]).trim()} }`
    if (isPrimitiveRitType(ritType)) {
      return {
        kind: 'simple',
        fieldName: bracedScalar[1],
        ritType,
        rawValue,
      }
    }
    if (/\b(embed|pointer|link)\b/i.test(ritType)) {
      return { kind: 'structural', fieldName: bracedScalar[1], ritType }
    }
    return {
      kind: 'simple',
      fieldName: bracedScalar[1],
      ritType,
      rawValue,
    }
  }

  if (FIELD_SCALAR_REGEX.test(lineRaw) && !lineRaw.includes('{')) {
    const m = FIELD_SCALAR_REGEX.exec(lineRaw)
    if (m?.[1] && m[2]) {
      const ritType = m[2].trim()
      const rawValue = String(m[3]).trim()
      if (isPrimitiveRitType(ritType)) {
        return {
          kind: 'simple',
          fieldName: m[1],
          ritType,
          rawValue,
        }
      }
      if (/\b(embed|pointer|link)\b/i.test(ritType)) {
        return { kind: 'structural', fieldName: m[1], ritType }
      }
      return {
        kind: 'simple',
        fieldName: m[1],
        ritType,
        rawValue,
      }
    }
  }

  return { kind: 'unknown' }
}

export {
  STRUCT_ONLY_LINE,
  FIELD_SCALAR_REGEX,
  FIELD_SCALAR_BRACED_REGEX,
  INLINE_EMBED_OPEN_REGEX,
  INLINE_POINTER_OPEN_REGEX,
  INLINE_LINK_OPEN_REGEX,
  INLINE_POINTER_LINK_OPEN_REGEX,
  INLINE_CHILD_OPEN_REGEX,
  LIST_STRUCTURAL_OPEN_REGEX as LIST_EMBED_OPEN_REGEX,
  MAP_ENTRY_HEAD_REGEX,
}
