import { createPortal } from 'react-dom'

import type { NodeParameterDefinition } from '@/core/nodeSchema'

import styles from './NodeInstanceStringPicker.module.css'

export type NodeInstanceStringCandidate = {
  parameter: NodeParameterDefinition
  stringName: string
  value: string
}

type NodeInstanceStringPickerProps = {
  candidates: NodeInstanceStringCandidate[]
  nodeTitle: string
  onClose: () => void
  onPick: (parameterId: string) => void
  open: boolean
  /** Título do diálogo (por defeito: Node Instance). */
  dialogTitle?: string
  /** Subtítulo; por defeito texto para criação de instância. */
  dialogSubtitle?: string
  /** `aria-labelledby` — ids únicos se vários diálogos na mesma página. */
  titleDomId?: string
}

export function NodeInstanceStringPicker({
  candidates,
  nodeTitle,
  onClose,
  onPick,
  open,
  dialogTitle,
  dialogSubtitle,
  titleDomId = 'node-instance-string-title',
}: NodeInstanceStringPickerProps) {
  if (!open || typeof document === 'undefined') {
    return null
  }

  const resolvedTitle = dialogTitle ?? 'Criar Node Instance'

  return createPortal(
    <div
      aria-labelledby={titleDomId}
      aria-modal="true"
      className={styles.backdrop}
      role="dialog"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose()
        }
      }}
    >
      <div className={styles.dialog}>
        <h2 className={styles.title} id={titleDomId}>
          {resolvedTitle}
        </h2>
        <p className={styles.subtitle}>
          {dialogSubtitle !== undefined ? (
            dialogSubtitle
          ) : (
            <>
              Escolha qual parâmetro string de <strong>{nodeTitle}</strong> define o nome da nova instância.
            </>
          )}
        </p>

        <ul className={styles.list}>
          {candidates.map(({ parameter, stringName, value }) => (
            <li className={styles.listItem} key={parameter.id}>
              <button className={styles.pickRow} onClick={() => onPick(parameter.id)} type="button">
                <span className={styles.pickMain}>
                  <span className={styles.pickName}>{parameter.name}</span>
                  <span className={styles.pickValue}>{value}</span>
                </span>
                <span className={styles.pickRowMeta}>{stringName}</span>
              </button>
            </li>
          ))}
        </ul>

        <div className={styles.closeRow}>
          <button className={styles.close} onClick={onClose} type="button">
            Fechar
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
