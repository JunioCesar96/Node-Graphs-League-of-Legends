import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'

import type { ListEmbedAddBlockChoice, ListEmbedAddStructureChoice } from '@/core/listEmbedElementMenu'

import styles from './NodeInstanceStringPicker.module.css'
import pickerStyles from './ElementRemovalPicker.module.css'
import menuStyles from './ElementMenu.module.css'

export const LIST_EMBED_ADD_PICKER_ROOT_ATTR = 'data-list-embed-add-picker'

type ListEmbedAddPickerProps = {
  blocks: readonly ListEmbedAddBlockChoice[]
  /** Abre directamente no passo de estrutura para este bloco. */
  initialListEmbedId?: string | null
  nodeTitle: string
  onClose: () => void
  onConfirm: (listEmbedId: string, choice: ListEmbedAddStructureChoice) => void
  open: boolean
  titleDomId?: string
}

type PickerStep = 'listEmbed' | 'structure'

function matchesQuery(name: string, meta: string, query: string): boolean {
  const normalized = query.trim().toLowerCase()
  if (!normalized) {
    return true
  }
  return `${name} ${meta}`.toLowerCase().includes(normalized)
}

export function ListEmbedAddPicker({
  blocks,
  initialListEmbedId = null,
  nodeTitle,
  onClose,
  onConfirm,
  open,
  titleDomId = 'list-embed-add-title',
}: ListEmbedAddPickerProps) {
  const [step, setStep] = useState<PickerStep>('listEmbed')
  const [query, setQuery] = useState('')
  const [selectedListEmbedId, setSelectedListEmbedId] = useState<string | null>(null)
  const [selectedStructureKey, setSelectedStructureKey] = useState<string | null>(null)

  const activeBlock = useMemo(() => {
    if (selectedListEmbedId === null) {
      return null
    }
    return blocks.find((block) => block.listEmbedId === selectedListEmbedId) ?? null
  }, [blocks, selectedListEmbedId])

  const visibleBlocks = useMemo(
    () =>
      blocks.filter((block) =>
        matchesQuery(block.title, 'LIST_EMBED', query),
      ),
    [blocks, query],
  )

  const visibleStructures = useMemo(() => {
    if (!activeBlock) {
      return []
    }
    return activeBlock.structures.filter((item) =>
      matchesQuery(item.name, item.meta, query),
    )
  }, [activeBlock, query])

  const selectedStructure =
    selectedStructureKey !== null
      ? visibleStructures.find((item) => item.choiceKey === selectedStructureKey) ??
        activeBlock?.structures.find((item) => item.choiceKey === selectedStructureKey) ??
        null
      : null

  useEffect(() => {
    if (!open) {
      setStep('listEmbed')
      setQuery('')
      setSelectedListEmbedId(null)
      setSelectedStructureKey(null)
      return
    }

    const presetId =
      initialListEmbedId && blocks.some((b) => b.listEmbedId === initialListEmbedId)
        ? initialListEmbedId
        : blocks.length === 1
          ? blocks[0]!.listEmbedId
          : null

    if (presetId) {
      setSelectedListEmbedId(presetId)
      setStep('structure')
    } else {
      setStep('listEmbed')
      setSelectedListEmbedId(null)
    }
    setSelectedStructureKey(null)
    setQuery('')
  }, [blocks, initialListEmbedId, open])

  useEffect(() => {
    if (!open || step !== 'listEmbed') {
      return
    }
    if (
      selectedListEmbedId !== null &&
      !visibleBlocks.some((block) => block.listEmbedId === selectedListEmbedId)
    ) {
      setSelectedListEmbedId(null)
    }
  }, [open, selectedListEmbedId, step, visibleBlocks])

  useEffect(() => {
    if (!open || step !== 'structure') {
      return
    }
    if (
      selectedStructureKey !== null &&
      !visibleStructures.some((item) => item.choiceKey === selectedStructureKey)
    ) {
      setSelectedStructureKey(null)
    }
  }, [open, selectedStructureKey, step, visibleStructures])

  if (!open || typeof document === 'undefined' || blocks.length === 0) {
    return null
  }

  const handleClose = () => {
    setQuery('')
    setSelectedListEmbedId(null)
    setSelectedStructureKey(null)
    setStep('listEmbed')
    onClose()
  }

  const handleConfirm = () => {
    if (!activeBlock || !selectedStructure) {
      return
    }
    onConfirm(activeBlock.listEmbedId, selectedStructure)
    handleClose()
  }

  const goToStructureStep = (listEmbedId: string) => {
    setSelectedListEmbedId(listEmbedId)
    setSelectedStructureKey(null)
    setQuery('')
    setStep('structure')
  }

  const dialogTitle =
    step === 'listEmbed' ? 'Adicionar LIST_EMBED' : 'Adicionar estrutura interna'

  const dialogSubtitle =
    step === 'listEmbed' ? (
      <>
        Escolha o bloco LIST_EMBED em <strong>{nodeTitle}</strong>.
      </>
    ) : (
      <>
        Escolha a estrutura interna para <strong>{activeBlock?.title}</strong>.
      </>
    )

  return createPortal(
    <div
      {...{ [LIST_EMBED_ADD_PICKER_ROOT_ATTR]: '' }}
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

        <input
          aria-label={
            step === 'listEmbed'
              ? 'Pesquisar bloco LIST_EMBED'
              : 'Pesquisar estrutura interna'
          }
          className={`${menuStyles.searchInput} ${pickerStyles.searchInput}`}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={
            step === 'listEmbed'
              ? 'Pesquisar LIST_EMBED…'
              : 'Pesquisar estrutura interna…'
          }
          type="search"
          value={query}
        />

        <p className={pickerStyles.searchSummary}>
          {step === 'listEmbed'
            ? visibleBlocks.length === 0
              ? 'Nenhum bloco corresponde à pesquisa.'
              : `${String(visibleBlocks.length)} de ${String(blocks.length)}`
            : visibleStructures.length === 0
              ? 'Nenhuma estrutura corresponde à pesquisa.'
              : `${String(visibleStructures.length)} de ${String(activeBlock?.structures.length ?? 0)}`}
        </p>

        <ul className={styles.list}>
          {step === 'listEmbed'
            ? visibleBlocks.map((block) => {
                const isSelected = selectedListEmbedId === block.listEmbedId
                return (
                  <li className={styles.listItem} key={block.listEmbedId}>
                    <button
                      aria-pressed={isSelected}
                      className={`${styles.pickRow} ${isSelected ? pickerStyles.rowSelected : ''}`}
                      onPointerDown={(event) => {
                        event.preventDefault()
                        event.stopPropagation()
                        setSelectedListEmbedId(block.listEmbedId)
                      }}
                      onDoubleClick={() => goToStructureStep(block.listEmbedId)}
                      type="button"
                    >
                      <span className={styles.pickMain}>
                        <span className={styles.pickName}>{block.title}</span>
                        <span className={styles.pickValue}>
                          {String(block.structures.length)} tipo(s) no catálogo
                        </span>
                      </span>
                      <span className={styles.pickRowMeta}>LIST_EMBED</span>
                    </button>
                  </li>
                )
              })
            : visibleStructures.map((item) => {
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
                      type="button"
                    >
                      <span className={styles.pickMain}>
                        <span className={styles.pickName}>{item.name}</span>
                        <span className={styles.pickValue}>{item.meta}</span>
                      </span>
                      <span className={styles.pickRowMeta}>Estrutura interna</span>
                    </button>
                  </li>
                )
              })}
        </ul>

        <div className={pickerStyles.actionsRow}>
          {step === 'structure' && blocks.length > 1 ? (
            <button
              className={styles.close}
              onClick={() => {
                setStep('listEmbed')
                setSelectedStructureKey(null)
                setQuery('')
              }}
              type="button"
            >
              Voltar
            </button>
          ) : (
            <button className={styles.close} onClick={handleClose} type="button">
              Fechar
            </button>
          )}
          {step === 'listEmbed' ? (
            <button
              className={pickerStyles.confirm}
              disabled={selectedListEmbedId === null}
              onClick={() => {
                if (selectedListEmbedId !== null) {
                  goToStructureStep(selectedListEmbedId)
                }
              }}
              type="button"
            >
              Seguinte
            </button>
          ) : (
            <button
              className={pickerStyles.confirm}
              disabled={selectedStructure === null}
              onClick={handleConfirm}
              type="button"
            >
              Confirmar
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body,
  )
}
