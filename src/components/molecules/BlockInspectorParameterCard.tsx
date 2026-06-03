import { useMemo, useState } from 'react'

import { BlockParameterIcon } from '@/components/atoms/BlockParameterIcon'
import { BlockInspectorComboField } from '@/components/molecules/BlockInspectorComboField'
import type { BlockInspectorDraftEntry, BlockInspectorSlotTag } from '@/core/blockSchema'
import {
  BLOCK_ICON_PRESETS,
  addSlotTag,
  blockInspectorTagsFromEntry,
  blockSlotPresetsForDirection,
  isBlockInspectorPointerEntry,
  mandatoryPointerSlotTags,
  parseSlotDraftInput,
  resolveBlockIconHint,
  slotRulesToTags,
  slotTagKey,
  slotTagsToRules,
  toggleSlotTagActive,
} from '@/core/blockInspectorUi'
import { isStructuralParameterSourcePath } from '@/core/blockParameterFromJson'
import { LangId } from '@/core/language/languageIds'
import { useLanguage } from '@/language/LanguageProvider'

import styles from './BlockInspectorParameterCard.module.css'

type BlockInspectorParameterCardProps = {
  entry: BlockInspectorDraftEntry
  onChange: (next: BlockInspectorDraftEntry) => void
  showExposeToggle?: boolean
  lockStructuralSlots?: boolean
}

function mergeStructuralSlotTags(
  entry: BlockInspectorDraftEntry,
  tags: BlockInspectorSlotTag[],
  lockStructural: boolean,
): BlockInspectorSlotTag[] {
  if (!lockStructural || !isStructuralParameterSourcePath(entry.sourcePath)) {
    return tags
  }

  const mandatory = slotRulesToTags(entry.slotRules).map((tag) => ({
    ...tag,
    active: true,
  }))
  const byKey = new Map(mandatory.map((tag) => [slotTagKey(tag), tag]))
  for (const tag of tags) {
    const key = slotTagKey(tag)
    const existing = byKey.get(key)
    if (existing) {
      byKey.set(key, { ...existing, active: tag.active || existing.direction === 'output' })
    } else if (tag.direction !== 'output') {
      byKey.set(key, tag)
    }
  }
  return [...byKey.values()]
}

export function BlockInspectorParameterCard({
  entry,
  onChange,
  showExposeToggle = true,
  lockStructuralSlots = false,
}: BlockInspectorParameterCardProps) {
  const { t } = useLanguage()
  const isPointerEntry = isBlockInspectorPointerEntry(entry)
  const [slotDirection, setSlotDirection] = useState<'input' | 'output'>('output')
  const slotTags = useMemo(() => {
    const base = isPointerEntry
      ? mandatoryPointerSlotTags(entry.typeParameter.trim() || entry.nameParameter || entry.ritualName)
      : blockInspectorTagsFromEntry(entry)
    return mergeStructuralSlotTags(entry, base, lockStructuralSlots)
  }, [entry, isPointerEntry, lockStructuralSlots])
  const iconOptions = useMemo(() => BLOCK_ICON_PRESETS.map((preset) => preset.id).filter(Boolean), [])
  const slotOptions = useMemo(() => blockSlotPresetsForDirection(slotDirection), [slotDirection])
  const iconHint = resolveBlockIconHint(entry.iconId ?? '')
  const ritualName = entry.ritualName

  const patch = (partial: Partial<BlockInspectorDraftEntry>) => {
    if (isPointerEntry) {
      const { nameParameter: _name, slotTags: _tags, iconId: _icon, iconHint: _hint, ...rest } = partial
      onChange({ ...entry, ...rest })
      return
    }
    onChange({ ...entry, ...partial })
  }

  const updateSlotTags = (tags: BlockInspectorSlotTag[]) => {
    if (isPointerEntry) {
      return
    }
    const merged = mergeStructuralSlotTags(entry, tags, lockStructuralSlots)
    patch({ slotTags: merged, slotRules: slotTagsToRules(merged) })
  }

  const addSlotFromRaw = (raw: string) => {
    const parsed = parseSlotDraftInput(raw, slotDirection)
    if (!parsed) {
      return
    }
    updateSlotTags(addSlotTag(slotTags, parsed))
  }

  return (
    <article className={styles.card} data-exposed={entry.exposed ? '1' : '0'} data-pointer={isPointerEntry ? '1' : '0'}>
      <header className={styles.cardHeader}>
        {showExposeToggle ? (
          <button
            type="button"
            className={styles.exposeToggle}
            aria-pressed={entry.exposed}
            aria-label={
              entry.exposed
                ? t(LangId.InspectorParamUnexposeFromBlock)
                : t(LangId.InspectorParamExposeInBlock)
            }
            onClick={() => patch({ exposed: !entry.exposed })}
          >
            <span className={styles.iconPreview} aria-hidden>
              {!isPointerEntry && (iconHint || entry.iconId?.trim()) ? (
                <BlockParameterIcon hint={iconHint} iconId={entry.iconId} />
              ) : null}
            </span>
          </button>
        ) : (
          <span className={styles.iconPreview} aria-hidden>
            {!isPointerEntry && (iconHint || entry.iconId?.trim()) ? (
              <BlockParameterIcon hint={iconHint} iconId={entry.iconId} />
            ) : null}
          </span>
        )}
        <div className={styles.titleBlock}>
          <span className={styles.paramTitle}>{entry.nameParameter || entry.ritualName}</span>
        </div>
        <span className={styles.typeBadge}>{isPointerEntry ? 'pointer' : entry.typeParameter}</span>
      </header>

      <div className={styles.fieldGrid}>
        <label className={styles.fieldLabel}>{t(LangId.InspectorParamLabel)}</label>
        <div className={styles.fieldControl}>
          <input
            className={styles.textInput}
            value={entry.nameParameter}
            readOnly={isPointerEntry}
            aria-readonly={isPointerEntry}
            aria-label={t(LangId.InspectorParamAria, undefined, { name: ritualName })}
            onChange={(event) => patch({ nameParameter: event.target.value })}
          />
        </div>

        {!isPointerEntry ? (
          <>
            <label className={styles.fieldLabel}>{t(LangId.InspectorParamIconLabel)}</label>
            <div className={styles.fieldControl}>
              <BlockInspectorComboField
                ariaLabel={t(LangId.InspectorParamIconAria, undefined, { name: ritualName })}
                mode="commit"
                options={iconOptions}
                placeholder="blend.png"
                value={entry.iconId ?? ''}
                onChange={(next) =>
                  patch({
                    iconId: next,
                    iconHint: resolveBlockIconHint(next),
                  })
                }
              />
            </div>

            <label className={styles.fieldLabel}>{t(LangId.InspectorParamSlotLabel)}</label>
            <div className={styles.slotRow}>
              <BlockInspectorComboField
                ariaLabel={t(LangId.InspectorParamSlotFieldAria, undefined, { name: ritualName })}
                mode="pick"
                options={slotOptions}
                placeholder="vec"
                value=""
                onPick={addSlotFromRaw}
              />
              <button
                type="button"
                className={styles.directionToggle}
                aria-label={t(LangId.InspectorParamToggleSlotDirection)}
                onClick={() => setSlotDirection((current) => (current === 'input' ? 'output' : 'input'))}
              >
                {slotDirection === 'input' ? 'IN' : 'OUT'}
              </button>
            </div>
          </>
        ) : (
          <>
            <label className={styles.fieldLabel}>{t(LangId.InspectorParamSlotLabel)}</label>
            <div className={styles.fieldControl}>
              <span className={styles.pointerSlotHint}>{t(LangId.InspectorParamMandatoryInputIn)}</span>
            </div>
          </>
        )}
      </div>

      {slotTags.length > 0 ? (
        <ul className={styles.tagList} aria-label={t(LangId.InspectorParamSlotsAria, undefined, { name: ritualName })}>
          {slotTags.map((tag) => {
            const key = slotTagKey(tag)
            const label = `${tag.direction === 'input' ? 'in' : 'out'}:${tag.type}`
            const locked =
              isPointerEntry ||
              (lockStructuralSlots && tag.direction === 'output' && isStructuralParameterSourcePath(entry.sourcePath))

            return (
              <li key={key}>
                {locked ? (
                  <span className={styles.tag} data-active="1" data-locked="1">
                    {label}
                  </span>
                ) : (
                  <button
                    type="button"
                    className={styles.tag}
                    data-active={tag.active ? '1' : '0'}
                    aria-pressed={tag.active}
                    onClick={() => updateSlotTags(toggleSlotTagActive(slotTags, key))}
                  >
                    {label}
                  </button>
                )}
              </li>
            )
          })}
        </ul>
      ) : null}

      <p className={styles.ritualHint}>{isPointerEntry ? `pointer · ${entry.ritualName}` : entry.ritualName}</p>
    </article>
  )
}
