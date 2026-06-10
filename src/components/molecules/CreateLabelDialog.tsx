import { useEffect, useId, useMemo, useState } from 'react'

import { createPortal } from 'react-dom'



import { EmbeddedStructureListPicker } from '@/components/molecules/EmbeddedStructureListPicker'

import type { StructureListPanelItem } from '@/components/molecules/StructureListPanel'

import type { BlockParameterDef } from '@/core/blockSchema'

import type { CreateLabelDraft } from '@/core/labelSchema'
import {
  catalogParametersForBlockType,
  listBlockTypeOptionsForLabelPicker,
  resolveCatalogParameterLabel,
} from '@/core/labelParentLinking'

import { LangId } from '@/core/language/languageIds'

import { useLanguage } from '@/language/LanguageProvider'



import styles from './CatalogFormDialog.module.css'



const DEFAULT_COLOR = '#f5d000'



export type LabelDialogMode = 'create' | 'edit'



export type CreateLabelDialogProps = {

  isOpen: boolean

  mode?: LabelDialogMode

  variant?: 'fromParent' | 'standalone'

  parentBlockName: string

  parentParameters: readonly BlockParameterDef[]

  reservedParameterIds?: readonly string[]

  initialDraft?: CreateLabelDraft | null

  onCancel: () => void

  onConfirm: (draft: CreateLabelDraft) => void

}



export function CreateLabelDialog({

  isOpen,

  mode = 'create',

  variant = 'fromParent',

  parentBlockName,

  parentParameters,

  reservedParameterIds = [],

  initialDraft = null,

  onCancel,

  onConfirm,

}: CreateLabelDialogProps) {

  const { t } = useLanguage()

  const titleId = useId()

  const [labelName, setLabelName] = useState('')

  const [color, setColor] = useState(DEFAULT_COLOR)

  const [selectedParameterIds, setSelectedParameterIds] = useState<string[]>([])

  const [addPanelOpen, setAddPanelOpen] = useState(false)

  const [selectedBlockType, setSelectedBlockType] = useState('')

  const [validationError, setValidationError] = useState<string | null>(null)

  const blockTypeOptions = useMemo(() => listBlockTypeOptionsForLabelPicker(), [])

  const blockTypeListItems = useMemo(
    (): StructureListPanelItem[] =>
      blockTypeOptions.map((option, index) => ({
        id: option.blockType,
        index,
        label: option.label,
      })),
    [blockTypeOptions],
  )

  const standaloneParameters = useMemo(
    () => catalogParametersForBlockType(selectedBlockType),
    [selectedBlockType],
  )

  const parameterPool = variant === 'standalone' ? standaloneParameters : parentParameters



  useEffect(() => {

    if (!isOpen) {

      return

    }

    if (mode === 'edit' && initialDraft) {

      setLabelName(initialDraft.labelName)

      setColor(initialDraft.color || DEFAULT_COLOR)

      setSelectedParameterIds(initialDraft.parameters.map((entry) => entry.parameterId))

      setSelectedBlockType(initialDraft.catalogBlockType?.trim() ?? '')

    } else {

      setLabelName('')

      setColor(DEFAULT_COLOR)

      setSelectedParameterIds([])

      setSelectedBlockType('')

    }

    setAddPanelOpen(false)

    setValidationError(null)

  }, [initialDraft, isOpen, mode])

  useEffect(() => {

    if (variant !== 'standalone' || !selectedBlockType) {

      return

    }

    const validIds = new Set(standaloneParameters.map((entry) => entry.idParameter))

    setSelectedParameterIds((current) => current.filter((id) => validIds.has(id)))

  }, [selectedBlockType, standaloneParameters, variant])



  const availableItems = useMemo((): StructureListPanelItem[] => {

    const used = new Set(selectedParameterIds)

    const reserved = new Set(reservedParameterIds)

    return parameterPool

      .filter((param) => !used.has(param.idParameter) && !reserved.has(param.idParameter))

      .map((param, index) => ({

        id: param.idParameter,

        index,

        label: param.nameParameter || param.idParameter,

      }))

  }, [parameterPool, reservedParameterIds, selectedParameterIds])



  const selectedItems = useMemo(

    () =>

      selectedParameterIds.map((id, index) => {

        const param = parameterPool.find((entry) => entry.idParameter === id)

        return {

          id,

          index,

          label:

            param?.nameParameter ||

            (variant === 'standalone' ? resolveCatalogParameterLabel(id) : id) ||

            id,

        }

      }),

    [parameterPool, selectedParameterIds, variant],

  )



  const canConfirm = labelName.trim().length > 0



  const submit = () => {

    const trimmedName = labelName.trim()

    if (!trimmedName) {

      setValidationError(t(LangId.CreateLabelDialogNameRequired, 'Indique o nome da etiqueta.'))

      return

    }

    onConfirm({

      labelName: trimmedName,

      color: color.trim() || DEFAULT_COLOR,

      parameters: selectedParameterIds.map((parameterId) => ({ parameterId })),

      ...(variant === 'standalone' && selectedBlockType.trim()

        ? { catalogBlockType: selectedBlockType.trim() }

        : {}),

    })

  }



  if (!isOpen) {

    return null

  }



  const title =

    mode === 'edit'

      ? t(LangId.EditLabelDialogTitle, 'Editar etiqueta')

      : t(LangId.CreateLabelDialogTitle, 'Criar etiqueta')

  const confirmLabel =

    mode === 'edit'

      ? t(LangId.EditLabelDialogConfirm, 'Guardar alterações')

      : t(LangId.CreateLabelDialogConfirm, 'Criar etiqueta')



  return createPortal(

    <div

      className={styles.backdrop}

      onMouseDown={(event) => {

        if (event.target === event.currentTarget) {

          onCancel()

        }

      }}

      role="presentation"

    >

      <div aria-labelledby={titleId} className={styles.panel} role="dialog">

        <h2 className={styles.title} id={titleId}>

          {title}

        </h2>

        <p className={styles.hint}>

          {variant === 'standalone'

            ? t(

                LangId.CreateLabelDialogHintStandalone,

                'Crie uma etiqueta independente. Vincule-a a um bloco depois pelo rodapé «Bloco vinculado».',

              )
            : t(

                LangId.CreateLabelDialogHint,

                'Segmentar parâmetros do bloco «{name}». A lista começa vazia — adicione os parâmetros desejados.',

                { name: parentBlockName },

              )}

        </p>



        {variant === 'standalone' ? (

          <div className={styles.field}>

            <span>{t(LangId.CreateLabelDialogBlockType, 'Tipo de bloco')}</span>

            <span className={styles.fieldHint}>

              {t(

                LangId.CreateLabelDialogBlockTypeHint,

                'Os parâmetros disponíveis são filtrados pelo tipo de bloco seleccionado.',

              )}

            </span>

            <EmbeddedStructureListPicker

              emptyHint={t(

                LangId.CreateLabelDialogBlockTypePlaceholder,

                'Seleccione um tipo de bloco…',

              )}

              items={blockTypeListItems}

              listTitle={t(LangId.CreateLabelDialogBlockType, 'Tipo de bloco')}

              panelWidth={440}

              selectedId={selectedBlockType || null}

              onPick={(item) => {

                setSelectedBlockType(item.id)

                setAddPanelOpen(false)

              }}

            />

          </div>

        ) : null}



        <label className={styles.field}>

          {t(LangId.CreateLabelDialogName, 'Nome da etiqueta')}

          <input

            className={styles.input}

            onChange={(event) => setLabelName(event.target.value)}

            value={labelName}

          />

        </label>



        <label className={styles.field}>

          {t(LangId.CreateLabelDialogColor, 'Cor')}

          <div className={styles.colorRow}>

            <input

              aria-label={t(LangId.CreateLabelDialogColor, 'Cor')}

              className={styles.colorSwatch}

              onChange={(event) => setColor(event.target.value)}

              type="color"

              value={/^#[0-9a-fA-F]{6}$/.test(color) ? color : DEFAULT_COLOR}

            />

            <input

              className={[styles.input, styles.colorHexInput].join(' ')}

              onChange={(event) => setColor(event.target.value)}

              placeholder="#f5d000"

              value={color}

            />

          </div>

        </label>



        <div className={styles.field}>

          {t(LangId.CreateLabelDialogParameters, 'Parâmetros')}

          <div className={styles.paramList}>

            {selectedItems.length === 0 ? (

              <p className={styles.hint}>

                {t(LangId.CreateLabelDialogParametersEmpty, 'Nenhum parâmetro seleccionado.')}

              </p>

            ) : (

              selectedItems.map((item) => (

                <div className={styles.paramListRow} key={item.id}>

                  <span>{item.label}</span>

                  <button

                    className={styles.ghostButton}

                    onClick={() =>

                      setSelectedParameterIds((current) =>

                        current.filter((entry) => entry !== item.id),

                      )

                    }

                    type="button"

                  >

                    {t(LangId.CreateLabelDialogRemoveParam, 'Remover')}

                  </button>

                </div>

              ))

            )}

          </div>

          <button

            className={styles.secondaryButton}

            disabled={variant === 'standalone' && !selectedBlockType}

            onClick={() => setAddPanelOpen((value) => !value)}

            type="button"

          >

            {t(LangId.CreateLabelDialogAddParam, 'Adicionar parâmetro')}

          </button>

          {variant === 'standalone' && !selectedBlockType ? (

            <p className={styles.hint}>

              {t(

                LangId.CreateLabelDialogSelectBlockTypeFirst,

                'Seleccione um tipo de bloco para adicionar parâmetros.',

              )}

            </p>

          ) : null}

          {addPanelOpen && (variant !== 'standalone' || selectedBlockType) ? (

            <div className={styles.listPickerWrap}>

              <EmbeddedStructureListPicker

                emptyHint={t(

                  variant === 'standalone'

                    ? LangId.CreateLabelDialogNoMoreCatalogParams

                    : LangId.CreateLabelDialogNoMoreParams,

                  variant === 'standalone'

                    ? 'Todos os parâmetros deste tipo de bloco já estão na lista.'

                    : 'Todos os parâmetros do bloco já estão na lista.',

                )}

                items={availableItems}

                listTitle={t(

                  variant === 'standalone'

                    ? LangId.CreateLabelDialogPickCatalogParam

                    : LangId.CreateLabelDialogPickParam,

                  variant === 'standalone'

                    ? 'Parâmetros do tipo de bloco'

                    : 'Parâmetros do bloco',

                )}

                panelWidth={440}

                selectedId={null}

                onPick={(item) => {

                  setSelectedParameterIds((current) =>

                    current.includes(item.id) ? current : [...current, item.id],

                  )

                }}

              />

            </div>

          ) : null}

        </div>



        {validationError ? <p className={styles.error}>{validationError}</p> : null}



        <div className={styles.actions}>

          <button className={styles.ghostButton} onClick={onCancel} type="button">

            {t(LangId.CreateLabelDialogCancel, 'Cancelar')}

          </button>

          <button

            className={styles.primaryButton}

            disabled={!canConfirm}

            onClick={submit}

            type="button"

          >

            {confirmLabel}

          </button>

        </div>

      </div>

    </div>,

    document.body,

  )

}


