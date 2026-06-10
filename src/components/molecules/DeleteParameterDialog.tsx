import { useEffect, useId, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'

import { EmbeddedStructureListPicker } from '@/components/molecules/EmbeddedStructureListPicker'
import type { StructureListPanelItem } from '@/components/molecules/StructureListPanel'
import { fetchBlockDefinitionsFromDisk } from '@/core/blockDefinitionDiskLoader'
import type { BlockDefinitionJsonDocument } from '@/core/blockDefinitionJson'
import type { BlockParameterJsonDocument } from '@/core/blockParameterJson'
import { fetchAllBlockParametersFromDisk } from '@/core/blockParameterDiskLoader'
import { catalogParameterPickerKey } from '@/core/blockParameterCatalogClone'
import { LangId } from '@/core/language/languageIds'
import { useLanguage } from '@/language/LanguageProvider'

import styles from './CatalogFormDialog.module.css'

export type DeleteParameterDialogProps = {
  isOpen: boolean
  onCancel: () => void
  onConfirm: (blockName: string, parameterName: string) => void
}

export function DeleteParameterDialog({ isOpen, onCancel, onConfirm }: DeleteParameterDialogProps) {
  const { t } = useLanguage()
  const titleId = useId()
  const [definitions, setDefinitions] = useState<BlockDefinitionJsonDocument[]>([])
  const [catalogParameters, setCatalogParameters] = useState<BlockParameterJsonDocument[]>([])
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [blockName, setBlockName] = useState('')
  const [parameterKey, setParameterKey] = useState('')

  useEffect(() => {
    if (!isOpen) {
      return
    }
    setBlockName('')
    setParameterKey('')
    setLoadError(null)
    setLoading(true)

    void Promise.all([fetchBlockDefinitionsFromDisk(), fetchAllBlockParametersFromDisk()]).then(
      ([blocksResult, paramsResult]) => {
        setLoading(false)
        if (!blocksResult.ok) {
          setLoadError(blocksResult.error)
          setDefinitions([])
          setCatalogParameters([])
          return
        }
        if (!paramsResult.ok) {
          setLoadError(paramsResult.error)
          setDefinitions(blocksResult.definitions)
          setCatalogParameters([])
          return
        }
        setDefinitions(blocksResult.definitions)
        setCatalogParameters(paramsResult.parameters)
      },
    )
  }, [isOpen])

  const blockListItems = useMemo((): StructureListPanelItem[] => {
    const entries = [...definitions].sort((a, b) => a.blockName.localeCompare(b.blockName))
    return entries.map((entry, index) => ({
      id: entry.blockName,
      index,
      label: `${entry.name} (${entry.blockName})`,
    }))
  }, [definitions])

  const parametersForBlock = useMemo(() => {
    const block = blockName.trim()
    if (!block) {
      return []
    }
    return catalogParameters.filter((doc) => doc.block.trim() === block)
  }, [blockName, catalogParameters])

  const parameterListItems = useMemo((): StructureListPanelItem[] => {
    return parametersForBlock.map((doc, index) => ({
      id: catalogParameterPickerKey(doc),
      index,
      label: `${doc.parameterName} · ${doc.type}`,
    }))
  }, [parametersForBlock])

  const selectedParameter = useMemo(() => {
    if (!parameterKey) {
      return undefined
    }
    return parametersForBlock.find((doc) => catalogParameterPickerKey(doc) === parameterKey)
  }, [parameterKey, parametersForBlock])

  if (!isOpen) {
    return null
  }

  const canConfirm = Boolean(selectedParameter) && !loading

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
          {t(LangId.DeleteParameterDialogTitle, 'Apagar parâmetro do catálogo')}
        </p>
        <p className={styles.hint}>
          {t(
            LangId.DeleteParameterDialogHint,
            'Remove o ficheiro do parâmetro e actualiza a lista parameters do bloco.',
          )}
        </p>

        <div className={styles.field}>
          <span>{t(LangId.CreateParameterDialogBlock, 'Bloco')}</span>
          {loading ? (
            <p className={styles.hint}>
              {t(LangId.CreateParameterDialogLoadingBlocks, 'A carregar blocos…')}
            </p>
          ) : (
            <EmbeddedStructureListPicker
              emptyHint={t(LangId.CreateParameterDialogSelectBlock, 'Seleccionar bloco')}
              items={blockListItems}
              listTitle={t(LangId.CreateParameterDialogBlock, 'Bloco')}
              selectedId={blockName || null}
              onPick={(item) => {
                setBlockName(item.id)
                setParameterKey('')
              }}
            />
          )}
        </div>

        {blockName ? (
          <div className={styles.field}>
            <span>{t(LangId.DeleteParameterDialogSelectParameter, 'Parâmetro')}</span>
            <EmbeddedStructureListPicker
              emptyHint={t(LangId.DeleteParameterDialogNoParameters, 'Nenhum parâmetro neste bloco.')}
              items={parameterListItems}
              listTitle={t(LangId.DeleteParameterDialogSelectParameter, 'Parâmetro')}
              selectedId={parameterKey || null}
              onPick={(item) => setParameterKey(item.id)}
            />
          </div>
        ) : null}

        {selectedParameter ? (
          <p className={styles.previewId}>
            {t(LangId.DeleteParameterDialogPreview, 'Será apagado: {id}', {
              id: selectedParameter.id,
            })}
          </p>
        ) : null}

        {loadError ? <p className={styles.error}>{loadError}</p> : null}

        <div className={styles.actions}>
          <button className={styles.ghostButton} onClick={onCancel} type="button">
            {t(LangId.CreateParameterDialogCancel, 'Cancelar')}
          </button>
          <button
            className={styles.dangerButton}
            disabled={!canConfirm}
            onClick={() => {
              if (!selectedParameter) {
                return
              }
              onConfirm(selectedParameter.block.trim(), selectedParameter.parameterName.trim())
            }}
            type="button"
          >
            {t(LangId.DeleteParameterDialogConfirm, 'Apagar parâmetro')}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
