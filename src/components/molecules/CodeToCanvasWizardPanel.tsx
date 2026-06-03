import { createPortal } from 'react-dom'

import type { CodeToCanvasWizardController } from '@/hooks/useCodeToCanvasWizard'

import styles from './CodeToCanvasWizardPanel.module.css'

type CodeToCanvasWizardPanelProps = {
  controller: CodeToCanvasWizardController
  onDismissDone?: () => void
  title?: string
}

type WizardControllerLike = {
  open: boolean
  phase: 'idle' | 'running' | 'done'
  stepIndex: number
  totalSteps: number
  stepLabel: string
  verdict: 'correct' | 'wrong' | null
  wrongDescription: string
  setVerdict: (verdict: 'correct' | 'wrong') => void
  setWrongDescription: (value: string) => void
  canAdvance: boolean
  isLastStep: boolean
  summary: { wrongCount: number; lines: string[]; buildWarnings: string[] } | null
  onAdvance: () => void
  onCancel: () => void
}

export function CodeToCanvasWizardPanel({
  controller,
  onDismissDone,
  title = 'Code To Node Graph — passo a passo',
}: CodeToCanvasWizardPanelProps) {
  const wizard = controller as WizardControllerLike
  if (!wizard.open) {
    return null
  }

  const progressRatio =
    wizard.totalSteps > 0
      ? wizard.phase === 'done'
        ? 1
        : (wizard.stepIndex + 1) / wizard.totalSteps
      : 0

  const handlePrimary = () => {
    if (wizard.phase === 'done') {
      onDismissDone?.()
      wizard.onCancel()
      return
    }
    wizard.onAdvance()
  }

  const primaryLabel =
    wizard.phase === 'done'
      ? 'Fechar'
      : wizard.isLastStep
        ? 'Concluir'
        : 'Próximo passo'

  return createPortal(
    <div aria-modal className={styles.backdrop} role="dialog">
      <div className={styles.panel}>
        <h2 className={styles.title}>{title}</h2>

        {wizard.phase === 'running' ? (
          <>
            <div className={styles.progress}>
              <p className={styles.progressMeta}>
                Passo {wizard.stepIndex + 1} de {wizard.totalSteps}
              </p>
              <div className={styles.progressBar}>
                <div
                  className={styles.progressFill}
                  style={{ width: `${String(Math.round(progressRatio * 100))}%` }}
                />
              </div>
            </div>

            <p className={styles.stepLabel}>{wizard.stepLabel}</p>

            <div className={styles.verdictGroup} role="radiogroup" aria-label="Revisão do passo">
              <label className={styles.verdictOption}>
                <input
                  checked={wizard.verdict === 'correct'}
                  name="ctng-wizard-verdict"
                  type="radio"
                  value="correct"
                  onChange={() => wizard.setVerdict('correct')}
                />
                Correto
              </label>
              <label className={styles.verdictOption}>
                <input
                  checked={wizard.verdict === 'wrong'}
                  name="ctng-wizard-verdict"
                  type="radio"
                  value="wrong"
                  onChange={() => wizard.setVerdict('wrong')}
                />
                Errado
              </label>
            </div>

            {wizard.verdict === 'wrong' ? (
              <div className={styles.wrongNote}>
                <label htmlFor="ctng-wizard-wrong-note">O que está errado?</label>
                <textarea
                  id="ctng-wizard-wrong-note"
                  placeholder="Descreve o problema neste passo…"
                  value={wizard.wrongDescription}
                  onChange={(event) => wizard.setWrongDescription(event.target.value)}
                />
              </div>
            ) : null}
          </>
        ) : (
          <div className={styles.summaryBlock}>
            <p>
              Revisão concluída.{' '}
              {wizard.summary
                ? `${String(wizard.summary.wrongCount)} passo(s) marcado(s) como errado.`
                : ''}
            </p>
            {wizard.summary && wizard.summary.lines.length > 0 ? (
              <ul className={styles.summaryList}>
                {wizard.summary.lines.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            ) : (
              <p>Todos os passos foram marcados como corretos.</p>
            )}
            {wizard.summary && wizard.summary.buildWarnings.length > 0 ? (
              <p>
                Avisos de geração: {String(wizard.summary.buildWarnings.length)} (ver consola ou
                alerta ao fechar, se aplicável).
              </p>
            ) : null}
          </div>
        )}

        <div className={styles.actions}>
          {wizard.phase === 'running' ? (
            <button className={styles.ghostButton} type="button" onClick={wizard.onCancel}>
              Cancelar
            </button>
          ) : null}
          <button
            className={styles.primaryButton}
            disabled={wizard.phase === 'running' && !wizard.canAdvance}
            type="button"
            onClick={handlePrimary}
          >
            {primaryLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
