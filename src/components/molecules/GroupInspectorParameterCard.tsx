import { useMemo } from 'react'



import { GroupParameterIcon } from '@/components/atoms/GroupParameterIcon'

import { GroupInspectorComboField } from '@/components/molecules/GroupInspectorComboField'

import type { GroupInspectorDraftEntry, GroupInspectorSlotTag } from '@/core/groupSchema'

import {

  GROUP_ICON_PRESETS,

  groupInspectorTagsFromEntry,

  isGroupInspectorPointerEntry,

  mandatoryPointerSlotTags,

  resolveGroupIconHint,

  slotTagKey,

  toggleSlotTagActive,

} from '@/core/groupInspectorUi'

import { LangId } from '@/core/language/languageIds'

import { useLanguage } from '@/language/LanguageProvider'



import styles from './GroupInspectorParameterCard.module.css'



type GroupInspectorParameterCardProps = {

  entry: GroupInspectorDraftEntry

  onChange: (next: GroupInspectorDraftEntry) => void

}



export function GroupInspectorParameterCard({ entry, onChange }: GroupInspectorParameterCardProps) {

  const { t } = useLanguage()

  const isPointerEntry = isGroupInspectorPointerEntry(entry)

  const slotTags = useMemo(

    () =>

      isPointerEntry

        ? mandatoryPointerSlotTags(entry.nameParameter || entry.ritualName)

        : groupInspectorTagsFromEntry(entry),

    [entry, isPointerEntry],

  )

  const iconOptions = useMemo(() => GROUP_ICON_PRESETS.map((preset) => preset.id).filter(Boolean), [])

  const iconHint = resolveGroupIconHint(entry.iconId ?? '')

  const ritualName = entry.ritualName



  const patch = (partial: Partial<GroupInspectorDraftEntry>) => {

    if (isPointerEntry) {

      const { nameParameter: _name, slotTags: _tags, iconId: _icon, iconHint: _hint, ...rest } = partial

      onChange({ ...entry, ...rest })

      return

    }

    onChange({ ...entry, ...partial })

  }



  const updateSlotTags = (tags: GroupInspectorSlotTag[]) => {

    if (isPointerEntry) {

      return

    }

    patch({ slotTags: tags })

  }



  return (

    <article className={styles.card} data-exposed={entry.exposed ? '1' : '0'} data-pointer={isPointerEntry ? '1' : '0'}>

      <header className={styles.cardHeader}>

        <button

          type="button"

          className={styles.exposeToggle}

          data-exposed={entry.exposed ? '1' : '0'}

          aria-pressed={entry.exposed}

          aria-label={

            entry.exposed

              ? t(LangId.InspectorParamUnexposeFromGroup)

              : t(LangId.InspectorParamExposeInGroup)

          }

          title={

            entry.exposed

              ? t(LangId.InspectorParamExposedInGroupTitle)

              : t(LangId.InspectorParamExposeInGroupTitle)

          }

          onClick={() => patch({ exposed: !entry.exposed })}

        >

          <i className={`fa-solid fa-thumbtack ${styles.pinIcon}`} aria-hidden />

        </button>

        <div className={styles.titleBlock}>

          {!isPointerEntry && (iconHint || entry.iconId?.trim()) ? (

            <span className={styles.paramIconPreview} aria-hidden>

              <GroupParameterIcon hint={iconHint} iconId={entry.iconId} />

            </span>

          ) : null}

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

              <GroupInspectorComboField

                ariaLabel={t(LangId.InspectorParamIconAria, undefined, { name: ritualName })}

                mode="commit"

                options={iconOptions}

                placeholder="blend.png"

                value={entry.iconId ?? ''}

                onChange={(next) =>

                  patch({

                    iconId: next,

                    iconHint: resolveGroupIconHint(next),

                  })

                }

              />

            </div>

          </>

        ) : null}



        <label className={styles.fieldLabel}>{t(LangId.InspectorParamSlotLabel)}</label>

        <div className={styles.fieldControl}>

          {isPointerEntry ? (

            <span className={styles.pointerSlotHint}>{t(LangId.InspectorParamMandatoryInputIn)}</span>

          ) : (

            <ul className={styles.slotTagRow} aria-label={t(LangId.InspectorParamSlotsAria, undefined, { name: ritualName })}>

              {slotTags.map((tag) => {

                const key = slotTagKey(tag)

                const label = tag.direction === 'input' ? 'IN' : 'OUT'

                return (

                  <li key={key}>

                    <button

                      type="button"

                      className={styles.slotTag}

                      data-direction={tag.direction}

                      data-active={tag.active ? '1' : '0'}

                      aria-pressed={tag.active}

                      title={`${label}:${tag.type}`}

                      onClick={() => updateSlotTags(toggleSlotTagActive(slotTags, key))}

                    >

                      <span className={styles.slotTagDir}>{label}</span>

                      <span className={styles.slotTagType}>{tag.type}</span>

                    </button>

                  </li>

                )

              })}

            </ul>

          )}

        </div>

      </div>



      {isPointerEntry && slotTags.length > 0 ? (

        <ul className={styles.tagList} aria-label={t(LangId.InspectorParamPointerSlotsAria, undefined, { name: ritualName })}>

          {slotTags.map((tag) => (

            <li key={slotTagKey(tag)}>

              <span className={styles.tag} data-active="1" data-locked="1">

                in:{tag.type}

              </span>

            </li>

          ))}

        </ul>

      ) : null}



      <p className={styles.ritualHint}>{isPointerEntry ? `pointer · ${entry.ritualName}` : entry.ritualName}</p>

    </article>

  )

}


