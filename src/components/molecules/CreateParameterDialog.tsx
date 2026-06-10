import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

import { EmbeddedStructureListPicker } from '@/components/molecules/EmbeddedStructureListPicker'
import type { StructureListPanelItem } from '@/components/molecules/StructureListPanel'
import type { ManualBlockParameterFormInput } from '@/core/blockCatalogCreate'
import type { BlockDefinitionJsonDocument } from '@/core/blockDefinitionJson'
import { fetchBlockDefinitionsFromDisk } from '@/core/blockDefinitionDiskLoader'
import type { BlockParameterJsonDocument } from '@/core/blockParameterJson'
import { blockParameterDocumentToManualInput } from '@/core/blockParameterManualBuild'
import { LangId } from '@/core/language/languageIds'
import { useLanguage } from '@/language/LanguageProvider'

import styles from './CatalogFormDialog.module.css'

// ── tipos de parâmetro ───────────────────────────────────────────────────────

const SIMPLE_TYPES = [
  'string',
  'u32',
  'i32',
  'u16',
  'i16',
  'u8',
  'i8',
  'f32',
  'bool',
  'vec2',
  'vec3',
  'vec4',
  'mtx44',
  'link',
] as const

const STRUCTURAL_TYPES = ['embed', 'pointer'] as const
const MAP_TYPES = ['mapHashEmbed', 'mapHashPointer', 'mapU64Pointer'] as const
const LIST_TYPES = [
  'listF32',
  'listString',
  'listHash',
  'listVector2',
  'listVector3',
  'listVector4',
] as const
const OPTION_TYPES = ['optionF32', 'optionString', 'optionVector3'] as const

const ALL_TYPES = [
  ...SIMPLE_TYPES,
  ...STRUCTURAL_TYPES,
  ...MAP_TYPES,
  ...LIST_TYPES,
  ...OPTION_TYPES,
] as const

type ParameterType = (typeof ALL_TYPES)[number]

function typeCategory(type: ParameterType): 'simple' | 'structural' | 'map' | 'list' | 'option' {
  if ((STRUCTURAL_TYPES as readonly string[]).includes(type)) return 'structural'
  if ((MAP_TYPES as readonly string[]).includes(type)) return 'map'
  if ((LIST_TYPES as readonly string[]).includes(type)) return 'list'
  if ((OPTION_TYPES as readonly string[]).includes(type)) return 'option'
  return 'simple'
}

// ── componente de lista de chips de slot ─────────────────────────────────────

function SlotChipList({
  label,
  hint,
  chips,
  onChange,
}: {
  label: string
  hint?: string
  chips: string[]
  onChange: (next: string[]) => void
}) {
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
              onClick={() => onChange(chips.filter((c) => c !== chip))}
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
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              add()
            }
          }}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="ex.: VfxSystemDefinitionData"
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

// ── diálogo principal ────────────────────────────────────────────────────────

export type CreateParameterDialogProps = {
  isOpen: boolean
  onCancel: () => void
  onConfirm: (input: ManualBlockParameterFormInput) => void
  /** Bloco fixo (ex.: bloco ainda não gravado durante criarNovoBloco). */
  fixedBlockName?: string
  /** Documento existente para modo edição. */
  editDocument?: BlockParameterJsonDocument | null
  /** Diálogo sobre outro modal (z-index mais alto). */
  nested?: boolean
}

export function CreateParameterDialog({
  isOpen,
  onCancel,
  onConfirm,
  fixedBlockName,
  editDocument = null,
  nested = false,
}: CreateParameterDialogProps) {
  const { t } = useLanguage()
  const titleId = useId()
  const [definitions, setDefinitions] = useState<BlockDefinitionJsonDocument[]>([])
  const [loadingBlocks, setLoadingBlocks] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [blockName, setBlockName] = useState('')
  const [parameterName, setParameterName] = useState('')
  const [name, setName] = useState('')
  const [type, setType] = useState<ParameterType>('string')

  // campos específicos por categoria
  const [value, setValue] = useState('')
  const [target, setTarget] = useState('')
  const [targetCustom, setTargetCustom] = useState('')
  const [list, setList] = useState(false)
  const [mapRawValue, setMapRawValue] = useState('')
  const [listItemsRaw, setListItemsRaw] = useState('')
  const [optionItem, setOptionItem] = useState('')

  // slots
  const [slotInChips, setSlotInChips] = useState<string[]>([])
  const [slotOutChips, setSlotOutChips] = useState<string[]>([])

  const effectiveFixedBlock = fixedBlockName?.trim() ?? ''
  const isEditMode = editDocument !== null

  useEffect(() => {
    if (!isOpen) return

    const manualInput = editDocument ? blockParameterDocumentToManualInput(editDocument) : null

    setBlockName(effectiveFixedBlock || manualInput?.blockName || '')
    setParameterName(manualInput?.parameterName ?? '')
    setName(manualInput?.name ?? '')
    setType((manualInput?.type as ParameterType) ?? 'string')
    setValue(manualInput?.value ?? '')
    setTarget(manualInput?.target ?? '')
    setTargetCustom('')
    setList(manualInput?.list === true)
    setMapRawValue(manualInput?.mapRawValue ?? '')
    setListItemsRaw(manualInput?.listItemsRaw ?? '')
    setOptionItem(manualInput?.optionItem ?? '')
    setSlotInChips(manualInput?.slotInTypes ?? [])
    setSlotOutChips(manualInput?.slotOutTypes ?? [])
    setLoadError(null)
    setLoadingBlocks(true)

    void fetchBlockDefinitionsFromDisk().then((result) => {
      setLoadingBlocks(false)
      if (!result.ok) {
        setLoadError(result.error)
        setDefinitions([])
        return
      }
      setDefinitions(result.definitions)
    })
  }, [editDocument, effectiveFixedBlock, isOpen])

  const blockListItems = useMemo(
    (): StructureListPanelItem[] =>
      definitions.map((definition, index) => ({
        id: definition.blockName,
        index,
        label: `${definition.name} (${definition.blockName})`,
      })),
    [definitions],
  )

  const structuralTargetItems = useMemo(
    (): StructureListPanelItem[] =>
      Array.from(new Set(definitions.map((d) => d.blockName.trim()).filter(Boolean)))
        .sort((a, b) => a.localeCompare(b))
        .map((entry, index) => ({
          id: entry,
          index,
          label: entry,
        })),
    [definitions],
  )

  // valor efectivo do alvo: texto manual tem prioridade sobre a lista
  const effectiveTarget = targetCustom.trim() || target

  const category = typeCategory(type)

  const activeBlockName = effectiveFixedBlock || blockName.trim()

  const blockExistingParameters = useMemo(() => {
    if (!activeBlockName) {
      return []
    }
    const definition = definitions.find(
      (entry) => entry.blockName.trim() === activeBlockName,
    )
    return definition?.parameters ?? []
  }, [activeBlockName, definitions])

  const validationError = useMemo(() => {
    if (!activeBlockName) return t(LangId.CreateParameterDialogErrorBlock, 'Seleccione um bloco.')
    if (!parameterName.trim())
      return t(LangId.CreateParameterDialogErrorParameterName, 'parameterName é obrigatório.')
    const displayName = name.trim() || parameterName.trim()
    if (displayName.includes('_'))
      return t(LangId.CreateParameterDialogErrorNameUnderscore, 'name não pode conter "_".')
    if (category === 'structural' && !effectiveTarget)
      return t(LangId.CreateParameterDialogErrorTarget, 'Indique o alvo (classe de bloco).')
    return null
  }, [activeBlockName, category, effectiveTarget, name, parameterName, t])

  if (!isOpen) return null

  const canConfirm = validationError === null && !loadingBlocks

  const submit = () => {
    if (!canConfirm) return

    const input: ManualBlockParameterFormInput = {
      blockName: activeBlockName,
      parameterName: parameterName.trim(),
      name: name.trim() || undefined,
      type,
      ...(slotInChips.length > 0 ? { slotInTypes: slotInChips } : {}),
      ...(slotOutChips.length > 0 ? { slotOutTypes: slotOutChips } : {}),
    }

    if (category === 'simple') {
      input.value = value
    } else if (category === 'structural') {
      input.target = effectiveTarget
      input.list = list
    } else if (category === 'map') {
      input.mapRawValue = mapRawValue
    } else if (category === 'list') {
      input.listItemsRaw = listItemsRaw
    } else if (category === 'option') {
      input.optionItem = optionItem.trim() || null
    }

    onConfirm(input)
  }

  return createPortal(
    <div
      aria-labelledby={titleId}
      aria-modal
      className={[styles.backdrop, nested ? styles.backdropNested : ''].filter(Boolean).join(' ')}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onCancel()
      }}
      role="dialog"
    >
      <div
        className={styles.panel}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            event.preventDefault()
            onCancel()
          }
        }}
      >
        <p className={styles.title} id={titleId}>
          {isEditMode
            ? t(LangId.EditParameterDialogFormTitle, 'Editar parâmetro')
            : t(LangId.CreateParameterDialogTitle, 'Criar novo parâmetro')}
        </p>
        <p className={styles.hint}>
          {isEditMode
            ? t(
                LangId.EditParameterDialogFormHint,
                'Actualiza o ficheiro em blockStructures/parameters/.',
              )
            : effectiveFixedBlock
              ? t(
                  LangId.CreateParameterDialogDeferredHint,
                  'O parâmetro será gravado ao confirmar a criação do bloco.',
                )
              : t(
                  LangId.CreateParameterDialogHint,
                  'Grava em blockStructures/parameters/ e actualiza o bloco pai.',
                )}
        </p>

        {/* ── bloco ── */}
        <div className={styles.field}>
          <span>{t(LangId.CreateParameterDialogBlock, 'Bloco')}</span>
          {effectiveFixedBlock ? (
            <p className={styles.previewId}>{effectiveFixedBlock}</p>
          ) : loadingBlocks ? (
            <p className={styles.hint}>
              {t(LangId.CreateParameterDialogLoadingBlocks, 'A carregar blocos…')}
            </p>
          ) : (
            <EmbeddedStructureListPicker
              emptyHint={t(LangId.CreateParameterDialogSelectBlock, 'Seleccionar bloco')}
              items={blockListItems}
              listTitle={t(LangId.CreateParameterDialogBlock, 'Bloco')}
              selectedId={blockName || null}
              onPick={(item) => setBlockName(item.id)}
            />
          )}
          {activeBlockName ? (
            <>
              <span className={styles.fieldHint}>
                {t(
                  LangId.CreateParameterDialogExistingParameters,
                  'Parâmetros no bloco ({count})',
                  { count: blockExistingParameters.length },
                )}
              </span>
              {blockExistingParameters.length > 0 ? (
                <div className={styles.chipList}>
                  {blockExistingParameters.map((entry) => (
                    <span key={entry} className={styles.chip}>
                      {entry}
                    </span>
                  ))}
                </div>
              ) : (
                <p className={styles.hint}>
                  {t(
                    LangId.CreateParameterDialogNoExistingParameters,
                    'Este bloco ainda não tem parâmetros no catálogo.',
                  )}
                </p>
              )}
            </>
          ) : null}
        </div>

        {loadError ? <p className={styles.error}>{loadError}</p> : null}

        {/* ── parameterName ── */}
        <label className={styles.field}>
          {t(LangId.CreateParameterDialogParameterName, 'parameterName')}
          <input
            className={styles.input}
            disabled={isEditMode}
            onChange={(event) => setParameterName(event.target.value)}
            value={parameterName}
          />
        </label>

        {/* ── name ── */}
        <label className={styles.field}>
          {t(LangId.CreateParameterDialogName, 'name (opcional)')}
          <input
            className={styles.input}
            onChange={(event) => setName(event.target.value)}
            value={name}
          />
        </label>

        {/* ── type ── */}
        <label className={styles.field}>
          {t(LangId.CreateParameterDialogType, 'type')}
          <select
            className={styles.select}
            onChange={(event) => setType(event.target.value as ParameterType)}
            value={type}
          >
            <optgroup label={t(LangId.CreateParameterDialogTypeSimple, 'Simples')}>
              {SIMPLE_TYPES.map((entry) => (
                <option key={entry} value={entry}>
                  {entry}
                </option>
              ))}
            </optgroup>
            <optgroup label={t(LangId.CreateParameterDialogTypeStructural, 'Estrutural')}>
              {STRUCTURAL_TYPES.map((entry) => (
                <option key={entry} value={entry}>
                  {entry}
                </option>
              ))}
            </optgroup>
            <optgroup label={t(LangId.CreateParameterDialogTypeMap, 'Map')}>
              {MAP_TYPES.map((entry) => (
                <option key={entry} value={entry}>
                  {entry}
                </option>
              ))}
            </optgroup>
            <optgroup label={t(LangId.CreateParameterDialogTypeList, 'Lista')}>
              {LIST_TYPES.map((entry) => (
                <option key={entry} value={entry}>
                  {entry}
                </option>
              ))}
            </optgroup>
            <optgroup label={t(LangId.CreateParameterDialogTypeOption, 'Opção')}>
              {OPTION_TYPES.map((entry) => (
                <option key={entry} value={entry}>
                  {entry}
                </option>
              ))}
            </optgroup>
          </select>
        </label>

        {/* ── campos específicos por tipo ── */}

        {category === 'simple' ? (
          <label className={styles.field}>
            {t(LangId.CreateParameterDialogValue, 'value')}
            <input
              className={styles.input}
              onChange={(event) => setValue(event.target.value)}
              value={value}
            />
          </label>
        ) : null}

        {category === 'structural' ? (
          <>
            <div className={styles.field}>
              <span>{t(LangId.CreateParameterDialogTarget, 'Alvo (classe de bloco)')}</span>
              <EmbeddedStructureListPicker
                emptyHint={t(LangId.CreateParameterDialogSelectTarget, 'Escolher estrutura')}
                items={structuralTargetItems}
                listTitle={t(LangId.CreateParameterDialogTarget, 'Alvo (classe de bloco)')}
                selectedId={targetCustom ? null : target || null}
                onPick={(item) => {
                  setTarget(item.id)
                  setTargetCustom('')
                }}
              />
              <label className={styles.targetCustomRow}>
                <input
                  className={styles.input}
                  onChange={(event) => {
                    setTargetCustom(event.target.value)
                    if (event.target.value.trim()) {
                      setTarget('')
                    }
                  }}
                  placeholder={t(
                    LangId.CreateParameterDialogTargetPlaceholder,
                    'ou escreva o nome da classe',
                  )}
                  value={targetCustom}
                />
              </label>
            </div>
            <label className={styles.checkboxRow}>
              <input
                checked={list}
                onChange={(event) => setList(event.target.checked)}
                type="checkbox"
              />
              {t(LangId.CreateParameterDialogListFlag, 'list (fan-out)')}
            </label>
          </>
        ) : null}

        {category === 'map' ? (
          <label className={styles.field}>
            {t(LangId.CreateParameterDialogMapEntries, 'Entradas do map')}
            <textarea
              className={styles.textarea}
              onChange={(event) => setMapRawValue(event.target.value)}
              placeholder={t(
                LangId.CreateParameterDialogMapPlaceholder,
                'chave\ttarget\tschemaId (uma por linha)',
              )}
              value={mapRawValue}
            />
          </label>
        ) : null}

        {category === 'list' ? (
          <label className={styles.field}>
            {t(LangId.CreateParameterDialogListItems, 'Itens (um por linha)')}
            <textarea
              className={styles.textarea}
              onChange={(event) => setListItemsRaw(event.target.value)}
              value={listItemsRaw}
            />
          </label>
        ) : null}

        {category === 'option' ? (
          <label className={styles.field}>
            {t(LangId.CreateParameterDialogOptionItem, 'item')}
            <input
              className={styles.input}
              onChange={(event) => setOptionItem(event.target.value)}
              placeholder={t(LangId.CreateParameterDialogOptionEmpty, 'vazio = null')}
              value={optionItem}
            />
          </label>
        ) : null}

        {/* ── slots ── */}
        {category === 'simple' ? (
          <SlotChipList
            chips={slotInChips}
            hint={t(
              LangId.CreateParameterDialogSlotHint,
              'deixe vazio para usar o tipo calculado automaticamente',
            )}
            label={t(LangId.CreateParameterDialogSlotIn, 'slots.in')}
            onChange={setSlotInChips}
          />
        ) : null}

        <SlotChipList
          chips={slotOutChips}
          hint={
            category === 'simple'
              ? undefined
              : t(
                  LangId.CreateParameterDialogSlotHint,
                  'deixe vazio para usar o tipo calculado automaticamente',
                )
          }
          label={t(LangId.CreateParameterDialogSlotOut, 'slots.out')}
          onChange={setSlotOutChips}
        />

        {validationError ? <p className={styles.error}>{validationError}</p> : null}

        <div className={styles.actions}>
          <button className={styles.ghostButton} onClick={onCancel} type="button">
            {t(LangId.CreateParameterDialogCancel, 'Cancelar')}
          </button>
          <button
            className={styles.primaryButton}
            disabled={!canConfirm}
            onClick={submit}
            type="button"
          >
            {isEditMode
              ? t(LangId.EditParameterDialogConfirm, 'Guardar')
              : t(LangId.CreateParameterDialogConfirm, 'Criar')}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
