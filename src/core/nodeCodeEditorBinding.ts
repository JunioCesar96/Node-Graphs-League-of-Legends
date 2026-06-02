import { canvasNodeSubtreeToRitual } from '@/core/canvasToClassGroupRitual'
import { resolveViewCodeExportNodeId } from '@/core/viewCodeExportRoot'
import { expandBlockTokensInScene, syncBlockStructureTokensInScene } from '@/core/blockRitualExport'
import { expandGroupTokensInScene, syncGroupStructureTokensInScene } from '@/core/groupRitualExport'
import { syncAllValueVector3ConstantsToDynamicsInScene } from '@/core/valueVector3DynamicsSync'
import {
  buildRitualExportFidelity,
  resolveParticleMapEntryKeyFromNode,
  type RitualExportFidelity,
} from '@/core/ritualBinFidelity'
import type { RitualBlockRange } from '@/core/syncCanvasNodeToCode'
import type { CanvasScene } from '@/core/canvasScene'
import type { NodeSchemaDefinition } from '@/core/nodeSchema'

export type CodeEditorTextRange = {
  startLineNumber: number
  startColumn: number
  endLineNumber: number
  endColumn: number
}

export type NodeCodeEditorBinding = {
  canvasNodeId: string
  codeDockTabId: string
  range: CodeEditorTextRange
}

export type SyncNodeToBoundCodeResult =
  | { ok: true; newText: string; startLine: number; warnings: string[] }
  | { ok: false; error: string }

export type EmitNodeRitualViewCodeResult =
  | { ok: true; text: string; warnings: string[] }
  | { ok: false; error: string }

function offsetAtLineColumn(text: string, lineNumber: number, column: number): number {
  const lines = text.split('\n')
  const lineIndex = lineNumber - 1
  if (lineIndex < 0 || lineIndex >= lines.length) {
    return -1
  }

  let offset = 0
  for (let i = 0; i < lineIndex; i++) {
    offset += (lines[i]?.length ?? 0) + 1
  }

  return offset + Math.max(0, column - 1)
}

export function editorRangeToBlockRange(
  text: string,
  range: CodeEditorTextRange,
): RitualBlockRange | null {
  const start = offsetAtLineColumn(text, range.startLineNumber, range.startColumn)
  const end = offsetAtLineColumn(text, range.endLineNumber, range.endColumn)

  if (start < 0 || end < 0 || end < start) {
    return null
  }

  const lines = text.split('\n')
  const openingLine = lines[range.startLineNumber - 1] ?? ''
  const openingLineIndent = openingLine.match(/^(\s*)/)?.[1] ?? ''

  return {
    start,
    end,
    startLine: range.startLineNumber - 1,
    openingLineIndent,
  }
}

/** Fidelidade do export «Ver código» / sync: só o grafo (sem reordenar pelo trecho vinculado). */
export function buildNodeRitualViewCodeFidelity(
  scene: CanvasScene,
  nodeId: string,
): RitualExportFidelity {
  const canvasNode = scene.nodes.find((entry) => entry.id === nodeId)
  const mapFromNode = canvasNode ? resolveParticleMapEntryKeyFromNode(canvasNode) : null

  return buildRitualExportFidelity({
    mapEntryKey: mapFromNode,
  })
}

/** Mesmo texto que «Ver código League bin» — valores reais, sem tokens de bloco/grupo. */
export function emitNodeRitualViewCodeText(
  scene: CanvasScene,
  registry: Record<string, NodeSchemaDefinition>,
  nodeId: string,
): EmitNodeRitualViewCodeResult {
  const preparedScene = syncAllValueVector3ConstantsToDynamicsInScene(scene)
  const leagueBinScene = expandGroupTokensInScene(expandBlockTokensInScene(preparedScene))
  const exportNodeId = resolveViewCodeExportNodeId(leagueBinScene, nodeId)
  const fidelity = buildNodeRitualViewCodeFidelity(leagueBinScene, exportNodeId)
  const result = canvasNodeSubtreeToRitual(leagueBinScene, registry, exportNodeId, fidelity)

  if (!result.ok) {
    return { ok: false, error: result.error }
  }

  return { ok: true, text: result.text, warnings: result.warnings }
}

/** Export «Ver código de bloco» — ritual com tokens de identificação embebidos. */
export function emitNodeBlockViewCodeText(
  scene: CanvasScene,
  registry: Record<string, NodeSchemaDefinition>,
  nodeId: string,
): EmitNodeRitualViewCodeResult {
  const preparedScene = syncAllValueVector3ConstantsToDynamicsInScene(scene)
  const withBlockTokens = syncBlockStructureTokensInScene(preparedScene)
  const exportNodeId = resolveViewCodeExportNodeId(withBlockTokens, nodeId)
  const fidelity = buildNodeRitualViewCodeFidelity(withBlockTokens, exportNodeId)
  const result = canvasNodeSubtreeToRitual(withBlockTokens, registry, exportNodeId, fidelity)

  if (!result.ok) {
    return { ok: false, error: result.error }
  }

  return { ok: true, text: result.text, warnings: result.warnings }
}

/** Export do menu de contexto do block card — apenas parâmetros seleccionados no card. */
export function emitNodeBlockCardPreviewCodeText(
  scene: CanvasScene,
  registry: Record<string, NodeSchemaDefinition>,
  nodeId: string,
): EmitNodeRitualViewCodeResult {
  const preparedScene = syncAllValueVector3ConstantsToDynamicsInScene(scene)
  // No preview do menu do block card, o valor deve vir do estado actual do nó em cena
  // (edição no card), não de default salvo em blockStructure/JSON.
  const withResolvedValues = expandBlockTokensInScene(preparedScene)
  const exportNodeId = resolveViewCodeExportNodeId(withResolvedValues, nodeId)
  const fidelity = {
    ...buildNodeRitualViewCodeFidelity(withResolvedValues, exportNodeId),
    blockCardSelectedParametersOnly: true,
  }
  const result = canvasNodeSubtreeToRitual(withResolvedValues, registry, exportNodeId, fidelity)

  if (!result.ok) {
    return { ok: false, error: result.error }
  }

  return { ok: true, text: result.text, warnings: result.warnings }
}

/** Export «Ver código de grupo» — ritual com tokens de identificação embebidos. */
export function emitNodeGroupViewCodeText(
  scene: CanvasScene,
  registry: Record<string, NodeSchemaDefinition>,
  nodeId: string,
): EmitNodeRitualViewCodeResult {
  const preparedScene = syncAllValueVector3ConstantsToDynamicsInScene(scene)
  const withGroupTokens = syncGroupStructureTokensInScene(preparedScene)
  const exportNodeId = resolveViewCodeExportNodeId(withGroupTokens, nodeId)
  const fidelity = buildNodeRitualViewCodeFidelity(withGroupTokens, exportNodeId)
  const result = canvasNodeSubtreeToRitual(withGroupTokens, registry, exportNodeId, fidelity)

  if (!result.ok) {
    return { ok: false, error: result.error }
  }

  return { ok: true, text: result.text, warnings: result.warnings }
}

/** Apaga a área vinculada no editor e cola o ritual de «Ver código». */
export function syncNodeToBoundCodeRange(
  scene: CanvasScene,
  registry: Record<string, NodeSchemaDefinition>,
  nodeId: string,
  editorText: string,
  binding: NodeCodeEditorBinding,
): SyncNodeToBoundCodeResult {
  if (binding.canvasNodeId !== nodeId) {
    return { ok: false, error: 'A vinculação não pertence a este nó.' }
  }

  const blockRange = editorRangeToBlockRange(editorText, binding.range)
  if (!blockRange) {
    return {
      ok: false,
      error: 'A área vinculada no editor já não é válida (linhas fora do ficheiro).',
    }
  }

  const emitted = emitNodeRitualViewCodeText(scene, registry, nodeId)

  if (!emitted.ok) {
    return { ok: false, error: emitted.error }
  }

  const newText =
    editorText.slice(0, blockRange.start) + emitted.text + editorText.slice(blockRange.end)

  return {
    ok: true,
    newText,
    startLine: blockRange.startLine,
    warnings: emitted.warnings,
  }
}
