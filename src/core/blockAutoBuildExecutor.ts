import type { BlockDefinitionJsonDocument } from './blockDefinitionJson'
import { writeBlockDefinitionDocument } from './blockDefinitionStorage'
import type { BlockAutoBuildPlan } from './blockAutoBuild'
import { registerBlockParameterInCatalog } from './blockParameterCatalogRegistry'
import type { BlockParameterJsonDocument } from './blockParameterJson'
import { validateBlockParameterDocument } from './blockParameterRegistry'
import { writeBlockParameterDocuments } from './blockParameterStorage'

const PARAMETER_WRITE_BATCH_SIZE = 48

export type AutoBuildWorkKind = 'parameter' | 'block'

export type AutoBuildWorkItem = {
  kind: AutoBuildWorkKind
  label: string
  documentId: string
  parameterDocument?: BlockParameterJsonDocument
  blockDocument?: BlockDefinitionJsonDocument
}

export type AutoBuildProgress = {
  completed: number
  total: number
  currentLabel: string
  currentKind: AutoBuildWorkKind
}

export type AutoBuildRunResult = {
  cancelled: boolean
  written: string[]
  overwritten: string[]
  skipped: string[]
  errors: string[]
  planErrors: string[]
  nodesProcessed: number
}

export type ExecuteAutoBuildWorkItemsOptions = {
  items: readonly AutoBuildWorkItem[]
  nodesProcessed: number
  planErrors: readonly string[]
  shouldCancel?: () => boolean
  onProgress?: (progress: AutoBuildProgress) => void
}

function parameterLabel(document: BlockParameterJsonDocument): string {
  const name = document.name.trim()
  if (name) {
    return name
  }
  return document.parameterName.trim() || document.id
}

function blockLabel(document: BlockDefinitionJsonDocument): string {
  const name = document.name.trim()
  if (name) {
    return name
  }
  return document.blockName.trim() || document.id
}

function mergeBlockDocumentParameters(
  current: BlockDefinitionJsonDocument,
  incoming: BlockDefinitionJsonDocument,
): BlockDefinitionJsonDocument {
  if (current.id !== incoming.id) {
    return current
  }

  const mergedParameters = [...new Set([...current.parameters, ...incoming.parameters])]
  const mergedHeaderSlots = mergeHeaderSlots(current.headerSlots, incoming.headerSlots)
  const parametersUnchanged =
    mergedParameters.length === current.parameters.length &&
    mergedParameters.every((entry, index) => entry === current.parameters[index])
  const headerSlotsUnchanged =
    mergedHeaderSlots.length === current.headerSlots.length &&
    mergedHeaderSlots.every((entry, index) => entry === current.headerSlots[index])
  if (parametersUnchanged && headerSlotsUnchanged) {
    return current
  }

  return {
    ...current,
    headerSlots: mergedHeaderSlots,
    parameters: mergedParameters,
  }
}

function parseHeaderSlot(
  descriptor: string,
): { direction: 'in' | 'out'; types: string[] } | null {
  const trimmed = descriptor.trim()
  const outMatch = /^(?:output|out)\[(.+)\]$/i.exec(trimmed)
  if (outMatch) {
    return {
      direction: 'out',
      types: outMatch[1].split(',').map((entry) => entry.trim()).filter(Boolean),
    }
  }
  const inMatch = /^(?:input|in)\[(.+)\]$/i.exec(trimmed)
  if (inMatch) {
    return {
      direction: 'in',
      types: inMatch[1].split(',').map((entry) => entry.trim()).filter(Boolean),
    }
  }
  return null
}

function mergeHeaderSlots(current: string[], incoming: string[]): string[] {
  const source = [...current, ...incoming]
  const inTypes: string[] = []
  const outTypes: string[] = []
  const passthrough: string[] = []

  const pushUnique = (target: string[], value: string) => {
    if (!target.includes(value)) {
      target.push(value)
    }
  }

  for (const descriptor of source) {
    const parsed = parseHeaderSlot(descriptor)
    if (!parsed) {
      pushUnique(passthrough, descriptor)
      continue
    }
    const target = parsed.direction === 'in' ? inTypes : outTypes
    for (const type of parsed.types) {
      pushUnique(target, type)
    }
  }

  const merged: string[] = []
  if (inTypes.length > 0) {
    merged.push(`in[${inTypes.join(',')}]`)
  }
  if (outTypes.length > 0) {
    merged.push(`out[${outTypes.join(',')}]`)
  }
  for (const descriptor of passthrough) {
    pushUnique(merged, descriptor)
  }
  return merged
}

function parameterWorkItemKey(document: BlockParameterJsonDocument): string {
  return `${document.block.trim()}::${document.id}`
}

export function flattenAutoBuildWorkItems(plan: BlockAutoBuildPlan): AutoBuildWorkItem[] {
  const paramByKey = new Map<string, AutoBuildWorkItem>()
  const blockById = new Map<string, AutoBuildWorkItem>()

  for (const document of plan.parameterDocuments) {
    paramByKey.set(parameterWorkItemKey(document), {
      kind: 'parameter',
      label: parameterLabel(document),
      documentId: document.id,
      parameterDocument: document,
    })
  }

  for (const document of plan.blockDocuments) {
    const existing = blockById.get(document.id)
    const mergedDocument =
      existing?.blockDocument
        ? mergeBlockDocumentParameters(existing.blockDocument, document)
        : document

    blockById.set(document.id, {
      kind: 'block',
      label: blockLabel(mergedDocument),
      documentId: document.id,
      blockDocument: mergedDocument,
    })
  }

  const parameters = [...paramByKey.values()].sort((a, b) =>
    parameterWorkItemKey(a.parameterDocument!).localeCompare(
      parameterWorkItemKey(b.parameterDocument!),
    ),
  )
  const blocks = [...blockById.values()].sort((a, b) => a.documentId.localeCompare(b.documentId))

  return [...parameters, ...blocks]
}

function yieldToUi(): Promise<void> {
  return new Promise((resolve) => {
    window.requestAnimationFrame(() => resolve())
  })
}

export async function executeAutoBuildWorkItems(
  options: ExecuteAutoBuildWorkItemsOptions,
): Promise<AutoBuildRunResult> {
  const { items, nodesProcessed, planErrors, shouldCancel, onProgress } = options
  const total = items.length
  const written: string[] = []
  const overwritten: string[] = []
  const skipped: string[] = []
  const errors: string[] = []
  let completed = 0
  let cancelled = false

  for (const item of items) {
    if (shouldCancel?.()) {
      cancelled = true
      break
    }

    if (item.kind === 'block') {
      onProgress?.({
        completed,
        total,
        currentLabel: item.label,
        currentKind: item.kind,
      })

      await yieldToUi()

      if (shouldCancel?.()) {
        cancelled = true
        break
      }

      if (item.blockDocument) {
        const result = await writeBlockDefinitionDocument(item.blockDocument)
        if (!result.ok) {
          errors.push(`${item.label}: ${result.error ?? 'Erro desconhecido'}`)
        } else {
          const label = result.written ?? item.documentId
          if (result.overwritten) {
            overwritten.push(label)
          } else {
            written.push(label)
          }
        }
      }

      completed += 1

      onProgress?.({
        completed,
        total,
        currentLabel: item.label,
        currentKind: item.kind,
      })

      await yieldToUi()
    }
  }

  const parameterItems = items.filter((item) => item.kind === 'parameter')
  for (let batchStart = 0; batchStart < parameterItems.length; batchStart += PARAMETER_WRITE_BATCH_SIZE) {
    if (shouldCancel?.()) {
      cancelled = true
      break
    }

    const batch = parameterItems.slice(batchStart, batchStart + PARAMETER_WRITE_BATCH_SIZE)
    const validatedBatch: BlockParameterJsonDocument[] = []
    const batchLabels: string[] = []

    for (const item of batch) {
      if (!item.parameterDocument) {
        continue
      }
      const validated = validateBlockParameterDocument(item.parameterDocument, item.documentId)
      if (!validated.ok) {
        errors.push(`${item.label}: ${validated.errors.join('; ')}`)
        continue
      }
      validatedBatch.push(validated.value)
      batchLabels.push(item.label)
    }

    if (validatedBatch.length === 0) {
      completed += batch.length
      continue
    }

    onProgress?.({
      completed,
      total,
      currentLabel: batchLabels[0] ?? '',
      currentKind: 'parameter',
    })

    await yieldToUi()

    if (shouldCancel?.()) {
      cancelled = true
      break
    }

    const result = await writeBlockParameterDocuments(validatedBatch)
    if (!result.ok) {
      errors.push(`${batchLabels.join(', ')}: ${result.error ?? 'Erro desconhecido'}`)
    } else {
      const persistedCount = (result.written?.length ?? 0) + (result.overwritten?.length ?? 0)
      if (persistedCount === 0) {
        const skippedEntries = result.skipped ?? []
        errors.push(
          skippedEntries.length > 0
            ? `${batchLabels.join(', ')}: ignorado pelo servidor (${skippedEntries.join(', ')})`
            : `${batchLabels.join(', ')}: servidor não gravou os ficheiros`,
        )
      } else {
        for (const doc of validatedBatch) {
          registerBlockParameterInCatalog(doc)
        }
      }
      for (const entry of result.written ?? []) {
        written.push(entry)
      }
      for (const entry of result.overwritten ?? []) {
        overwritten.push(entry)
      }
      for (const entry of result.skipped ?? []) {
        skipped.push(entry)
      }
      for (const entry of result.errors ?? []) {
        errors.push(entry)
      }
    }

    completed += batch.length

    onProgress?.({
      completed,
      total,
      currentLabel: batchLabels.at(-1) ?? '',
      currentKind: 'parameter',
    })

    await yieldToUi()
  }

  return {
    cancelled,
    written,
    overwritten,
    skipped,
    errors: [...planErrors.filter((entry) => entry !== 'NO_NODES'), ...errors],
    planErrors: [...planErrors],
    nodesProcessed,
  }
}
