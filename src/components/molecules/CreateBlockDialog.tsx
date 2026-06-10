import { useCallback, useEffect, useId, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'

import { CreateParameterDialog } from '@/components/molecules/CreateParameterDialog'
import { EmbeddedStructureListPicker } from '@/components/molecules/EmbeddedStructureListPicker'
import type { StructureListPanelItem } from '@/components/molecules/StructureListPanel'
import type { ManualBlockParameterFormInput, ManualBlockParameterSelection } from '@/core/blockCatalogCreate'
import { fetchBlockDefinitionsFromDisk } from '@/core/blockDefinitionDiskLoader'
import type { BlockDefinitionJsonDocument } from '@/core/blockDefinitionJson'
import {
  blockNameToCatalogNodeId,
  buildBlockDefinitionDocumentId,
  type ManualBlockDefinitionInput,
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

const DEFAULT_COLOR = '#40ff56'

export type CreateBlockDialogConfirmPayload = {
  input: ManualBlockDefinitionInput
  parameterSources: ManualBlockParameterSelection[]
}

export type CreateBlockDialogProps = {
  isOpen: boolean
  onCancel: () => void
  onConfirm: (payload: CreateBlockDialogConfirmPayload) => void
}

export function CreateBlockDialog({ isOpen, onCancel, onConfirm }: CreateBlockDialogProps) {
  const { t } = useLanguage()
  const titleId = useId()
  const [definitions, setDefinitions] = useState<BlockDefinitionJsonDocument[]>([])
  const [loadingBlocks, setLoadingBlocks] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [catalogParameters, setCatalogParameters] = useState<BlockParameterJsonDocument[]>([])
  const [loadingParameters, setLoadingParameters] = useState(false)
  const [parametersLoadError, setParametersLoadError] = useState<string | null>(null)
  const [selectedParameters, setSelectedParameters] = useState<BlockParameterJsonDocument[]>([])
  const [createParameterOpen, setCreateParameterOpen] = useState(false)
  const [parameterAddError, setParameterAddError] = useState<string | null>(null)

  const [blockName, setBlockName] = useState('')
  const [name, setName] = useState('')
  const [nameTouched, setNameTouched] = useState(false)
  const [parentBlock, setParentBlock] = useState('')
  const [parentTouched, setParentTouched] = useState(false)
  const [type, setType] = useState<BlockTypeId>('standalone')
  const [color, setColor] = useState(DEFAULT_COLOR)

  useEffect(() => {
    if (!isOpen) {
      return
    }
    setBlockName('')
    setName('')
    setNameTouched(false)
    setParentBlock('')
    setParentTouched(false)
    setType('standalone')
    setColor(DEFAULT_COLOR)
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

  useEffect(() => {
    if (nameTouched) {
      return
    }
    const trimmed = blockName.trim()
    if (trimmed) {
      setName(trimmed)
    }
  }, [blockName, nameTouched])

  useEffect(() => {
    if (parentTouched) {
      return
    }
    const trimmed = blockName.trim()
    if (trimmed) {
      setParentBlock(trimmed)
    }
  }, [blockName, parentTouched])

  const effectiveName = name.trim() || blockName.trim()
  const effectiveParent = parentBlock.trim() || blockName.trim()

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
    const available = catalogParameters.filter(
      (doc) => !selectedParameterNames.has(doc.parameterName.trim()),
    )
    return available.map((doc, index) => ({
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

  const resolveParentParameterDocuments = useCallback(
    (parentBlockName: string): BlockParameterJsonDocument[] => {
      const parent = parentBlockName.trim()
      if (!parent) {
        return []
      }
      const definition = definitions.find((entry) => entry.blockName.trim() === parent)
      if (!definition) {
        return []
      }
      const docs: BlockParameterJsonDocument[] = []
      for (const paramName of definition.parameters) {
        const match = catalogParameters.find(
          (doc) =>
            doc.block.trim() === parent && doc.parameterName.trim() === paramName.trim(),
        )
        if (match) {
          docs.push(match)
        }
      }
      return docs
    },
    [catalogParameters, definitions],
  )

  const mergeSelectedWithDraftParameters = useCallback(
    (
      fromParent: BlockParameterJsonDocument[],
      draft: BlockParameterJsonDocument[],
    ): BlockParameterJsonDocument[] => {
      const merged: BlockParameterJsonDocument[] = []
      const seen = new Set<string>()
      for (const doc of [...fromParent, ...draft]) {
        const parameterName = doc.parameterName.trim()
        if (!parameterName || seen.has(parameterName)) {
          continue
        }
        seen.add(parameterName)
        merged.push(doc)
      }
      return merged
    },
    [],
  )

  useEffect(() => {
    if (!isOpen || !parentTouched || loadingParameters) {
      return
    }
    const parent = effectiveParent.trim()
    if (!parent) {
      return
    }
    const fromParent = resolveParentParameterDocuments(parent)
    setSelectedParameters((current) => {
      const draft = current.filter((doc) => doc.block.trim() === blockName.trim())
      return mergeSelectedWithDraftParameters(fromParent, draft)
    })
  }, [
    blockName,
    effectiveParent,
    isOpen,
    loadingParameters,
    mergeSelectedWithDraftParameters,
    parentTouched,
    resolveParentParameterDocuments,
  ])

  const parentListItems = useMemo((): StructureListPanelItem[] => {
    const entries = Array.from(
      new Set(definitions.map((definition) => definition.blockName.trim()).filter(Boolean)),
    ).sort((a, b) => a.localeCompare(b))

    return entries.map((entry, index) => ({
      id: entry,
      index,
      label: entry,
    }))
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

  const previewId = useMemo(() => {
    const className = blockName.trim()
    const displayName = effectiveName
    if (!className || !displayName) {
      return null
    }
    return buildBlockDefinitionDocumentId(className, displayName)
  }, [blockName, effectiveName])

  const validationError = useMemo(() => {
    if (!blockName.trim()) {
      return t(LangId.CreateBlockDialogErrorBlockName, 'Indique o nome da classe (blockName).')
    }
    if (!effectiveName) {
      return t(LangId.CreateBlockDialogErrorName, 'Indique o título (name).')
    }
    if (effectiveName.includes('_')) {
      return t(LangId.CreateBlockDialogErrorNameUnderscore, 'O título não pode conter "_".')
    }
    if (!/^#[0-9a-fA-F]{6}$/.test(color.trim())) {
      return t(LangId.CreateBlockDialogErrorColor, 'A cor deve ser hex (#RRGGBB).')
    }
    return null
  }, [blockName, color, effectiveName, t])

  const parameterListActions = useMemo(
    () => ({
      add: {
        ariaLabel: t(LangId.CreateBlockDialogParameterAdd, 'Novo parâmetro'),
        title: t(LangId.CreateBlockDialogParameterAdd, 'Novo parâmetro'),
        disabled: !blockName.trim(),
        onClick: () => {
          const trimmedBlock = blockName.trim()
          if (!trimmedBlock) {
            setParameterAddError(
              t(
                LangId.CreateBlockDialogParameterAddNeedBlock,
                'Indique o nome da classe do bloco antes de criar um parâmetro.',
              ),
            )
            return
          }
          setParameterAddError(null)
          setCreateParameterOpen(true)
        },
      },
    }),
    [blockName, t],
  )

  if (!isOpen) {
    return null
  }

  const canConfirm = validationError === null && !loadingBlocks

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
    const trimmedBlock = blockName.trim()
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
    setCreateParameterOpen(false)
    setParameterAddError(null)
  }

  const submit = () => {
    if (!canConfirm) {
      return
    }
    onConfirm({
      input: {
        blockName: blockName.trim(),
        name: effectiveName,
        block: effectiveParent,
        type,
        color: color.trim(),
        parameters: selectedParameters.map((entry) => entry.parameterName.trim()),
      },
      parameterSources: selectedParameters.map((source) => ({ source })),
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
          {t(LangId.CreateBlockDialogTitle, 'Criar novo bloco')}
        </p>
        <p className={styles.hint}>
          {t(
            LangId.CreateBlockDialogHint,
            'Grava a definição em blockStructures/blocks/ (catálogo). Não adiciona nada ao canvas.',
          )}
        </p>

        <label className={styles.field}>
          {t(LangId.CreateBlockDialogBlockName, 'Classe (blockName)')}
          <span className={styles.fieldHint}>
            {t(
              LangId.CreateBlockDialogBlockNameHint,
              'Nome PascalCase da classe, ex.: ValueFloat ou VfxSystemDefinitionData',
            )}
          </span>
          <input
            autoFocus
            className={styles.input}
            onChange={(event) => setBlockName(event.target.value)}
            placeholder="ValueFloat"
            value={blockName}
          />
        </label>

        <label className={styles.field}>
          {t(LangId.CreateBlockDialogName, 'Título (name)')}
          <span className={styles.fieldHint}>
            {t(
              LangId.CreateBlockDialogNameHint,
              'Nome mostrado no editor; se vazio, usa o mesmo que a classe',
            )}
          </span>
          <input
            className={styles.input}
            onChange={(event) => {
              setNameTouched(true)
              setName(event.target.value)
            }}
            placeholder={blockName.trim() || 'ValueFloat'}
            value={name}
          />
        </label>

        {previewId ? (
          <p className={styles.previewId}>
            {t(LangId.CreateBlockDialogPreviewId, 'ID no catálogo: {id}', { id: previewId })}
          </p>
        ) : null}

        <div className={styles.field}>
          <span>{t(LangId.CreateBlockDialogParameters, 'Parâmetros do bloco')}</span>
          <span className={styles.fieldHint}>
            {t(
              LangId.CreateBlockDialogParametersHint,
              'Escolha na lista ou use + para criar um parâmetro novo para este bloco.',
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
              'Estrutura à qual este bloco pertence. Em standalone, normalmente é a própria classe.',
            )}
          </span>
          {loadingBlocks ? (
            <p className={styles.hint}>
              {t(LangId.CreateBlockDialogLoadingBlocks, 'A carregar blocos…')}
            </p>
          ) : (
            <EmbeddedStructureListPicker
              emptyHint={t(LangId.CreateBlockDialogSelectParent, 'Escolha o bloco pai na lista')}
              items={parentListItems}
              listTitle={t(LangId.CreateBlockDialogBlock, 'Bloco pai')}
              panelWidth={440}
              selectedId={effectiveParent || null}
              onPick={(item) => {
                setParentTouched(true)
                setParentBlock(item.id)
              }}
            />
          )}
        </div>

        {loadError ? <p className={styles.error}>{loadError}</p> : null}

        <label className={styles.field}>
          {t(LangId.CreateBlockDialogColor, 'Cor do header')}
          <div className={styles.colorRow}>
            <input
              aria-label={t(LangId.CreateBlockDialogColor, 'Cor do header')}
              className={styles.colorSwatch}
              onChange={(event) => setColor(event.target.value)}
              type="color"
              value={/^#[0-9a-fA-F]{6}$/.test(color) ? color : DEFAULT_COLOR}
            />
            <input
              className={[styles.input, styles.colorHexInput].join(' ')}
              onChange={(event) => setColor(event.target.value)}
              placeholder="#40ff56"
              value={color}
            />
          </div>
        </label>

        {validationError ? <p className={styles.error}>{validationError}</p> : null}

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
            {t(LangId.CreateBlockDialogConfirm, 'Criar bloco')}
          </button>
        </div>
          </div>
        </div>,
        document.body,
      )}

      <CreateParameterDialog
        fixedBlockName={blockName.trim() || undefined}
        isOpen={createParameterOpen}
        nested
        onCancel={() => setCreateParameterOpen(false)}
        onConfirm={handleCreateParameter}
      />
    </>
  )
}
