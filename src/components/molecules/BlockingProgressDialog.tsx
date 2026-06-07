import { useEffect, useId } from 'react'
import { createPortal } from 'react-dom'

import styles from './BlockingProgressDialog.module.css'

export type BlockingProgressDialogPhase = 'running' | 'confirmCancel' | 'summary' | 'error'

export type BlockingProgressDialogProps = {
  cancelConfirmMessage?: string
  cancelConfirmNoLabel?: string
  cancelConfirmTitle?: string
  cancelConfirmYesLabel?: string
  cancelLabel?: string
  closeLabel?: string
  completed: number
  /** Segundos decorridos (feedback quando o progresso demora a actualizar). */
  elapsedSeconds?: number
  onCancelConfirm?: () => void
  onCancelDismiss?: () => void
  onCancelRequest?: () => void
  onClose: () => void
  phase: BlockingProgressDialogPhase
  progressCountLabel?: string
  statusLabel?: string
  summaryBody?: string
  summaryTitle?: string
  title: string
  total: number
}

export function BlockingProgressDialog({
  cancelConfirmMessage,
  cancelConfirmNoLabel = 'Continuar',
  cancelConfirmTitle,
  cancelConfirmYesLabel = 'Sim, cancelar',
  cancelLabel = 'Cancelar',
  closeLabel = 'OK',
  completed,
  elapsedSeconds,
  onCancelConfirm,
  onCancelDismiss,
  onCancelRequest,
  onClose,
  phase,
  progressCountLabel,
  statusLabel,
  summaryBody,
  summaryTitle,
  title,
  total,
}: BlockingProgressDialogProps) {
  const titleId = useId()
  const safeTotal = Math.max(total, 1)
  const clampedCompleted = Math.min(Math.max(completed, 0), safeTotal)
  const percent = Math.round((clampedCompleted / safeTotal) * 100)

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        event.stopPropagation()
        if (phase === 'running' && onCancelRequest) {
          onCancelRequest()
        }
      }
    }

    document.addEventListener('keydown', onKeyDown, true)

    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', onKeyDown, true)
    }
  }, [onCancelRequest, phase])

  const content = (() => {
    if (phase === 'confirmCancel') {
      return (
        <>
          <h2 className={styles.title} id={titleId}>
            {cancelConfirmTitle ?? title}
          </h2>
          {cancelConfirmMessage ? <p className={styles.message}>{cancelConfirmMessage}</p> : null}
          <div className={styles.actions}>
            <button className={styles.secondaryButton} type="button" onClick={onCancelDismiss}>
              {cancelConfirmNoLabel}
            </button>
            <button className={styles.dangerButton} type="button" onClick={onCancelConfirm}>
              {cancelConfirmYesLabel}
            </button>
          </div>
        </>
      )
    }

    if (phase === 'summary' || phase === 'error') {
      return (
        <>
          <h2 className={styles.title} id={titleId}>
            {summaryTitle ?? title}
          </h2>
          {summaryBody ? <pre className={styles.summaryBody}>{summaryBody}</pre> : null}
          <div className={styles.actions}>
            <button className={styles.primaryButton} type="button" onClick={onClose}>
              {closeLabel}
            </button>
          </div>
        </>
      )
    }

    return (
      <>
        <h2 className={styles.title} id={titleId}>
          {title}
        </h2>
        <div className={styles.progress}>
          <p className={styles.progressMeta}>
            {progressCountLabel ?? `${clampedCompleted}/${total}`}
            {phase === 'running' && elapsedSeconds !== undefined && elapsedSeconds > 0
              ? ` · ${String(elapsedSeconds)}s`
              : ''}
          </p>
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
        <div className={styles.statusShell} title={statusLabel || undefined}>
          {statusLabel ? <p className={styles.statusLabel}>{statusLabel}</p> : null}
        </div>
        <div className={styles.actions}>
          <button className={styles.secondaryButton} type="button" onClick={onCancelRequest}>
            {cancelLabel}
          </button>
        </div>
      </>
    )
  })()

  return createPortal(
    <div
      aria-labelledby={titleId}
      aria-modal="true"
      className={styles.backdrop}
      onPointerDown={(event) => event.stopPropagation()}
      onWheel={(event) => event.preventDefault()}
      role="dialog"
    >
      <div className={styles.panel} onPointerDown={(event) => event.stopPropagation()}>
        {content}
      </div>
    </div>,
    document.body,
  )
}
