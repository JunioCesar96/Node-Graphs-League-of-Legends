export type DiscreteProgressWindow = 'code-editor'

export type DiscreteProgressTaskConfig = {
  name: string
  window: DiscreteProgressWindow
  lockAction: boolean
}

export const DISCRETE_PROGRESS_TASK = {
  convertAllUndefinedHashes: {
    name: 'convertAllUndefinedHashes',
    window: 'code-editor',
    lockAction: false,
  },
  openFileCodeEditor: {
    name: 'openFileCodeEditor',
    window: 'code-editor',
    lockAction: false,
  },
} as const satisfies Record<string, DiscreteProgressTaskConfig>
