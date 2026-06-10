import { useEffect, useId, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'

import { EmbeddedStructureListPicker } from '@/components/molecules/EmbeddedStructureListPicker'
import type { StructureListPanelItem } from '@/components/molecules/StructureListPanel'
import { fetchBlockDefinitionsFromDisk } from '@/core/blockDefinitionDiskLoader'
import type { BlockDefinitionJsonDocument } from '@/core/blockDefinitionJson'
import { LangId } from '@/core/language/languageIds'
import { useLanguage } from '@/language/LanguageProvider'

import styles from './CatalogFormDialog.module.css'

export type DeleteBlockDialogProps = {
  isOpen: boolean
  onCancel: () => void
  onConfirm: (blockName: string) => void
}

export function DeleteBlockDialog({ isOpen, onCancel, onConfirm }: DeleteBlockDialogProps) {
  const { t } = useLanguage()
  const titleId = useId()
  const [definitions, setDefinitions] = useState<BlockDefinitionJsonDocument[]>([])
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [selectedBlock, setSelectedBlock] = useState('')

  useEffect(() => {
    if (!isOpen) {
      return
    }
    setSelectedBlock('')
    setLoadError(null)
    setLoading(true)

    void fetchBlockDefinitionsFromDisk().then((result) => {
      setLoading(false)
      if (!result.ok) {
        setLoadError(result.error)
        setDefinitions([])
        return
      }
      setDefinitions(result.definitions)
    })
  }, [isOpen])

  const blockListItems = useMemo((): StructureListPanelItem[] => {
    const entries = [...definitions].sort((a, b) => a.blockName.localeCompare(b.blockName))
    return entries.map((entry, index) => ({
      id: entry.blockName,
      index,
      label: `${entry.name} (${entry.blockName})`,
    }))
  }, [definitions])

  const selectedDefinition = useMemo(
    () => definitions.find((entry) => entry.blockName.trim() === selectedBlock.trim()),
    [definitions, selectedBlock],
  )

  if (!isOpen) {
    return null
  }

  const canConfirm = Boolean(selectedBlock.trim()) && !loading

  return createPortal(
    <div
      aria-labelledby={titleId}
      aria-modal
      className={styles.backdrop}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onCancel()
        }
      }}
      role="dialog"
    >
      <div className={styles.panel}>
        <p className={styles.title} id={titleId}>
          {t(LangId.DeleteBlockDialogTitle, 'Apagar bloco do catálogo')}
        </p>
        <p className={styles.hint}>
          {t(
            LangId.DeleteBlockDialogHint,
            'Remove a definição, os parâmetros associados e o schema em disco.',
          )}
        </p>

        <div className={styles.field}>
          <span>{t(LangId.DeleteBlockDialogSelect, 'Bloco')}</span>
          {loading ? (
            <p className={styles.hint}>{t(LangId.CreateBlockDialogLoadingBlocks, 'A carregar blocos…')}</p>
          ) : (
            <EmbeddedStructureListPicker
              emptyHint={t(LangId.DeleteBlockDialogSelect, 'Seleccionar bloco')}
              items={blockListItems}
              listTitle={t(LangId.DeleteBlockDialogSelect, 'Bloco')}
              selectedId={selectedBlock || null}
              onPick={(item) => setSelectedBlock(item.id)}
            />
          )}
        </div>

        {selectedDefinition ? (
          <p className={styles.previewId}>
            {t(LangId.DeleteBlockDialogPreview, 'Será apagado: {id}', {
              id: selectedDefinition.id,
            })}
          </p>
        ) : null}

        {loadError ? <p className={styles.error}>{loadError}</p> : null}

        <div className={styles.actions}>
          <button className={styles.ghostButton} onClick={onCancel} type="button">
            {t(LangId.CreateBlockDialogCancel, 'Cancelar')}
          </button>
          <button
            className={styles.dangerButton}
            disabled={!canConfirm}
            onClick={() => onConfirm(selectedBlock.trim())}
            type="button"
          >
            {t(LangId.DeleteBlockDialogConfirm, 'Apagar bloco')}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
