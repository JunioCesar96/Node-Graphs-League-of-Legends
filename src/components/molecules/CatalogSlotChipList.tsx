import { useRef, useState } from 'react'

import styles from './CatalogFormDialog.module.css'

export type CatalogSlotChipListProps = {
  label: string
  hint?: string
  chips: string[]
  placeholder?: string
  onChange: (next: string[]) => void
}

export function CatalogSlotChipList({
  label,
  hint,
  chips,
  placeholder = 'ex.: in[MyBlock]',
  onChange,
}: CatalogSlotChipListProps) {
  const [draft, setDraft] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const add = () => {
    const trimmed = draft.trim()
    if (!trimmed || chips.includes(trimmed)) {
      setDraft('')
      return
    }
    onChange([...chips, trimmed])
    setDraft('')
  }

  return (
    <div className={styles.slotSection}>
      <span className={styles.slotLabel}>{label}</span>
      <div className={styles.chipList}>
        {chips.map((chip) => (
          <span key={chip} className={styles.chip}>
            {chip}
            <button
              className={styles.chipRemove}
              onClick={() => onChange(chips.filter((entry) => entry !== chip))}
              title={`Remover ${chip}`}
              type="button"
            >
              ×
            </button>
          </span>
        ))}
      </div>
      <div className={styles.slotAddRow}>
        <input
          ref={inputRef}
          className={styles.slotAddInput}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              add()
            }
          }}
          onChange={(event) => setDraft(event.target.value)}
          placeholder={placeholder}
          value={draft}
        />
        <button className={styles.slotAddBtn} onClick={add} type="button">
          +
        </button>
      </div>
      {hint ? <span className={styles.slotHint}>{hint}</span> : null}
    </div>
  )
}
