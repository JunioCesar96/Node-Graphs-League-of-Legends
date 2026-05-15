import { createPortal } from 'react-dom'
import type { ReactNode } from 'react'

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
  /** Sobrescreve o título do diálogo (ex.: fluxo hashString vs instance). */
  dialogTitle?: string
  /** Sobrescreve o subtítulo. */
  dialogSubtitle?: ReactNode
  /** `aria-labelledby` do diálogo (único por instância aberta). */
  ariaTitleId?: string
  onClose: () => void
  onPick: (parameterId: string) => void
  open: boolean
}

export function NodeInstanceStringPicker({
  candidates,
  nodeTitle,
  dialogTitle,
  dialogSubtitle,
  ariaTitleId = 'node-instance-string-title',
  onClose,
  onPick,
  open,
}: NodeInstanceStringPickerProps) {
  if (!open || typeof document === 'undefined') {
    return null
  }

  return createPortal(
    <div
      aria-labelledby={ariaTitleId}
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
        <h2 className={styles.title} id={ariaTitleId}>
          {dialogTitle ?? 'Criar Node Instance'}
        </h2>
        <p className={styles.subtitle}>
          {dialogSubtitle ?? (
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
