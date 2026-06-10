import { useCallback, useEffect, useId, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'

import { CatalogSlotChipList } from '@/components/molecules/CatalogSlotChipList'
import { CreateParameterDialog } from '@/components/molecules/CreateParameterDialog'
import { EmbeddedStructureListPicker } from '@/components/molecules/EmbeddedStructureListPicker'
import type { StructureListPanelItem } from '@/components/molecules/StructureListPanel'
import type { ManualBlockParameterFormInput, ManualBlockParameterSelection } from '@/core/blockCatalogCreate'
import { blockParameterCatalogByName } from '@/core/blockParameterCatalogRegistry'
import { fetchBlockDefinitionsFromDisk } from '@/core/blockDefinitionDiskLoader'
import type { BlockDefinitionJsonDocument, ManualBlockDefinitionInput } from '@/core/blockDefinitionJson'
import {
  blockNameToCatalogNodeId,
} from '@/core/blockDefinitionJson'
import { buildBlockParameterFromManualInput } from '@/core/blockParameterManualBuild'
import { catalogParameterPickerKey } from '@/core/blockParameterCatalogClone'
import type { BlockParameterJsonDocument } from '@/core/blockParameterJson'
import { fetchAllBlockParametersFromDisk } from '@/core/blockParameterDiskLoader'
import { LangId } from '@/core/language/languageIds'
import { useLanguage } from '@/language/LanguageProvider'

import styles from './CatalogFormDialog.module.css'

const BLOCK_TYPES = [
  { id: 'standalone', label: 'standalone — bloco independente' },
  { id: 'pointer', label: 'pointer — referência a outro bloco' },
  { id: 'embed', label: 'embed — bloco embutido no pai' },
  { id: 'internal', label: 'internal — estrutura interna' },
] as const

type BlockTypeId = (typeof BLOCK_TYPES)[number]['id']

export type EditBlockDialogConfirmPayload = {
  input: ManualBlockDefinitionInput
  parameterSources: ManualBlockParameterSelection[]
}

export type EditBlockDialogProps = {
  isOpen: boolean
  onCancel: () => void
  onConfirm: (blockName: string, payload: EditBlockDialogConfirmPayload) => void
}

function resolveParameterDocumentsForDefinition(
  definition: BlockDefinitionJsonDocument,
  catalog: BlockParameterJsonDocument[],
): BlockParameterJsonDocument[] {
  const docs: BlockParameterJsonDocument[] = []
  for (const paramName of definition.parameters) {
    const trimmed = paramName.trim()
    const match =
      catalog.find(
        (entry) =>
          entry.block.trim() === definition.blockName.trim() &&
          entry.parameterName.trim() === trimmed,
      ) ?? catalog.find((entry) => entry.parameterName.trim() === trimmed)
    if (match) {
      docs.push(match)
    }
  }
  return docs
}

export function EditBlockDialog({ isOpen, onCancel, onConfirm }: EditBlockDialogProps) {
  const { t } = useLanguage()
  const titleId = useId()
  const [definitions, setDefinitions] = useState<BlockDefinitionJsonDocument[]>([])
  const [catalogParameters, setCatalogParameters] = useState<BlockParameterJsonDocument[]>([])
  const [loadingBlocks, setLoadingBlocks] = useState(false)
  const [loadingParameters, setLoadingParameters] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [parametersLoadError, setParametersLoadError] = useState<string | null>(null)

  const [selectedBlockName, setSelectedBlockName] = useState('')
  const [name, setName] = useState('')
  const [parentBlock, setParentBlock] = useState('')
  const [type, setType] = useState<BlockTypeId>('standalone')
  const [color, setColor] = useState('#40ff56')
  const [headerSlots, setHeaderSlots] = useState<string[]>([])
  const [selectedParameters, setSelectedParameters] = useState<BlockParameterJsonDocument[]>([])
  const [createParameterOpen, setCreateParameterOpen] = useState(false)
  const [parameterAddError, setParameterAddError] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen) {
      return
    }
    setSelectedBlockName('')
    setName('')
    setParentBlock('')
    setType('standalone')
    setColor('#40ff56')
    setHeaderSlots([])
    setSelectedParameters([])
    setCreateParameterOpen(false)
    setParameterAddError(null)
    setLoadError(null)
    setParametersLoadError(null)
    setLoadingBlocks(true)
    setLoadingParameters(true)

    void fetchBlockDefinitionsFromDisk().then((result) => {
      setLoadingBlocks(false)
      if (!result.ok) {
        setLoadError(result.error)
        setDefinitions([])
        return
      }
      setDefinitions(result.definitions)
    })

    void fetchAllBlockParametersFromDisk().then((result) => {
      setLoadingParameters(false)
      if (!result.ok) {
        setParametersLoadError(result.error)
        setCatalogParameters([])
        return
      }
      setCatalogParameters(result.parameters)
    })
  }, [isOpen])

  const selectedDefinition = useMemo(
    () => definitions.find((entry) => entry.blockName.trim() === selectedBlockName.trim()),
    [definitions, selectedBlockName],
  )

  const loadDefinitionIntoForm = useCallback(
    (definition: BlockDefinitionJsonDocument) => {
      setName(definition.name)
      setParentBlock(definition.block)
      setType((definition.type as BlockTypeId) || 'standalone')
      setColor(definition.color)
      setHeaderSlots([...definition.headerSlots])
      setSelectedParameters(resolveParameterDocumentsForDefinition(definition, catalogParameters))
    },
    [catalogParameters],
  )

  useEffect(() => {
    if (!selectedDefinition) {
      return
    }
    loadDefinitionIntoForm(selectedDefinition)
  }, [loadDefinitionIntoForm, selectedDefinition])

  const selectedParameterNames = useMemo(
    () => new Set(selectedParameters.map((entry) => entry.parameterName.trim())),
    [selectedParameters],
  )

  const parametersByKey = useMemo(() => {
    const map = new Map<string, BlockParameterJsonDocument>()
    for (const doc of catalogParameters) {
      map.set(catalogParameterPickerKey(doc), doc)
    }
    return map
  }, [catalogParameters])

  const parameterListItems = useMemo((): StructureListPanelItem[] => {
    return catalogParameters
      .filter((doc) => !selectedParameterNames.has(doc.parameterName.trim()))
      .map((doc, index) => ({
        id: catalogParameterPickerKey(doc),
        index,
        label: `${doc.block} · ${doc.parameterName} · ${doc.type}`,
      }))
  }, [catalogParameters, selectedParameterNames])

  const parametersEmptyHint = useMemo(() => {
    if (catalogParameters.length === 0) {
      return t(LangId.CreateBlockDialogParametersEmpty, 'Nenhum parâmetro no catálogo.')
    }
    return t(
      LangId.CreateBlockDialogParametersAllSelected,
      'Todos os parâmetros disponíveis já estão seleccionados.',
    )
  }, [catalogParameters.length, t])

  const blockListItems = useMemo((): StructureListPanelItem[] => {
    return [...definitions]
      .sort((a, b) => a.blockName.localeCompare(b.blockName))
      .map((entry, index) => ({
        id: entry.blockName,
        index,
        label: `${entry.name} (${entry.blockName})`,
      }))
  }, [definitions])

  const parentListItems = useMemo((): StructureListPanelItem[] => {
    const entries = Array.from(
      new Set(definitions.map((definition) => definition.blockName.trim()).filter(Boolean)),
    ).sort((a, b) => a.localeCompare(b))
    return entries.map((entry, index) => ({ id: entry, index, label: entry }))
  }, [definitions])

  const typeListItems = useMemo(
    (): StructureListPanelItem[] =>
      BLOCK_TYPES.map((entry, index) => ({
        id: entry.id,
        index,
        label: entry.label,
      })),
    [],
  )

  const blockParametersPreview = useMemo(
    () => selectedParameters.map((entry) => entry.parameterName.trim()).filter(Boolean),
    [selectedParameters],
  )

  const validationError = useMemo(() => {
    if (!selectedBlockName.trim()) {
      return t(LangId.EditBlockDialogErrorSelect, 'Seleccione um bloco para editar.')
    }
    if (!name.trim()) {
      return t(LangId.CreateBlockDialogErrorName, 'Indique o título (name).')
    }
    if (name.includes('_')) {
      return t(LangId.CreateBlockDialogErrorNameUnderscore, 'O título não pode conter "_".')
    }
    if (!/^#[0-9a-fA-F]{6}$/.test(color.trim())) {
      return t(LangId.CreateBlockDialogErrorColor, 'A cor deve ser hex (#RRGGBB).')
    }
    return null
  }, [color, name, selectedBlockName, t])

  const parameterListActions = useMemo(
    () => ({
      add: {
        ariaLabel: t(LangId.CreateBlockDialogParameterAdd, 'Novo parâmetro'),
        title: t(LangId.CreateBlockDialogParameterAdd, 'Novo parâmetro'),
        disabled: !selectedBlockName.trim(),
        onClick: () => {
          if (!selectedBlockName.trim()) {
            setParameterAddError(
              t(
                LangId.CreateBlockDialogParameterAddNeedBlock,
                'Seleccione o bloco antes de criar um parâmetro.',
              ),
            )
            return
          }
          setParameterAddError(null)
          setCreateParameterOpen(true)
        },
      },
    }),
    [selectedBlockName, t],
  )

  if (!isOpen) {
    return null
  }

  const canConfirm =
    validationError === null && !loadingBlocks && !loadingParameters && Boolean(selectedDefinition)

  const addParameter = (key: string) => {
    const doc = parametersByKey.get(key)
    if (!doc) {
      return
    }
    const parameterName = doc.parameterName.trim()
    if (!parameterName || selectedParameterNames.has(parameterName)) {
      return
    }
    setSelectedParameters((current) => [...current, doc])
  }

  const removeParameter = (parameterName: string) => {
    setSelectedParameters((current) =>
      current.filter((entry) => entry.parameterName.trim() !== parameterName.trim()),
    )
  }

  const handleCreateParameter = (input: ManualBlockParameterFormInput) => {
    const trimmedBlock = selectedBlockName.trim()
    const built = buildBlockParameterFromManualInput({
      ...input,
      blockName: trimmedBlock,
      nodeId: blockNameToCatalogNodeId(trimmedBlock),
    })
    if (!built.ok) {
      setParameterAddError(built.error)
      return
    }

    const parameterName = built.document.parameterName.trim()
    if (selectedParameterNames.has(parameterName)) {
      setParameterAddError(`Parâmetro "${parameterName}" já está na lista.`)
      return
    }

    setSelectedParameters((current) => [...current, built.document])
    setCatalogParameters((current) => [...current, built.document])
    setCreateParameterOpen(false)
    setParameterAddError(null)
  }

  const resolveParameterSourcesForWrite = (): ManualBlockParameterSelection[] => {
    if (!selectedDefinition) {
      return []
    }
    return selectedParameters
      .filter((doc) => {
        const existing = blockParameterCatalogByName(
          selectedDefinition.blockName,
          doc.parameterName,
        )
        return !existing
      })
      .map((source) => ({ source }))
  }

  const submit = () => {
    if (!canConfirm || !selectedDefinition) {
      return
    }
    onConfirm(selectedDefinition.blockName.trim(), {
      input: {
        blockName: selectedDefinition.blockName.trim(),
        name: name.trim(),
        block: parentBlock.trim() || selectedDefinition.blockName.trim(),
        type,
        color: color.trim(),
        parameters: selectedParameters.map((entry) => entry.parameterName.trim()),
        headerSlots,
      },
      parameterSources: resolveParameterSourcesForWrite(),
    })
  }

  return (
    <>
      {createPortal(
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
          <div
            className={styles.panel}
            onKeyDown={(event) => {
              if (event.key === 'Escape') {
                event.preventDefault()
                if (createParameterOpen) {
                  setCreateParameterOpen(false)
                  return
                }
                onCancel()
              } else if (event.key === 'Enter' && canConfirm && !createParameterOpen) {
                event.preventDefault()
                submit()
              }
            }}
          >
            <p className={styles.title} id={titleId}>
              {t(LangId.EditBlockDialogTitle, 'Editar bloco do catálogo')}
            </p>
            <p className={styles.hint}>
              {t(LangId.EditBlockDialogHint, 'Actualiza a definição em blockStructures/blocks/.')}
            </p>

            <div className={styles.field}>
              <span>{t(LangId.EditBlockDialogSelect, 'Bloco a editar')}</span>
              {loadingBlocks ? (
                <p className={styles.hint}>
                  {t(LangId.CreateBlockDialogLoadingBlocks, 'A carregar blocos…')}
                </p>
              ) : (
                <EmbeddedStructureListPicker
                  emptyHint={t(LangId.EditBlockDialogSelect, 'Seleccionar bloco')}
                  items={blockListItems}
                  listTitle={t(LangId.EditBlockDialogSelect, 'Bloco')}
                  selectedId={selectedBlockName || null}
                  onPick={(item) => setSelectedBlockName(item.id)}
                />
              )}
            </div>

            {selectedDefinition ? (
              <>
                <p className={styles.previewId}>
                  blockName: {selectedDefinition.blockName} · id: {selectedDefinition.id}
                </p>

                <label className={styles.field}>
                  {t(LangId.CreateBlockDialogName, 'Título (name)')}
                  <input
                    className={styles.input}
                    onChange={(event) => setName(event.target.value)}
                    value={name}
                  />
                </label>

                <div className={styles.field}>
                  <span>{t(LangId.CreateBlockDialogParameters, 'Parâmetros do bloco')}</span>
                  <span className={styles.fieldHint}>
                    {t(
                      LangId.EditBlockDialogParametersHint,
                      'Catálogo completo — escolha na lista ou use + para criar um parâmetro novo.',
                    )}
                  </span>
                  {selectedParameters.length > 0 ? (
                    <div className={styles.chipList}>
                      <span className={styles.slotLabel}>
                        {t(LangId.CreateBlockDialogParametersSelected, 'Seleccionados ({count})', {
                          count: selectedParameters.length,
                        })}
                      </span>
                      {selectedParameters.map((doc) => (
                        <span key={catalogParameterPickerKey(doc)} className={styles.chip}>
                          {doc.parameterName} · {doc.type}
                          <button
                            className={styles.chipRemove}
                            onClick={() => removeParameter(doc.parameterName)}
                            title={`Remover ${doc.parameterName}`}
                            type="button"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  ) : null}
                  {loadingParameters ? (
                    <p className={styles.hint}>
                      {t(LangId.CreateBlockDialogParametersLoading, 'A carregar parâmetros…')}
                    </p>
                  ) : (
                    <EmbeddedStructureListPicker
                      actions={parameterListActions}
                      emptyHint={parametersEmptyHint}
                      items={parameterListItems}
                      listTitle={t(LangId.CreateBlockDialogParameters, 'Parâmetros do bloco')}
                      panelWidth={440}
                      selectedId={null}
                      onPick={(item) => addParameter(item.id)}
                    />
                  )}
                  {parametersLoadError ? <p className={styles.error}>{parametersLoadError}</p> : null}
                  {parameterAddError ? <p className={styles.error}>{parameterAddError}</p> : null}
                  {blockParametersPreview.length > 0 ? (
                    <p className={styles.previewId}>
                      parameters: [{blockParametersPreview.join(', ')}]
                    </p>
                  ) : null}
                </div>

                <div className={styles.field}>
                  <CatalogSlotChipList
                    chips={headerSlots}
                    hint={t(
                      LangId.EditBlockDialogHeaderSlotsHint,
                      'Slots in/out do header do bloco (ex.: in[Main], out[MainPreview]).',
                    )}
                    label={t(LangId.EditBlockDialogHeaderSlots, 'Header slots')}
                    onChange={setHeaderSlots}
                  />
                </div>

                <div className={styles.field}>
                  <span>{t(LangId.CreateBlockDialogType, 'Tipo de bloco')}</span>
                  <EmbeddedStructureListPicker
                    emptyHint={t(LangId.CreateBlockDialogSelectType, 'Escolha o tipo na lista')}
                    items={typeListItems}
                    listTitle={t(LangId.CreateBlockDialogType, 'Tipo de bloco')}
                    panelWidth={440}
                    selectedId={type}
                    onPick={(item) => setType(item.id as BlockTypeId)}
                  />
                </div>

                <div className={styles.field}>
                  <span>{t(LangId.CreateBlockDialogBlock, 'Bloco pai')}</span>
                  <span className={styles.fieldHint}>
                    {t(
                      LangId.CreateBlockDialogBlockHint,
                      'Estrutura à qual este bloco pertence.',
                    )}
                  </span>
                  <EmbeddedStructureListPicker
                    emptyHint={t(LangId.CreateBlockDialogSelectParent, 'Escolha o bloco pai na lista')}
                    items={parentListItems}
                    listTitle={t(LangId.CreateBlockDialogBlock, 'Bloco pai')}
                    panelWidth={440}
                    selectedId={parentBlock || null}
                    onPick={(item) => setParentBlock(item.id)}
                  />
                </div>

                <label className={styles.field}>
                  {t(LangId.CreateBlockDialogColor, 'Cor do header')}
                  <div className={styles.colorRow}>
                    <input
                      className={styles.colorSwatch}
                      onChange={(event) => setColor(event.target.value)}
                      type="color"
                      value={/^#[0-9a-fA-F]{6}$/.test(color) ? color : '#40ff56'}
                    />
                    <input
                      className={[styles.input, styles.colorHexInput].join(' ')}
                      onChange={(event) => setColor(event.target.value)}
                      value={color}
                    />
                  </div>
                </label>
              </>
            ) : null}

            {loadError ? <p className={styles.error}>{loadError}</p> : null}
            {validationError && selectedDefinition ? (
              <p className={styles.error}>{validationError}</p>
            ) : null}

            <div className={styles.actions}>
              <button className={styles.ghostButton} onClick={onCancel} type="button">
                {t(LangId.CreateBlockDialogCancel, 'Cancelar')}
              </button>
              <button
                className={styles.primaryButton}
                disabled={!canConfirm}
                onClick={submit}
                type="button"
              >
                {t(LangId.EditBlockDialogConfirm, 'Guardar alterações')}
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )}

      <CreateParameterDialog
        fixedBlockName={selectedBlockName.trim() || undefined}
        isOpen={createParameterOpen}
        nested
        onCancel={() => setCreateParameterOpen(false)}
        onConfirm={handleCreateParameter}
      />
    </>
  )
}
