import type { CanvasScene } from '@/core/canvasScene'
import type { NodeSchemaDefinition } from '@/core/nodeSchema'
import { emitNodeRitualViewCodeText } from '@/core/nodeCodeEditorBinding'
import type { NodeCodeEditorBinding } from '@/core/nodeCodeEditorBinding'
import { editorRangeToBlockRange } from '@/core/nodeCodeEditorBinding'

import { findAllVfxSystemBlocks, normalizeLineEndings } from './ritualParseHelpers'
import { parseRitualVfxCatalog, ritualContainsVfxSystem } from './ritualParseVfx'

export function stripRitualBom(content: string): string {
  return content.replace(/^\uFEFF/, '')
}

/** Extrai blocos `VfxSystemDefinitionData` do texto (standalone ou map PROP). */
export function extractVfxRitualFromText(content: string): string | null {
  const normalized = stripRitualBom(normalizeLineEndings(content))
  const blocks = findAllVfxSystemBlocks(normalized)
  if (!blocks.length) return null
  return blocks.map((block) => block.lines.join('\n')).join('\n\n')
}

function sliceHasVfxCatalog(text: string): boolean {
  if (!ritualContainsVfxSystem(text)) return false
  return parseRitualVfxCatalog(text).entries.length > 0
}

function boundRitualSlice(codeText: string, binding: NodeCodeEditorBinding): string | null {
  const block = editorRangeToBlockRange(codeText, binding.range)
  if (!block) return null
  const slice = codeText.slice(block.start, block.end).trim()
  return slice.length > 0 ? slice : null
}

export type ResolveVfxRitualTextOptions = {
  codeText: string
  vfxRitualOverride: string | null
  scene: CanvasScene
  registry: Record<string, NodeSchemaDefinition>
  primarySelectedId: string | null
  nodeCodeBindings: Record<string, NodeCodeEditorBinding>
  activeCodeDockTabId: string | null
}

/**
 * Texto ritual usado pelo VFX Editor: override, trecho vinculado, blocos no editor,
 * export «Ver código» do nó VfxSystem, ou ficheiro completo.
 */
export function resolveVfxRitualText({
  codeText,
  vfxRitualOverride,
  scene,
  registry,
  primarySelectedId,
  nodeCodeBindings,
  activeCodeDockTabId,
}: ResolveVfxRitualTextOptions): string {
  const override = vfxRitualOverride?.trim()
  if (override) {
    const extracted = extractVfxRitualFromText(override)
    return extracted ?? override
  }

  const candidates: string[] = []

  if (primarySelectedId) {
    const binding = nodeCodeBindings[primarySelectedId]
    if (binding && binding.codeDockTabId === activeCodeDockTabId) {
      const bound = boundRitualSlice(codeText, binding)
      if (bound) candidates.push(bound)
    }

    const selected = scene.nodes.find((entry) => entry.id === primarySelectedId)
    if (selected?.node.schema.title === 'VfxSystemDefinitionData') {
      const emitted = emitNodeRitualViewCodeText(scene, registry, primarySelectedId)
      if (emitted.ok) candidates.push(emitted.text)
    }
  }

  const fromEditor = extractVfxRitualFromText(codeText)
  if (fromEditor) candidates.push(fromEditor)

  if (ritualContainsVfxSystem(codeText)) {
    candidates.push(codeText)
  }

  for (const candidate of candidates) {
    if (sliceHasVfxCatalog(candidate)) return candidate
  }

  return candidates[0] ?? codeText
}
