import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'

import {
  structureCatalogChoiceKey,
  type MapHashStructureCatalogItem,
} from '@/core/mapHashStructureValue'

import styles from './NodeInstanceStringPicker.module.css'
import pickerStyles from './ElementRemovalPicker.module.css'
import menuStyles from './ElementMenu.module.css'

export type MapHashParameterKind = 'pointer' | 'embed' | 'u64Pointer'

export const MAP_HASH_STRUCTURE_PICKER_ROOT_ATTR = 'data-map-hash-structure-picker'

type MapHashStructurePickerProps = {
  catalog: readonly MapHashStructureCatalogItem[]
  onClose: () => void
  onConfirm: (item: MapHashStructureCatalogItem) => void
  open: boolean
  parameterKind: MapHashParameterKind
  parameterTitle: string
  titleDomId?: string
}

function kindLabel(kind: MapHashParameterKind): string {
  if (kind === 'embed') {
    return 'map[hash,embed]'
  }
  if (kind === 'u64Pointer') {
    return 'map[u64,pointer]'
  }
  return 'map[hash,pointer]'
}

function matchesQuery(item: MapHashStructureCatalogItem, query: string): boolean {
  const normalized = query.trim().toLowerCase()
  if (!normalized) {
    return true
  }
  return `${item.typeName} ${item.schemaId}`.toLowerCase().includes(normalized)
}

export function MapHashStructurePicker({
  catalog,
  onClose,
  onConfirm,
  open,
  parameterKind,
  parameterTitle,
  titleDomId = 'map-hash-structure-picker-title',
}: MapHashStructurePickerProps) {
  const [query, setQuery] = useState('')
  const [selectedKey, setSelectedKey] = useState<string | null>(null)

  const catalogSignature = useMemo(
    () => catalog.map((item) => structureCatalogChoiceKey(item)).join('|'),
    [catalog],
  )

  const visible = useMemo(
    () => catalog.filter((item) => matchesQuery(item, query)),
    [catalog, query],
  )

  const selected =
    selectedKey !== null
      ? visible.find((item) => structureCatalogChoiceKey(item) === selectedKey) ??
        catalog.find((item) => structureCatalogChoiceKey(item) === selectedKey) ??
        null
      : null

  useEffect(() => {
    if (open) {
      return
    }
    setQuery('')
    setSelectedKey(null)
  }, [open])

  useEffect(() => {
    if (!open) {
      return
    }
    const keys = catalogSignature ? catalogSignature.split('|') : []
    if (keys.length === 1) {
      setSelectedKey(keys[0]!)
    } else {
      setSelectedKey(null)
    }
    setQuery('')
  }, [open, catalogSignature])

  useEffect(() => {
    if (!open) {
      return
    }
    if (selectedKey !== null && !visible.some((item) => structureCatalogChoiceKey(item) === selectedKey)) {
      setSelectedKey(null)
    }
  }, [open, selectedKey, visible])

  if (!open || typeof document === 'undefined' || catalog.length === 0) {
    return null
  }

  const handleClose = () => {
    setQuery('')
    setSelectedKey(null)
    onClose()
  }

  const handleConfirm = () => {
    if (!selected) {
      return
    }
    onConfirm(selected)
    handleClose()
  }

  return createPortal(
    <div
      {...{ [MAP_HASH_STRUCTURE_PICKER_ROOT_ATTR]: '' }}
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
          Adicionar estrutura
        </h2>
        <p className={styles.subtitle}>
          Escolha o tipo estrutural ({kindLabel(parameterKind)}) para{' '}
          <strong>{parameterTitle}</strong>.
        </p>

        {catalog.length > 1 ? (
          <input
            aria-label="Pesquisar tipo estrutural"
            className={`${menuStyles.searchInput} ${pickerStyles.searchInput}`}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Pesquisar tipo…"
            type="search"
            value={query}
          />
        ) : null}

        <p className={pickerStyles.searchSummary}>
          {visible.length === 0
            ? 'Nenhum tipo corresponde à pesquisa.'
            : `${String(visible.length)} de ${String(catalog.length)}`}
        </p>

        <ul className={styles.list}>
          {visible.map((item) => {
            const choiceKey = structureCatalogChoiceKey(item)
            const isSelected = selectedKey === choiceKey
            return (
              <li className={styles.listItem} key={choiceKey}>
                <button
                  aria-pressed={isSelected}
                  className={`${styles.pickRow} ${isSelected ? pickerStyles.rowSelected : ''}`}
                  onPointerDown={(event) => {
                    event.preventDefault()
                    event.stopPropagation()
                    setSelectedKey(choiceKey)
                  }}
                  onDoubleClick={handleConfirm}
                  type="button"
                >
                  <span className={styles.pickMain}>
                    <span className={styles.pickName}>{item.typeName}</span>
                    <span className={styles.pickValue}>{item.schemaId}</span>
                  </span>
                </button>
              </li>
            )
          })}
        </ul>

        <div className={pickerStyles.actionsRow}>
          <button className={styles.close} onClick={handleClose} type="button">
            Cancelar
          </button>
          <button className={styles.confirm} disabled={!selected} onClick={handleConfirm} type="button">
            Adicionar
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
