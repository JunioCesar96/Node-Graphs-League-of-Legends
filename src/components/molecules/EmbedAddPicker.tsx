import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'

import type { EmbedAddBlockChoice, EmbedAddStructureChoice } from '@/core/embedElementMenu'

import styles from './NodeInstanceStringPicker.module.css'
import pickerStyles from './ElementRemovalPicker.module.css'
import menuStyles from './ElementMenu.module.css'

export const EMBED_ADD_PICKER_ROOT_ATTR = 'data-embed-add-picker'

type EmbedAddPickerProps = {
  blocks: readonly EmbedAddBlockChoice[]
  embedFieldTitle?: string
  nodeTitle: string
  onClose: () => void
  onConfirm: (choice: EmbedAddStructureChoice) => void
  open: boolean
  titleDomId?: string
}

function matchesQuery(name: string, meta: string, query: string): boolean {
  const normalized = query.trim().toLowerCase()
  if (!normalized) {
    return true
  }
  return `${name} ${meta}`.toLowerCase().includes(normalized)
}

export function EmbedAddPicker({
  blocks,
  embedFieldTitle,
  nodeTitle,
  onClose,
  onConfirm,
  open,
  titleDomId = 'embed-add-title',
}: EmbedAddPickerProps) {
  const [query, setQuery] = useState('')
  const [selectedStructureKey, setSelectedStructureKey] = useState<string | null>(null)

  const structures = useMemo(() => {
    const items: EmbedAddStructureChoice[] = []
    for (const block of blocks) {
      for (const choice of block.structures) {
        items.push({
          ...choice,
          meta: embedFieldTitle ? `${embedFieldTitle} · EMBED` : choice.meta,
        })
      }
    }
    return items
  }, [blocks, embedFieldTitle])

  const visibleStructures = useMemo(
    () => structures.filter((item) => matchesQuery(item.name, item.meta, query)),
    [query, structures],
  )

  const selectedStructure =
    selectedStructureKey !== null
      ? visibleStructures.find((item) => item.choiceKey === selectedStructureKey) ??
        structures.find((item) => item.choiceKey === selectedStructureKey) ??
        null
      : null

  useEffect(() => {
    if (!open) {
      setQuery('')
      setSelectedStructureKey(null)
      return
    }
    if (structures.length === 1) {
      setSelectedStructureKey(structures[0]!.choiceKey)
    } else {
      setSelectedStructureKey(null)
    }
    setQuery('')
  }, [open, structures])

  useEffect(() => {
    if (!open) {
      return
    }
    if (
      selectedStructureKey !== null &&
      !visibleStructures.some((item) => item.choiceKey === selectedStructureKey)
    ) {
      setSelectedStructureKey(null)
    }
  }, [open, selectedStructureKey, visibleStructures])

  if (!open || typeof document === 'undefined' || structures.length === 0) {
    return null
  }

  const handleClose = () => {
    setQuery('')
    setSelectedStructureKey(null)
    onClose()
  }

  const handleConfirm = () => {
    if (!selectedStructure) {
      return
    }
    onConfirm(selectedStructure)
    handleClose()
  }

  const dialogTitle = 'Adicionar estrutura interna'
  const dialogSubtitle = (
    <>
      Escolha a estrutura para <strong>{embedFieldTitle ?? nodeTitle}</strong>.
    </>
  )

  return createPortal(
    <div
      {...{ [EMBED_ADD_PICKER_ROOT_ATTR]: '' }}
      aria-labelledby={titleDomId}
      aria-modal="true"
      className={`${styles.backdrop} ${pickerStyles.backdrop}`}
      role="dialog"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          handleClose()
        }
      }}
    >
      <div
        className={styles.dialog}
        onPointerDown={(event) => {
          event.stopPropagation()
        }}
      >
        <h2 className={styles.title} id={titleDomId}>
          {dialogTitle}
        </h2>
        <p className={styles.subtitle}>{dialogSubtitle}</p>

        {structures.length > 1 ? (
          <input
            aria-label="Pesquisar estrutura interna"
            className={`${menuStyles.searchInput} ${pickerStyles.searchInput}`}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Pesquisar estrutura interna…"
            type="search"
            value={query}
          />
        ) : null}

        <p className={pickerStyles.searchSummary}>
          {visibleStructures.length === 0
            ? 'Nenhuma estrutura corresponde à pesquisa.'
            : `${String(visibleStructures.length)} de ${String(structures.length)}`}
        </p>

        <ul className={styles.list}>
          {visibleStructures.map((item) => {
            const isSelected = selectedStructureKey === item.choiceKey
            return (
              <li className={styles.listItem} key={item.choiceKey}>
                <button
                  aria-pressed={isSelected}
                  className={`${styles.pickRow} ${isSelected ? pickerStyles.rowSelected : ''}`}
                  onPointerDown={(event) => {
                    event.preventDefault()
                    event.stopPropagation()
                    setSelectedStructureKey(item.choiceKey)
                  }}
                  onDoubleClick={handleConfirm}
                  type="button"
                >
                  <span className={styles.pickMain}>
                    <span className={styles.pickName}>{item.name}</span>
                    <span className={styles.pickValue}>{item.meta}</span>
                  </span>
                  <span className={styles.pickRowMeta}>EMBED</span>
                </button>
              </li>
            )
          })}
        </ul>

        <div className={pickerStyles.actionsRow}>
          <button className={styles.close} onClick={handleClose} type="button">
            Cancelar
          </button>
          <button
            className={styles.confirm}
            disabled={!selectedStructure}
            onClick={handleConfirm}
            type="button"
          >
            Adicionar
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
