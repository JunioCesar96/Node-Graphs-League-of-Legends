import type { DiscreteProgressTaskConfig, DiscreteProgressWindow } from './discreteProgressTasks'

export type DiscreteProgressPhase = 'running' | 'confirm' | 'summary'

export type DiscreteProgressConfirm = {
  message: string
  yesLabel: string
  noLabel: string
  kind: 'cancel' | 'tableRetry'
}

export type DiscreteProgressEntry = {
  name: string
  window: DiscreteProgressWindow
  lockAction: boolean
  phase: DiscreteProgressPhase
  completed: number
  total: number
  label: string
  detailLabel?: string
  position: { x: number; y: number }
  confirm?: DiscreteProgressConfirm
  summaryBody?: string
}

type Listener = () => void

const entries = new Map<string, DiscreteProgressEntry>()
const listeners = new Set<Listener>()

const POSITION_STORAGE_PREFIX = 'discrete-progress-pos:'

function notify(): void {
  for (const listener of listeners) {
    listener()
  }
}

function readStoredPosition(name: string): { x: number; y: number } | null {
  if (typeof window === 'undefined') {
    return null
  }
  try {
    const raw = window.localStorage.getItem(`${POSITION_STORAGE_PREFIX}${name}`)
    if (!raw) {
      return null
    }
    const parsed = JSON.parse(raw) as { x?: number; y?: number }
    if (typeof parsed.x === 'number' && typeof parsed.y === 'number') {
      return { x: parsed.x, y: parsed.y }
    }
  } catch {
    return null
  }
  return null
}

export function storeDiscreteProgressPosition(
  name: string,
  position: { x: number; y: number },
): void {
  if (typeof window === 'undefined') {
    return
  }
  try {
    window.localStorage.setItem(`${POSITION_STORAGE_PREFIX}${name}`, JSON.stringify(position))
  } catch {
    // ignore quota errors
  }
}

export function subscribeDiscreteProgress(listener: Listener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function getDiscreteProgressEntries(): DiscreteProgressEntry[] {
  return [...entries.values()]
}

export function getDiscreteProgressForWindow(window: DiscreteProgressWindow): DiscreteProgressEntry[] {
  return getDiscreteProgressEntries().filter((entry) => entry.window === window)
}

export function getDiscreteProgress(name: string): DiscreteProgressEntry | undefined {
  return entries.get(name)
}

export function startDiscreteProgress(
  task: DiscreteProgressTaskConfig,
  initial?: Partial<Omit<DiscreteProgressEntry, 'name' | 'window' | 'lockAction'>>,
): void {
  const storedPosition = readStoredPosition(task.name)
  entries.set(task.name, {
    name: task.name,
    window: task.window,
    lockAction: task.lockAction,
    phase: 'running',
    completed: 0,
    total: Math.max(initial?.total ?? 1, 1),
    label: initial?.label ?? task.name,
    detailLabel: initial?.detailLabel,
    position: initial?.position ?? storedPosition ?? { x: 0, y: 0 },
    confirm: initial?.confirm,
    summaryBody: initial?.summaryBody,
  })
  notify()
}

export function patchDiscreteProgress(
  name: string,
  patch: Partial<Omit<DiscreteProgressEntry, 'name' | 'window' | 'lockAction'>>,
): void {
  const current = entries.get(name)
  if (!current) {
    return
  }
  entries.set(name, { ...current, ...patch })
  notify()
}

export function stopDiscreteProgress(name: string): void {
  if (!entries.delete(name)) {
    return
  }
  notify()
}
