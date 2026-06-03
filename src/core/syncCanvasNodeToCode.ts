import type { CanvasNode, CanvasScene } from '@/core/canvasScene'
import {
  classifyOutgoingLink,
  emitMainPropFile,
  RitualEmitter,
  type OutgoingLink,
} from '@/core/canvasToClassGroupRitual'
import { MAIN_SCHEMA_ID } from '@/core/classGroupRitualStackParser'
import { isMapHashParameterType } from '@/core/nodeDataTypeToRitType'
import type { NodeInstance, NodeSchemaDefinition } from '@/core/nodeSchema'
import {
  ritualExportBlockTitle,
  ritualExportFieldName,
  ritualExportFieldNameFromParameter,
} from '@/core/ritualFieldNames'
import { formatMapEntryKey, formatRitualScalarAssignment } from '@/core/ritualValueFormat'
import { isBlockTokenValue } from '@/core/blockSchema'
import { findIncomingConnections } from '@/core/slotPeerFocus'

const INDENT_STEP = 4

export type RitualPathSegment =
  | { kind: 'main' }
  | { kind: 'mapEntry'; entryKey: string; typeTitle: string }
  | { kind: 'internal'; fieldName: string; childTypeTitle: string }
  | { kind: 'embed'; fieldName: string; childTypeTitle: string }
  | { kind: 'pointer'; fieldName: string; childTypeTitle: string }
  | { kind: 'listEmbed'; fieldName: string; index: number; childTypeTitle: string }
  | { kind: 'listPointer'; fieldName: string; index: number; childTypeTitle: string }
  | { kind: 'list2Embed'; fieldName: string; instanceIndex: number; childTypeTitle: string }
  | { kind: 'list2Pointer'; fieldName: string; instanceIndex: number; childTypeTitle: string }
  | { kind: 'standalone'; typeTitle: string }

export type RitualPathToNode = {
  targetNodeId: string
  isMain: boolean
  /** Ligação do pai directo ao nó alvo (null para Main ou órfão). */
  incomingLink: OutgoingLink | null
  /** Do Main (ou raiz) até o bloco do nó alvo. */
  segments: RitualPathSegment[]
}

export type RitualBlockRange = {
  start: number
  end: number
  startLine: number
  openingLineIndent: string
}

export type SyncCanvasNodeToCodeResult =
  | { ok: true; newText: string; startLine: number; warnings: string[] }
  | { ok: false; error: string }

function findCanvasNode(scene: CanvasScene, nodeId: string): CanvasNode | undefined {
  return scene.nodes.find((entry) => entry.id === nodeId)
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function linkToPathSegment(link: OutgoingLink, childTypeTitle: string): RitualPathSegment {
  switch (link.kind) {
    case 'mapHashEmbed':
      return { kind: 'mapEntry', entryKey: link.entryKey, typeTitle: childTypeTitle }
    case 'internal':
      return {
        kind: 'internal',
        fieldName: ritualExportFieldName(link.fieldName),
        childTypeTitle,
      }
    case 'embed':
      return {
        kind: 'embed',
        fieldName: ritualExportBlockTitle(link.fieldName),
        childTypeTitle,
      }
    case 'pointer':
      return {
        kind: 'pointer',
        fieldName: ritualExportBlockTitle(link.fieldName),
        childTypeTitle,
      }
    case 'listEmbed':
      return {
        kind: 'listEmbed',
        fieldName: ritualExportBlockTitle(link.fieldName),
        index: link.index,
        childTypeTitle,
      }
    case 'listPointer':
      return {
        kind: 'listPointer',
        fieldName: ritualExportBlockTitle(link.fieldName),
        index: link.index,
        childTypeTitle,
      }
    case 'list2Embed':
      return {
        kind: 'list2Embed',
        fieldName: ritualExportBlockTitle(link.fieldName),
        instanceIndex: link.instanceIndex,
        childTypeTitle,
      }
    case 'list2Pointer':
      return {
        kind: 'list2Pointer',
        fieldName: ritualExportBlockTitle(link.fieldName),
        instanceIndex: link.instanceIndex,
        childTypeTitle,
      }
    default:
      return { kind: 'standalone', typeTitle: childTypeTitle }
  }
}

export function buildRitualPathToNode(
  scene: CanvasScene,
  nodeId: string,
): { ok: true; path: RitualPathToNode } | { ok: false; error: string } {
  const canvasNode = findCanvasNode(scene, nodeId)

  if (!canvasNode) {
    return { ok: false, error: 'Nó não encontrado na cena.' }
  }

  if (canvasNode.node.schema.id === MAIN_SCHEMA_ID) {
    return {
      ok: true,
      path: {
        targetNodeId: nodeId,
        isMain: true,
        incomingLink: null,
        segments: [{ kind: 'main' }],
      },
    }
  }

  const segments: RitualPathSegment[] = []
  let incomingLink: OutgoingLink | null = null
  let currentId = nodeId

  while (true) {
    const incoming = findIncomingConnections(scene, currentId)

    if (incoming.length === 0) {
      const title = findCanvasNode(scene, nodeId)?.node.schema.title ?? 'Unknown'
      return {
        ok: true,
        path: {
          targetNodeId: nodeId,
          isMain: false,
          incomingLink: null,
          segments: [{ kind: 'standalone', typeTitle: title }],
        },
      }
    }

    const connection = incoming[0]!
    const parent = findCanvasNode(scene, connection.fromNodeId)

    if (!parent) {
      return { ok: false, error: 'Nó pai não encontrado na cena.' }
    }

    const link = classifyOutgoingLink(parent, connection)

    if (!link) {
      return {
        ok: false,
        error: `Não foi possível classificar a ligação do pai «${parent.node.schema.title}».`,
      }
    }

    const child = findCanvasNode(scene, currentId)
    const childTypeTitle = child?.node.schema.title ?? 'Unknown'
    segments.unshift(linkToPathSegment(link, childTypeTitle))
    incomingLink = link
    currentId = parent.id

    if (parent.node.schema.id === MAIN_SCHEMA_ID) {
      segments.unshift({ kind: 'main' })
      return {
        ok: true,
        path: {
          targetNodeId: nodeId,
          isMain: false,
          incomingLink,
          segments,
        },
      }
    }
  }

  return { ok: false, error: 'Caminho ritual inválido: Main não encontrado na cadeia de ligações.' }
}

function netBracesOnLine(line: string): number {
  let count = 0
  let inString = false
  let escape = false

  for (const ch of line) {
    if (escape) {
      escape = false
      continue
    }
    if (ch === '\\') {
      escape = true
      continue
    }
    if (ch === '"') {
      inString = !inString
      continue
    }
    if (inString) {
      continue
    }
    if (ch === '{') {
      count += 1
    }
    if (ch === '}') {
      count -= 1
    }
  }

  return count
}

function findBlockEndLine(lines: string[], startLine: number): number {
  let depth = 0
  let started = false

  for (let i = startLine; i < lines.length; i++) {
    depth += netBracesOnLine(lines[i] ?? '')
    if (depth > 0) {
      started = true
    }
    if (started && depth <= 0) {
      return i
    }
  }

  return lines.length - 1
}

function lineStartOffsets(text: string): number[] {
  const offsets = [0]

  for (let i = 0; i < text.length; i++) {
    if (text[i] === '\n') {
      offsets.push(i + 1)
    }
  }

  return offsets
}

function rangeFromLines(
  text: string,
  startLine: number,
  endLine: number,
  lines: string[],
): RitualBlockRange {
  const offsets = lineStartOffsets(text)
  const start = offsets[startLine] ?? 0
  const end =
    endLine + 1 < offsets.length ? offsets[endLine + 1]! : text.length
  const openingLine = lines[startLine] ?? ''
  const openingLineIndent = openingLine.match(/^(\s*)/)?.[1] ?? ''

  return { start, end, startLine, openingLineIndent }
}

type ScalarFingerprint = {
  fieldNames: string[]
  valuePattern: RegExp
}

function parameterValue(node: NodeInstance, parameterId: string, fallback = ''): string {
  return node.values.find((entry) => entry.parameterId === parameterId)?.value ?? fallback
}

function mapEntryKeyCandidates(entryKey: string): string[] {
  const trimmed = entryKey.trim()
  const out = new Set<string>()

  out.add(formatMapEntryKey(trimmed))

  if (/^0x[0-9a-fA-F]+$/i.test(trimmed)) {
    out.add(trimmed)
    return [...out]
  }

  const unquoted = trimmed.replace(/^"|"$/g, '')
  out.add(formatMapEntryKey(unquoted))
  out.add(formatMapEntryKey(unquoted.replace(/\//g, '_')))
  out.add(formatMapEntryKey(unquoted.replace(/_/g, '/')))

  return [...out]
}

function buildNodeFingerprints(canvasNode: CanvasNode): ScalarFingerprint[] {
  const fingerprints: ScalarFingerprint[] = []
  const instance = canvasNode.node

  for (const parameter of instance.schema.parameters) {
    if (isMapHashParameterType(parameter.type)) {
      continue
    }
    if (parameter.type === 'comment' || parameter.type === 'property') {
      continue
    }

    const raw = parameterValue(instance, parameter.id, parameter.defaultValue).trim()
    if (!raw) {
      continue
    }

    if (isBlockTokenValue(raw)) {
      const exportName = ritualExportFieldNameFromParameter(parameter)
      fingerprints.push({
        fieldNames: [exportName, parameter.name],
        valuePattern: new RegExp(escapeRegExp(raw), 'i'),
      })
      continue
    }

    const exportName = ritualExportFieldNameFromParameter(parameter)
    const schemaName = ritualExportFieldName(parameter.name)
    const fieldNames = [...new Set([exportName, schemaName, parameter.name])]

    const escapedValue = escapeRegExp(raw.replace(/^"|"$/g, ''))
    const valuePattern = raw.startsWith('"')
      ? new RegExp(`=\\s*"${escapedValue}"`, 'i')
      : new RegExp(`=\\s*${escapedValue}\\b`, 'i')

    fingerprints.push({ fieldNames, valuePattern })

    const assignment = formatRitualScalarAssignment(parameter, raw, '').trim()
    fingerprints.push({
      fieldNames: [assignment.split(':')[0]?.trim() ?? exportName],
      valuePattern: new RegExp(escapeRegExp(assignment), 'i'),
    })
  }

  return fingerprints
}

function scoreBlockAgainstFingerprints(blockText: string, fingerprints: ScalarFingerprint[]): number {
  if (fingerprints.length === 0) {
    return 0
  }

  let score = 0

  for (const fp of fingerprints) {
    const fieldHit = fp.fieldNames.some((name) => {
      const pattern = new RegExp(`\\b${escapeRegExp(name)}\\s*:`, 'i')
      return pattern.test(blockText)
    })
    if (fieldHit && fp.valuePattern.test(blockText)) {
      score += 2
    } else if (fp.valuePattern.test(blockText)) {
      score += 1
    }
  }

  return score
}

function lineMatchesMapEntryWithKey(
  line: string,
  keyLabel: string,
  typeTitle: string,
): boolean {
  const pattern = new RegExp(
    `^\\s*${escapeRegExp(keyLabel)}\\s*=\\s*${escapeRegExp(typeTitle)}\\s*\\{`,
  )
  return pattern.test(line)
}

function lineMatchesMapEntryType(line: string, typeTitle: string): boolean {
  const pattern = new RegExp(
    `^\\s*(?:"[^"]+"|0x[0-9a-fA-F]+)\\s*=\\s*${escapeRegExp(typeTitle)}\\s*\\{`,
  )
  return pattern.test(line)
}

function findMapEntryOpeningLine(
  lines: string[],
  scopeStart: number,
  scopeEnd: number,
  segment: Extract<RitualPathSegment, { kind: 'mapEntry' }>,
  fingerprints: ScalarFingerprint[],
): number | null {
  const keyCandidates = mapEntryKeyCandidates(segment.entryKey)
  const keyMatches: number[] = []

  for (const keyLabel of keyCandidates) {
    for (let i = scopeStart; i <= scopeEnd; i++) {
      if (lineMatchesMapEntryWithKey(lines[i] ?? '', keyLabel, segment.typeTitle)) {
        keyMatches.push(i)
      }
    }
    if (keyMatches.length === 1) {
      return keyMatches[0]!
    }
    if (keyMatches.length > 1) {
      break
    }
  }

  const typeMatches: number[] = []
  for (let i = scopeStart; i <= scopeEnd; i++) {
    if (lineMatchesMapEntryType(lines[i] ?? '', segment.typeTitle)) {
      typeMatches.push(i)
    }
  }

  if (typeMatches.length === 0) {
    return null
  }

  if (typeMatches.length === 1 && keyMatches.length === 0) {
    return typeMatches[0]!
  }

  const candidates = [...new Set([...keyMatches, ...typeMatches])]
  if (fingerprints.length === 0) {
    return candidates.length === 1 ? candidates[0]! : null
  }

  let bestLine: number | null = null
  let bestScore = 0
  let tie = false

  for (const line of candidates) {
    const endLine = findBlockEndLine(lines, line)
    const blockText = lines.slice(line, endLine + 1).join('\n')
    const score = scoreBlockAgainstFingerprints(blockText, fingerprints)
    if (score > bestScore) {
      bestScore = score
      bestLine = line
      tie = false
    } else if (score === bestScore && score > 0) {
      tie = true
    }
  }

  if (bestLine !== null && bestScore > 0 && !tie) {
    return bestLine
  }

  if (candidates.length === 1) {
    return candidates[0]!
  }

  return null
}

function lineMatchesStructuralChild(
  line: string,
  fieldName: string,
  ritKeyword: 'embed' | 'pointer' | 'link',
  childTypeTitle: string,
): boolean {
  const pattern = new RegExp(
    `^\\s*${escapeRegExp(fieldName)}\\s*:\\s*${ritKeyword}\\s*=\\s*${escapeRegExp(childTypeTitle)}\\s*\\{`,
  )
  return pattern.test(line)
}

function lineMatchesListOpen(line: string, fieldName: string, listKind: 'list' | 'list2', slot: 'embed' | 'pointer'): boolean {
  const pattern = new RegExp(
    `^\\s*${escapeRegExp(fieldName)}\\s*:\\s*${listKind}\\[${slot}\\]\\s*=\\s*\\{\\s*$`,
  )
  return pattern.test(line)
}

function lineMatchesChildTypeBlock(line: string, typeTitle: string): boolean {
  const pattern = new RegExp(`^\\s*${escapeRegExp(typeTitle)}\\s*\\{`)
  return pattern.test(line)
}

function pickBestBlockCandidate(
  lines: string[],
  matches: number[],
  fingerprints: ScalarFingerprint[],
): number | null {
  if (matches.length === 0) {
    return null
  }

  if (matches.length === 1) {
    return matches[0]!
  }

  if (fingerprints.length === 0) {
    return null
  }

  let bestLine: number | null = null
  let bestScore = 0
  let tie = false

  for (const line of matches) {
    const endLine = findBlockEndLine(lines, line)
    const blockText = lines.slice(line, endLine + 1).join('\n')
    const score = scoreBlockAgainstFingerprints(blockText, fingerprints)
    if (score > bestScore) {
      bestScore = score
      bestLine = line
      tie = false
    } else if (score === bestScore && score > 0) {
      tie = true
    }
  }

  if (bestLine !== null && bestScore > 0 && !tie) {
    return bestLine
  }

  return null
}

function findLineInScope(
  lines: string[],
  scopeStart: number,
  scopeEnd: number,
  predicate: (line: string, lineIndex: number) => boolean,
  fingerprints: ScalarFingerprint[] = [],
): number | null {
  const matches: number[] = []

  for (let i = scopeStart; i <= scopeEnd; i++) {
    if (predicate(lines[i] ?? '', i)) {
      matches.push(i)
    }
  }

  return pickBestBlockCandidate(lines, matches, fingerprints)
}

function findNthChildTypeBlockInScope(
  lines: string[],
  scopeStart: number,
  scopeEnd: number,
  typeTitle: string,
  index: number,
): number | null {
  const matches: number[] = []

  for (let i = scopeStart; i <= scopeEnd; i++) {
    if (lineMatchesChildTypeBlock(lines[i] ?? '', typeTitle)) {
      matches.push(i)
    }
  }

  if (index < 0 || index >= matches.length) {
    return null
  }

  return matches[index]!
}

function locateSegmentOpeningLine(
  lines: string[],
  scopeStart: number,
  scopeEnd: number,
  segment: RitualPathSegment,
  fingerprints: ScalarFingerprint[],
): number | null {
  switch (segment.kind) {
    case 'main':
      return 0
    case 'standalone':
      return findLineInScope(
        lines,
        scopeStart,
        scopeEnd,
        (line) => lineMatchesChildTypeBlock(line, segment.typeTitle),
        fingerprints,
      )
    case 'mapEntry':
      return findMapEntryOpeningLine(lines, scopeStart, scopeEnd, segment, fingerprints)
    case 'internal':
      return findLineInScope(
        lines,
        scopeStart,
        scopeEnd,
        (line) =>
          lineMatchesStructuralChild(line, segment.fieldName, 'link', segment.childTypeTitle),
        fingerprints,
      )
    case 'embed':
      return findLineInScope(
        lines,
        scopeStart,
        scopeEnd,
        (line) =>
          lineMatchesStructuralChild(line, segment.fieldName, 'embed', segment.childTypeTitle),
        fingerprints,
      )
    case 'pointer':
      return findLineInScope(
        lines,
        scopeStart,
        scopeEnd,
        (line) =>
          lineMatchesStructuralChild(line, segment.fieldName, 'pointer', segment.childTypeTitle),
        fingerprints,
      )
    case 'listEmbed': {
      const listLine = findLineInScope(lines, scopeStart, scopeEnd, (line) =>
        lineMatchesListOpen(line, segment.fieldName, 'list', 'embed'),
      )
      if (listLine === null || listLine < 0) {
        return listLine
      }
      const listEnd = findBlockEndLine(lines, listLine)
      return findNthChildTypeBlockInScope(
        lines,
        listLine + 1,
        listEnd,
        segment.childTypeTitle,
        segment.index,
      )
    }
    case 'listPointer': {
      const listLine = findLineInScope(lines, scopeStart, scopeEnd, (line) =>
        lineMatchesListOpen(line, segment.fieldName, 'list', 'pointer'),
      )
      if (listLine === null || listLine < 0) {
        return listLine
      }
      const listEnd = findBlockEndLine(lines, listLine)
      return findNthChildTypeBlockInScope(
        lines,
        listLine + 1,
        listEnd,
        segment.childTypeTitle,
        segment.index,
      )
    }
    case 'list2Embed': {
      const listLine = findLineInScope(lines, scopeStart, scopeEnd, (line) =>
        lineMatchesListOpen(line, segment.fieldName, 'list2', 'embed'),
      )
      if (listLine === null || listLine < 0) {
        return listLine
      }
      const listEnd = findBlockEndLine(lines, listLine)
      return findNthChildTypeBlockInScope(
        lines,
        listLine + 1,
        listEnd,
        segment.childTypeTitle,
        segment.instanceIndex,
      )
    }
    case 'list2Pointer': {
      const listLine = findLineInScope(lines, scopeStart, scopeEnd, (line) =>
        lineMatchesListOpen(line, segment.fieldName, 'list2', 'pointer'),
      )
      if (listLine === null || listLine < 0) {
        return listLine
      }
      const listEnd = findBlockEndLine(lines, listLine)
      return findNthChildTypeBlockInScope(
        lines,
        listLine + 1,
        listEnd,
        segment.childTypeTitle,
        segment.instanceIndex,
      )
    }
    default:
      return null
  }
}

export function locateRitualBlockRange(
  text: string,
  path: RitualPathToNode,
  options?: { scene?: CanvasScene },
): RitualBlockRange | null {
  if (path.isMain) {
    const trimmed = text.endsWith('\n') ? text : `${text}\n`
    return {
      start: 0,
      end: trimmed.length,
      startLine: 0,
      openingLineIndent: '',
    }
  }

  const targetNode =
    options?.scene !== undefined
      ? findCanvasNode(options.scene, path.targetNodeId)
      : undefined
  const fingerprints = targetNode ? buildNodeFingerprints(targetNode) : []

  const lines = text.split('\n')
  let scopeStart = 0
  let scopeEnd = lines.length - 1

  for (let i = 0; i < path.segments.length; i++) {
    const segment = path.segments[i]!

    if (segment.kind === 'main') {
      continue
    }

    const openingLine = locateSegmentOpeningLine(lines, scopeStart, scopeEnd, segment, fingerprints)

    if (openingLine === null) {
      return null
    }

    const isTargetSegment = i === path.segments.length - 1

    if (isTargetSegment) {
      const endLine = findBlockEndLine(lines, openingLine)
      return rangeFromLines(text, openingLine, endLine, lines)
    }

    scopeStart = openingLine
    scopeEnd = findBlockEndLine(lines, openingLine)
  }

  return null
}

function indentFromLength(length: number): string {
  return ' '.repeat(length)
}

function emitSingleLinkBlock(
  emitter: RitualEmitter,
  scene: CanvasScene,
  link: OutgoingLink,
  depth: number,
): string[] {
  const pad = indentFromLength(depth)
  const child = findCanvasNode(scene, link.childCanvasId)

  if (!child) {
    emitter.warnings.push(`Filho «${link.childCanvasId}» não encontrado.`)
    return []
  }

  const bodyDepth = depth + INDENT_STEP

  switch (link.kind) {
    case 'mapHashEmbed': {
      const typeTitle = child.node.schema.title
      const keyLabel = formatMapEntryKey(link.entryKey)
      return [
        `${pad}${keyLabel} = ${typeTitle} {`,
        ...emitter.emitTypeBody(child, bodyDepth),
        `${pad}}`,
      ]
    }
    case 'internal': {
      const fieldName = ritualExportFieldName(link.fieldName)
      const childTitle = child.node.schema.title
      return [
        `${pad}${fieldName}: link = ${childTitle} {`,
        ...emitter.emitTypeBody(child, bodyDepth),
        `${pad}}`,
      ]
    }
    case 'embed': {
      const fieldName = ritualExportBlockTitle(link.fieldName)
      const childTitle = child.node.schema.title
      return [
        `${pad}${fieldName}: embed = ${childTitle} {`,
        ...emitter.emitTypeBody(child, bodyDepth),
        `${pad}}`,
      ]
    }
    case 'pointer': {
      const fieldName = ritualExportBlockTitle(link.fieldName)
      const childTitle = child.node.schema.title
      return [
        `${pad}${fieldName}: pointer = ${childTitle} {`,
        ...emitter.emitTypeBody(child, bodyDepth),
        `${pad}}`,
      ]
    }
    case 'listEmbed':
    case 'listPointer':
    case 'list2Embed':
    case 'list2Pointer': {
      const childTitle = child.node.schema.title
      return [
        `${pad}${childTitle} {`,
        ...emitter.emitTypeBody(child, bodyDepth),
        `${pad}}`,
      ]
    }
    default:
      return []
  }
}

export function emitInPlaceRitualBlock(
  scene: CanvasScene,
  registry: Record<string, NodeSchemaDefinition>,
  path: RitualPathToNode,
  openingLineIndent: string,
): { text: string; warnings: string[] } {
  const canvasNode = findCanvasNode(scene, path.targetNodeId)

  if (!canvasNode) {
    return { text: '', warnings: ['Nó alvo não encontrado.'] }
  }

  if (path.isMain) {
    const { text, warnings } = emitMainPropFile(canvasNode, scene, registry)
    return { text, warnings }
  }

  const emitter = new RitualEmitter(scene, registry, path.targetNodeId)
  const depth = openingLineIndent.length

  if (path.incomingLink) {
    const lines = emitSingleLinkBlock(emitter, scene, path.incomingLink, depth)
    return { text: `${lines.join('\n')}\n`, warnings: emitter.warnings }
  }

  const title = canvasNode.node.schema.title
  const bodyLines = emitter.emitTypeBody(canvasNode, INDENT_STEP)
  const lines = [`${openingLineIndent}${title} {`, ...bodyLines, `${openingLineIndent}}`]
  return { text: `${lines.join('\n')}\n`, warnings: emitter.warnings }
}

export function syncCanvasNodeToCode(
  scene: CanvasScene,
  registry: Record<string, NodeSchemaDefinition>,
  nodeId: string,
  editorText: string,
): SyncCanvasNodeToCodeResult {
  const pathBuilt = buildRitualPathToNode(scene, nodeId)

  if (!pathBuilt.ok) {
    return { ok: false, error: pathBuilt.error }
  }

  const path = pathBuilt.path
  const range = locateRitualBlockRange(editorText, path, { scene })

  if (!range) {
    const canvasNode = findCanvasNode(scene, nodeId)
    const title = canvasNode?.node.schema.title ?? nodeId
    const mapSegment = path.segments.find(
      (segment): segment is Extract<RitualPathSegment, { kind: 'mapEntry' }> =>
        segment.kind === 'mapEntry',
    )
    const keyHint = mapSegment
      ? ` (chave no grafo: ${formatMapEntryKey(mapSegment.entryKey)})`
      : ''

    return {
      ok: false,
      error:
        `Não foi possível localizar o bloco «${title}»${keyHint} no editor. ` +
        'Se o ficheiro usa chaves hash (0x…) e o grafo usa caminhos string (ou o contrário), confirme que particleName/flags e outros valores únicos coincidem. ' +
        'Em ficheiros com vários blocos do mesmo tipo, o sync usa os valores do nó para desambiguar.',
    }
  }

  const emitted = emitInPlaceRitualBlock(scene, registry, path, range.openingLineIndent)

  const replacement = emitted.text.endsWith('\n') ? emitted.text : `${emitted.text}\n`
  const newText = editorText.slice(0, range.start) + replacement + editorText.slice(range.end)

  return {
    ok: true,
    newText,
    startLine: range.startLine,
    warnings: emitted.warnings,
  }
}

/** Valida se o texto do editor parece ritual Class Group (para pré-condições UI). */
export function editorTextLooksLikeClassGroupRitual(text: string): boolean {
  const trimmed = text.trim()
  return trimmed.startsWith('#PROP_text') || /entries:\s*map\[hash,embed\]/i.test(trimmed)
}
