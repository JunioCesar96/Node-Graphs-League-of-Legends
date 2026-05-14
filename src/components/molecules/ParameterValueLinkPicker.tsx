import { createPortal } from 'react-dom'

import type { NodeParameterDefinition } from '@/core/nodeSchema'

import styles from './ParameterValueLinkPicker.module.css'

type ParameterValueLinkPickerProps = {
  linkedPartner: NodeParameterDefinition | undefined
  onClose: () => void
  onPick: (otherParameterId: string) => void
  onUnlink: () => void
  open: boolean
  candidates: NodeParameterDefinition[]
  sourceParameter: NodeParameterDefinition
}

export function ParameterValueLinkPicker({
  candidates,
  linkedPartner,
  onClose,
  onPick,
  onUnlink,
  open,
  sourceParameter,
}: ParameterValueLinkPickerProps) {
  if (!open || typeof document === 'undefined') {
    return null
  }

  return createPortal(
    <div
      aria-labelledby="param-value-link-title"
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
        <h2 className={styles.title} id="param-value-link-title">
          Vincular valor
        </h2>
        <p className={styles.subtitle}>
          Parâmetro actual: «{sourceParameter.name}» ({sourceParameter.type}). Escolha outro parâmetro
          do mesmo tipo para partilhar o mesmo valor.
        </p>

        {linkedPartner ? (
          <div className={styles.linkedBanner}>
            <span className={styles.linkedText}>
              Vinculado a <strong>{linkedPartner.name}</strong>
            </span>
            <button className={styles.unlink} onClick={() => onUnlink()} type="button">
              Desvincular
            </button>
          </div>
        ) : null}

        {candidates.length === 0 ? (
          <p className={styles.empty}>Não há outros parâmetros com o mesmo tipo neste nó.</p>
        ) : (
          <ul className={styles.list}>
            {candidates.map((parameter) => (
              <li className={styles.listItem} key={parameter.id}>
                <button
                  className={styles.pickRow}
                  onClick={() => onPick(parameter.id)}
                  type="button"
                >
                  <span>{parameter.name}</span>
                  <span className={styles.pickRowMeta}>{parameter.type}</span>
                </button>
              </li>
            ))}
          </ul>
        )}

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
