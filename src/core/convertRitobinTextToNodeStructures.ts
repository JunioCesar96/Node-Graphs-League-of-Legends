import type { NodeDataType, NodeSchemaDefinition } from '@/core/nodeSchema'

/**
 * Converte texto ritual Jade/Ritobin (ex.: ficheiros `.py` que são export ritual, como
 * `estrutura_bin.py` em projetos VFX) em `NodeSchemaDefinition[]` para `nodeStructures`.
 *
 * Heurística: cada linha que casa `^#?TypeName\\s*\\{\\s*$` inicia um struct; campos
 * `Nome: tipo = valor` numa linha (sem `{` no valor) viram parameters; linhas `x: embed =
 * ChildType {` registam uma entity ligada ao `schemaId` `slug(ChildType)`.
 */

export type ConvertRitobinToStructuresResult =
  | { ok: true; schemas: NodeSchemaDefinition[]; warnings: string[] }
  | { ok: false; error: string }

type MutableSchema = Omit<NodeSchemaDefinition, 'parameters' | 'entities'> & {
  parameters: NodeSchemaDefinition['parameters']
  entities: NodeSchemaDefinition['entities']
}

export function slugifyStructureId(title: string): string {
  return title
    .replace(/^#+/, '')
    .trim()
    .replace(/_/g, '-')
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[^\w\-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
}

function findClosingBrace(source: string, openIdx: number): number {
  let depth = 0
  let inString = false
  let escaped = false

  for (let i = openIdx; i < source.length; i += 1) {
    const c = source[i]

    if (inString) {
      if (!escaped && c === '\\') {
        escaped = true
        continue
      }
      if (!escaped && c === '"') {
        inString = false
      }
      escaped = false
      continue
    }

    if (c === '"') {
      inString = true
      continue
    }
    if (c === '{') {
      depth += 1
    } else if (c === '}') {
      depth -= 1
      if (depth === 0) {
        return i
      }
    }
  }

  return -1
}

function mapPrimitiveType(raw: string): NodeDataType {
  const r = raw.trim().toLowerCase()

  if (r.includes('string')) {
    return 'string'
  }
  if (
    /\bu(8|16|32|64)\b/.test(r) ||
    /\bhash\b/i.test(raw) ||
    /\bs\d+\b/.test(r) ||
    r.includes('bool')
  ) {
    return 'integer'
  }
  if (/\bf(32|64)\b/.test(r) || r.includes('float') || r.includes('double')) {
    return 'float'
  }
  if (r.includes('vec3') || r.includes('rgb')) {
    return 'vector3'
  }
  if (r.includes('vec4') || r.includes('rgba')) {
    return 'vector4'
  }
  if (r.includes('symbol') || r.includes('keyword')) {
    return 'keyword'
  }
  return 'string'
}

/** Cabeçalho apenas `TypeName {` ou `#Type {` na linha. */
const STRUCT_ONLY_LINE =
  /^#?([A-Za-z_]\w*)\s*\{\s*(?:\/\/[^\n]*)?\s*$/

/** Campo scalar numa linha (sem `{` ao fim ou no lado direito antes de `=`). */
const FIELD_SCALAR_REGEX =
  /^\s*([A-Za-z_]\w*)\s*:\s*([^=\n]*?)=\s*((?!\{)[^\n]*)$/

/** Abrindo embed/link/pointer com child type na mesma linha */
const INLINE_CHILD_OPEN_REGEX =
  /^\s*([A-Za-z_]\w*)\s*:\s*\b(embed|pointer|link)\s*=\s*([A-Za-z_]\w*)\s*\{\s*$/

function emptyMutable(title: string, idFallback: string): MutableSchema {
  return {
    id: idFallback || 'struct-unknown',
    title,
    parameters: [],
    entities: [],
  }
}

/** Processa texto ritual completo sobre os blocos `Type {` apenas-linha */
export function convertRitobinStructureTextToNodeSchemas(source: string): ConvertRitobinToStructuresResult {
  const text = source.replace(/\r\n/g, '\n').trim()

  if (text.length === 0) {
    return { ok: false, error: 'Texto ritual vazio.' }
  }

  if (text.length > 25_000_000) {
    return { ok: false, error: 'Texto excede ~25 MB para conversão nesta etapa.' }
  }

  const warnings: string[] = []
  const lines = text.split(/\n/)
  const blocks: { typeName: string; body: string }[] = []

  let offset = 0
  for (const ln of lines) {
    const trimmed = ln.trimEnd()
    const head = STRUCT_ONLY_LINE.exec(trimmed)

    if (head) {
      const typeName = head[1]!
      const braceAt = offset + ln.indexOf('{')
      const close = findClosingBrace(text, braceAt)
      if (close > braceAt) {
        blocks.push({ typeName, body: text.slice(braceAt + 1, close) })
      }
    }

    offset += ln.length + 1
  }

  if (blocks.length === 0) {
    const tag = /^#([A-Za-z_]\w*)/m.exec(text)
    if (!tag) {
      return {
        ok: false,
        error:
          'Nenhum bloco `Tipo {` encontrado. O conversor espera linhas só com o nome do tipo e `{` (como `BankUnit {`).',
      }
    }

    const id = slugifyStructureId(`${tag[1]}_root`)
    return {
      ok: true,
      schemas: [
        {
          id,
          title: tag[1]!,
          parameters: [
            {
              id: `${id}__raw`,
              name: 'rawText',
              type: 'string',
              defaultValue:
                text.length > 800 ? `${text.slice(0, 797).replace(/\n/g, '\\n')}…` : text.replace(/\n/g, '\\n'),
            },
          ],
          entities: [],
        },
      ],
      warnings: [
        'Fallback: nenhum `Tipo {` isolado; foi gerado um único nó com o texto bruto.',
      ],
    }
  }

  const byId = new Map<string, MutableSchema>()

  const ensure = (typeName: string): MutableSchema => {
    const id = slugifyStructureId(typeName)
    const key = id || slugifyStructureId(`type-${String(byId.size)}`)
    let s = byId.get(key)
    if (!s) {
      s = emptyMutable(typeName, key)
      byId.set(key, s)
    }
    return s
  }

  const parseBody = (parentType: string, body: string, parentSchema: MutableSchema): void => {
    const bodyLines = body.replace(/\t/g, '  ').split(/\n/)
    let idx = 0

    while (idx < bodyLines.length) {
      const lineRaw = bodyLines[idx]!.trimEnd()
      const t = lineRaw.trim()
      idx += 1

      if (t === '' || t.startsWith('#')) {
        continue
      }

      const embed = INLINE_CHILD_OPEN_REGEX.exec(lineRaw)
      if (embed?.[3]) {
        const fieldName = embed[1]!
        const childName = embed[3]!

        /** Bloco físico até à chaveta de fecho desta `{` inicial */
        const concatFromHere = bodyLines.slice(idx - 1).join('\n')
        const openRel = concatFromHere.indexOf('{')
        const closeAbs = openRel >= 0 ? findClosingBrace(concatFromHere, openRel) : -1

        let innerSlice = ''

        if (closeAbs <= openRel) {
          warnings.push(`${parentType}.${fieldName}: bloco '${childName}' não fechado`)
        } else {
          innerSlice = concatFromHere.slice(openRel + 1, closeAbs)

          /** Avançar idx para lá deste struct */
          const consumedHead = concatFromHere.slice(0, closeAbs + 1)
          const linesConsumed = consumedHead.split('\n').length
          idx += linesConsumed - 1
        }

        const childSchema = ensure(childName)

        parentSchema.entities.push({
          id:
            slugifyStructureId(`${parentType}-${fieldName}`).replace(/^-+/, '') || fieldName.toLowerCase(),
          name: childName,
          schemaId: childSchema.id,
        })

        if (innerSlice.trim().length > 0) {
          parseBody(childName, innerSlice, childSchema)
        }

        continue
      }

      if (FIELD_SCALAR_REGEX.test(lineRaw) && !lineRaw.includes('{')) {
        const m = FIELD_SCALAR_REGEX.exec(lineRaw)
        if (!m) {
          continue
        }

        const fieldName = m[1]!
        const ritType = m[2]!.trim()
        let value = String(m[3]).trim()

        if (/\{/.test(value) || /\b(embed|pointer|link)\b/i.test(ritType)) {
          continue
        }

        if (value.startsWith('"') && value.endsWith('"')) {
          try {
            value = JSON.parse(value) as string
          } catch {
            value = value.slice(1, -1)
          }
        }

        value = value.length > 480 ? `${value.slice(0, 477)}…` : value

        const pid = slugifyStructureId(`${parentType}_${fieldName}`).replace(/^-+/, '') || fieldName.toLowerCase()

        parentSchema.parameters.push({
          id: pid,
          name: fieldName,
          type:
            /\b(embed|pointer|link|option|map|list)\b/i.test(ritType)
              ? 'string'
              : mapPrimitiveType(ritType),
          defaultValue: value,
        })
      }
    }
  }

  for (const b of blocks) {
    parseBody(b.typeName, b.body, ensure(b.typeName))
  }

  /** Remove campos repetidos quando o mesmo tipo aparece em vários blocos */
  for (const schema of byId.values()) {
    const seenFields = new Set<string>()
    schema.parameters = schema.parameters.filter((p) => {
      if (seenFields.has(p.name)) {
        warnings.push(`${schema.title}: campo duplicado "${p.name}" ignorado`)
        return false
      }
      seenFields.add(p.name)
      return true
    })
    const seenEnt = new Set<string>()
    schema.entities = schema.entities.filter((e) => {
      const k = `${e.id}:${e.schemaId}`
      if (seenEnt.has(k)) {
        return false
      }
      seenEnt.add(k)
      return true
    })
  }

  const list = [...byId.values()].map((sch) =>
    structuredClone({
      ...sch,
      parameters: [...sch.parameters].sort((a, bb) => a.name.localeCompare(bb.name)),
      entities: [...sch.entities],
    }),
  )

  const warnCap = warnings.length > 80 ? [...warnings.slice(0, 80), '… (+ aviso truncados) '] : warnings
  warnCap.push(`Blocos: ${blocks.length}. Schemas gerados (por id): ${list.length}`)

  return { ok: true, schemas: list, warnings: warnCap }
}
