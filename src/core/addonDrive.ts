/** Drive simples (string literal no manifest.json). */
export type AddonSimpleDrive = 'inputChange' | 'always' | 'manual'

/** Drive por input: `inputChange{folder-input}` ↔ `id` do elemento no ui.html. */
export type AddonTargetedInputChangeDrive = {
  kind: 'inputChange'
  inputId: string
}

/** Drive por clique: `buttonClick{loadImages}` ↔ `id` do botão no ui.html. */
export type AddonButtonClickDrive = {
  kind: 'buttonClick'
  buttonId: string
}

export type AddonDrive = AddonSimpleDrive | AddonTargetedInputChangeDrive | AddonButtonClickDrive

/** Um drive ou lista de acionamentos no manifest.json. */
export type AddonManifestDrive = AddonDrive | readonly AddonDrive[]

const SIMPLE_DRIVES: ReadonlySet<string> = new Set(['inputChange', 'always', 'manual'])

const TARGETED_INPUT_CHANGE_DRIVE_RE = /^inputChange\{([^}]+)\}$/i
const BUTTON_CLICK_DRIVE_RE = /^buttonClick\{([^}]+)\}$/i

/** Converte o campo `drive` do manifest (string) para o tipo normalizado. */
export function parseAddonDrive(raw: string): AddonDrive | null {
  const trimmed = raw.trim()
  if (SIMPLE_DRIVES.has(trimmed)) {
    return trimmed as AddonSimpleDrive
  }
  const inputMatch = TARGETED_INPUT_CHANGE_DRIVE_RE.exec(trimmed)
  const inputId = inputMatch?.[1]?.trim()
  if (inputId) {
    return { kind: 'inputChange', inputId }
  }
  const buttonMatch = BUTTON_CLICK_DRIVE_RE.exec(trimmed)
  const buttonId = buttonMatch?.[1]?.trim()
  if (buttonId) {
    return { kind: 'buttonClick', buttonId }
  }
  return null
}

/** Normaliza `drive` do manifest (string, array de strings ou já parseado). */
export function parseAddonDriveField(raw: unknown): AddonDrive[] | null {
  if (typeof raw === 'string') {
    const parsed = parseAddonDrive(raw)
    return parsed ? [parsed] : null
  }
  if (!Array.isArray(raw) || raw.length === 0) {
    return null
  }
  const drives: AddonDrive[] = []
  for (const item of raw) {
    if (typeof item === 'string') {
      const parsed = parseAddonDrive(item)
      if (!parsed) {
        return null
      }
      drives.push(parsed)
      continue
    }
    if (isParsedAddonDrive(item)) {
      drives.push(item)
      continue
    }
    return null
  }
  return drives
}

function isParsedAddonDrive(value: unknown): value is AddonDrive {
  if (typeof value === 'string') {
    return SIMPLE_DRIVES.has(value)
  }
  if (typeof value === 'object' && value !== null) {
    const kind = (value as { kind?: string }).kind
    return kind === 'inputChange' || kind === 'buttonClick'
  }
  return false
}

export function resolveAddonDrives(drive: AddonManifestDrive): readonly AddonDrive[] {
  return Array.isArray(drive) ? drive : [drive]
}

export function hasGlobalInputReactiveDrive(drives: readonly AddonDrive[]): boolean {
  return drives.some(isGlobalInputReactiveDrive)
}

export function hasTargetedInputChangeDrive(drives: readonly AddonDrive[]): boolean {
  return drives.some(isTargetedInputChangeDrive)
}

export function hasButtonClickDriveInList(drives: readonly AddonDrive[]): boolean {
  return drives.some(isButtonClickDrive)
}

export function shouldRunInputDriveForTarget(
  drives: readonly AddonDrive[],
  target: EventTarget | null,
  wiredSlotNames: ReadonlySet<string>,
): boolean {
  if (!isAddonDriveFormElement(target)) {
    return false
  }
  const elementId = target.id?.trim()
  for (const drive of drives) {
    if (isTargetedInputChangeDrive(drive) && elementId && matchesAddonDriveElementId(drive.inputId, elementId)) {
      return true
    }
  }
  if (!hasGlobalInputReactiveDrive(drives)) {
    return false
  }
  if (target instanceof HTMLInputElement && wiredSlotNames.has(target.name)) {
    return false
  }
  return true
}

export function matchesAnyButtonClickDrive(
  drives: readonly AddonDrive[],
  elementId: string,
): boolean {
  const id = elementId.trim()
  if (!id) {
    return false
  }
  return drives.some(
    (drive) => isButtonClickDrive(drive) && matchesAddonDriveElementId(drive.buttonId, id),
  )
}

export function isAddonSimpleDrive(drive: AddonDrive): drive is AddonSimpleDrive {
  return typeof drive === 'string'
}

/** `inputChange` ou `always` — reage a qualquer input do card (+ feed do grafo). */
export function isGlobalInputReactiveDrive(drive: AddonDrive): boolean {
  return drive === 'inputChange' || drive === 'always'
}

export function isTargetedInputChangeDrive(drive: AddonDrive): drive is AddonTargetedInputChangeDrive {
  return typeof drive === 'object' && drive.kind === 'inputChange'
}

/** @deprecated Use isGlobalInputReactiveDrive — mantido para compatibilidade interna. */
export function isInputReactiveDrive(drive: AddonDrive): boolean {
  return isGlobalInputReactiveDrive(drive) || isTargetedInputChangeDrive(drive)
}

export function isButtonClickDrive(drive: AddonDrive): drive is AddonButtonClickDrive {
  return typeof drive === 'object' && drive.kind === 'buttonClick'
}

function camelToKebab(value: string): string {
  return value
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/_/g, '-')
    .toLowerCase()
}

/** Aceita ids em camelCase no manifest e kebab-case no HTML (ex.: `folderInput` ↔ `folder-input`). */
export function matchesAddonDriveElementId(driveElementId: string, elementId: string): boolean {
  const a = driveElementId.trim()
  const b = elementId.trim()
  if (!a || !b) {
    return false
  }
  if (a === b) {
    return true
  }
  if (camelToKebab(a) === b) {
    return true
  }
  if (a === camelToKebab(b)) {
    return true
  }
  return false
}

/** @deprecated Alias de matchesAddonDriveElementId. */
export function matchesAddonDriveButtonId(driveButtonId: string, elementId: string): boolean {
  return matchesAddonDriveElementId(driveButtonId, elementId)
}

export function isAddonDriveFormElement(
  target: EventTarget | null,
): target is HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement {
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement
  )
}
