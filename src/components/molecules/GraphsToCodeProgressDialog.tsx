import styles from './CodeToCanvasWizardPanel.module.css'

export type GraphsToCodeProgressState = {
  label: string
  ratio: number
}

type GraphsToCodeProgressDialogProps = {
  progress: GraphsToCodeProgressState
}

export function GraphsToCodeProgressDialog({ progress }: GraphsToCodeProgressDialogProps) {
  const percent = Math.round(Math.min(1, Math.max(0, progress.ratio)) * 100)

  return (
    <div className={styles.backdrop} role="presentation">
      <div
        aria-labelledby="graphs-to-code-progress-title"
        aria-modal="true"
        className={styles.panel}
        role="dialog"
      >
        <h2 className={styles.title} id="graphs-to-code-progress-title">
          Node Graphs to Code
        </h2>
        <div className={styles.progress}>
          <p className={styles.progressMeta}>{percent}%</p>
          <div
            aria-valuemax={100}
            aria-valuemin={0}
            aria-valuenow={percent}
            className={styles.progressBar}
            role="progressbar"
          >
            <div className={styles.progressFill} style={{ width: `${String(percent)}%` }} />
          </div>
        </div>
        <p className={styles.stepLabel}>{progress.label}</p>
      </div>
    </div>
  )
}
