import { hasGlobalInputReactiveDrive, resolveAddonDrives } from '@/core/addonDrive'
import type { AddonManifest, AddonPackage } from '@/services/addonLoader.service'

function inputElement(cardDOM: HTMLElement, slotName: string): HTMLInputElement | HTMLTextAreaElement | null {
  const el = cardDOM.querySelector(
    `input[name="${slotName}"], textarea[name="${slotName}"]`,
  )
  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
    return el
  }
  return null
}

function isSlotWired(wiredSlotNames: ReadonlySet<string>, slotName: string): boolean {
  return wiredSlotNames.has(slotName)
}

/** Sincroniza valores do grafo apenas em slots com fio ligado. */
export function syncWiredAddonInputsToDom(
  manifest: AddonManifest,
  wiredInputs: Record<string, unknown>,
  wiredSlotNames: ReadonlySet<string>,
  cardDOM: HTMLElement,
): void {
  for (const slot of manifest.data) {
    if (slot.direction !== 'input' || !isSlotWired(wiredSlotNames, slot.name)) {
      continue
    }
    const el = inputElement(cardDOM, slot.name)
    if (!el) {
      continue
    }
    const next = String(wiredInputs[slot.name] ?? '')
    if (el.value !== next) {
      el.value = next
    }
  }
}

/** Sem fio no slot → editável. Com fio → só-leitura (valor vem do grafo). */
export function applyAddonInputFieldInteraction(
  manifest: AddonManifest,
  wiredSlotNames: ReadonlySet<string>,
  cardDOM: HTMLElement,
): void {
  for (const slot of manifest.data) {
    if (slot.direction !== 'input') {
      continue
    }
    const el = inputElement(cardDOM, slot.name)
    if (!el) {
      continue
    }
    const wired = isSlotWired(wiredSlotNames, slot.name)
    el.readOnly = wired
    el.dataset.addonWired = wired ? '1' : '0'
    if (wired) {
      el.title = 'Slot ligado no grafo — edição bloqueada'
    } else {
      el.removeAttribute('title')
    }
  }
}

export function isAddonInputFieldWired(
  wiredSlotNames: ReadonlySet<string>,
  slotName: string,
): boolean {
  return wiredSlotNames.has(slotName)
}

/** Slots ligados usam o grafo; slots livres leem o valor actual do DOM. */
export function mergeWiredAndDomAddonInputs(
  manifest: AddonManifest,
  wiredInputs: Record<string, unknown>,
  wiredSlotNames: ReadonlySet<string>,
  cardDOM: HTMLElement,
): Record<string, unknown> {
  const merged: Record<string, unknown> = {}

  for (const slot of manifest.data) {
    if (slot.direction !== 'input') {
      continue
    }
    if (isSlotWired(wiredSlotNames, slot.name)) {
      merged[slot.name] = wiredInputs[slot.name] ?? ''
      continue
    }
    const el = inputElement(cardDOM, slot.name)
    merged[slot.name] = el?.value ?? ''
  }

  return merged
}

export type AddonInputDriveContext = {
  wiredInputs: Record<string, unknown>
  wiredSlotNames: ReadonlySet<string>
}

function isPromiseLike(value: unknown): value is Promise<Record<string, unknown>> {
  return (
    value !== null &&
    typeof value === 'object' &&
    typeof (value as Promise<unknown>).then === 'function'
  )
}

function reportAddonExecuteError(addonId: string, cardDOM: HTMLElement, error: unknown): void {
  const logContainer = cardDOM.querySelector('[name="console-log"]')
  const message = error instanceof Error ? error.message : String(error)
  if (logContainer) {
    logContainer.textContent = `CRITICAL_ERROR: ${message}`
  } else {
    console.error(`Error executing add-on [${addonId}]:`, error)
  }
}

function deliverExecuteOutputs(
  addonId: string,
  cardDOM: HTMLElement,
  outputs: Record<string, unknown> | Promise<Record<string, unknown>>,
  pipelineCallback: (outputs: Record<string, unknown>) => void,
): void {
  if (isPromiseLike(outputs)) {
    outputs.then(pipelineCallback).catch((error) => reportAddonExecuteError(addonId, cardDOM, error))
    return
  }
  pipelineCallback(outputs)
}

export const ReactiveDriveEngine = {
  evaluateInputChange(
    addonPkg: AddonPackage,
    cardDOM: HTMLElement,
    context: AddonInputDriveContext,
    pipelineCallback: (outputs: Record<string, unknown>) => void,
  ): void {
    const { wiredInputs, wiredSlotNames } = context
    try {
      applyAddonInputFieldInteraction(addonPkg.manifest, wiredSlotNames, cardDOM)
      syncWiredAddonInputsToDom(addonPkg.manifest, wiredInputs, wiredSlotNames, cardDOM)
      const mergedInputs = mergeWiredAndDomAddonInputs(
        addonPkg.manifest,
        wiredInputs,
        wiredSlotNames,
        cardDOM,
      )
      const outputs = addonPkg.execute(mergedInputs, cardDOM)
      deliverExecuteOutputs(addonPkg.manifest.id, cardDOM, outputs, pipelineCallback)
    } catch (error) {
      reportAddonExecuteError(addonPkg.manifest.id, cardDOM, error)
    }
  },

  evaluateButtonClick(
    addonPkg: AddonPackage,
    cardDOM: HTMLElement,
    context: AddonInputDriveContext,
    pipelineCallback: (outputs: Record<string, unknown>) => void,
  ): void {
    ReactiveDriveEngine.evaluateInputChange(addonPkg, cardDOM, context, pipelineCallback)
  },

  evaluateForDrive(
    addonPkg: AddonPackage,
    cardDOM: HTMLElement,
    context: AddonInputDriveContext,
    pipelineCallback: (outputs: Record<string, unknown>) => void,
  ): void {
    if (hasGlobalInputReactiveDrive(resolveAddonDrives(addonPkg.manifest.drive))) {
      ReactiveDriveEngine.evaluateInputChange(addonPkg, cardDOM, context, pipelineCallback)
    }
  },
}
