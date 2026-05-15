import { createPortal } from 'react-dom'

import type { NodeElementListItem } from '@/core/listNodeElements'

import styles from './NodeInstanceStringPicker.module.css'

type ElementRemovalPickerProps = {
  elements: NodeElementListItem[]
  nodeTitle: string
  onClose: () => void
  onPick: (item: NodeElementListItem) => void
  open: boolean
  titleDomId?: string
}

function kindLabel(kind: NodeElementListItem['kind']): string {
  return kind === 'parameter' ? 'Parâmetro' : 'Internal_Structure'
}

export function ElementRemovalPicker({
  elements,
  nodeTitle,
  onClose,
  onPick,
  open,
  titleDomId = 'element-removal-title',
}: ElementRemovalPickerProps) {
  if (!open || typeof document === 'undefined') {
    return null
  }

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
          Remover elemento
        </h2>
        <p className={styles.subtitle}>
          Escolha qual elemento de <strong>{nodeTitle}</strong> deseja excluir.
        </p>

        <ul className={styles.list}>
          {elements.map((element) => (
            <li className={styles.listItem} key={`${element.kind}:${element.id}`}>
              <button className={styles.pickRow} onClick={() => onPick(element)} type="button">
                <span className={styles.pickMain}>
                  <span className={styles.pickName}>{element.name}</span>
                  {element.meta ? <span className={styles.pickValue}>{element.meta}</span> : null}
                </span>
                <span className={styles.pickRowMeta}>{kindLabel(element.kind)}</span>
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
