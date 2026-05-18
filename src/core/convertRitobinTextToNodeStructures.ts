import type { NodeSchemaDefinition, NomenclaturePathSegment } from '@/core/nodeSchema'
import {
  parseClassGroupRitualWithStack,
  schemasFromClassGroupStackParse,
} from '@/core/classGroupRitualStackParser'

/**
 * Converte texto ritual Jade/Ritobin (ex.: `estrutura_bin.py`) em `NodeSchemaDefinition[]`.
 * Motor Class Group: pilha de escopo + profundidade ilimitada (`classGroupRitualStackParser.ts`).
 */

export type ConvertRitobinToStructuresResult =
  | {
      ok: true
      schemas: NodeSchemaDefinition[]
      warnings: string[]
      /** Primeira ocorrência por `schema.id` — nomenclatura Class Group. */
      classGroupPathBySchemaId?: Record<string, NomenclaturePathSegment[]>
      /** Entidades raiz (`entries: map`); restantes schemas são componentes referenciados. */
      rootSchemaIds?: string[]
    }
  | { ok: false; error: string }

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

/** Processa texto ritual com pilha de escopo (Class Group). */
export function convertRitobinStructureTextToNodeSchemas(source: string): ConvertRitobinToStructuresResult {
  const text = source.replace(/\r\n/g, '\n').trim()

  if (text.length === 0) {
    return { ok: false, error: 'Texto ritual vazio.' }
  }

  if (text.length > 25_000_000) {
    return { ok: false, error: 'Texto excede ~25 MB para conversão nesta etapa.' }
  }

  const parsed = parseClassGroupRitualWithStack(text)
  const schemas = schemasFromClassGroupStackParse(parsed)

  if (schemas.length === 0) {
    const tag = /^#([A-Za-z_]\w*)/m.exec(text)
    if (!tag) {
      return {
        ok: false,
        error:
          'Nenhum bloco `Tipo {` encontrado. O conversor espera entradas `"chave" = Tipo {` dentro de `entries: map`, ou linhas `Tipo {` isoladas.',
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
          listEmbed: [],
          internalStructures: [],
        },
      ],
      rootSchemaIds: [id],
      warnings: [
        'Fallback: nenhum struct reconhecido; foi gerado um único nó com o texto bruto.',
      ],
    }
  }

  const warnCap =
    parsed.warnings.length > 80
      ? [...parsed.warnings.slice(0, 80), '… (+ aviso truncados)']
      : [...parsed.warnings]

  warnCap.push(
    `Entidades raiz: ${String(parsed.rootSchemaIds.size)}. Schemas alcançáveis: ${String(schemas.length)}.`,
  )

  const pathRecord =
    parsed.classGroupPathBySchemaId.size > 0
      ? Object.fromEntries(parsed.classGroupPathBySchemaId)
      : undefined

  return {
    ok: true,
    schemas,
    warnings: warnCap,
    classGroupPathBySchemaId: pathRecord,
    rootSchemaIds: [...parsed.rootSchemaIds],
  }
}
