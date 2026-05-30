import { useMemo, useRef, useState } from 'react'

import { filterCharacterNames } from '@/core/characterList'
import { LangId } from '@/core/language/languageIds'
import { isChampionInConvertedSet, getGltfUrl } from '@/core/vfx/characterGltfCatalog'
import { championToGltfBaseName } from '@/core/vfx/characterGltfNaming'
import {
  resolveCharacterEngineRotationXDeg,
  resolveCharacterEngineScale,
} from '@/core/vfx/characterEngineVfx'
import { defaultChampionSknRelativePath } from '@/core/vfx/vfxCharacterAssets'
import { useLanguage } from '@/language/LanguageProvider'

import type { useVfxCharacterScene } from '@/hooks/useVfxCharacterScene'

import { VfxCharacterGltfPreviewSlot } from './VfxCharacterGltfPreviewSlot'
import inspectorStyles from './VfxDockInspector.module.css'
import styles from './VfxCharacterPanel.module.css'

type CharacterScene = ReturnType<typeof useVfxCharacterScene>

type VfxCharacterPanelProps = {
  embedded?: boolean
  scene: CharacterScene
  assetLoading: boolean
  assetIndexSize?: number
  vfxScale?: number
}

type SectionId = 'info' | 'champions' | 'instantiate' | 'log' | 'render' | 'pose' | 'animations'

const PLAY_RATE_OPTIONS = [0.25, 0.5, 1, 1.5, 2]

function Section({
  id,
  title,
  meta,
  openSections,
  onToggle,
  children,
}: {
  id: SectionId
  title: string
  meta?: string
  openSections: Set<SectionId>
  onToggle: (id: SectionId) => void
  children: React.ReactNode
}) {
  const open = openSections.has(id)
  return (
    <section className={inspectorStyles.section}>
      <button
        aria-expanded={open}
        className={inspectorStyles.sectionHead}
        onClick={() => onToggle(id)}
        type="button"
      >
        <span className={inspectorStyles.sectionChevron} data-open={open ? '1' : '0'} />
        <span className={inspectorStyles.sectionTitle}>{title}</span>
        {meta ? <span className={styles.sectionMeta}>{meta}</span> : null}
      </button>
      {open ? <div className={inspectorStyles.sectionBody}>{children}</div> : null}
    </section>
  )
}

export function VfxCharacterPanel({
  embedded = false,
  scene,
  assetLoading,
  vfxScale = 0.01,
}: VfxCharacterPanelProps) {
  const { t } = useLanguage()
  const [openSections, setOpenSections] = useState<Set<SectionId>>(
    () => new Set(['info', 'champions', 'log', 'render', 'pose', 'animations']),
  )
  const [query, setQuery] = useState('')
  const [championSearchFocused, setChampionSearchFocused] = useState(false)
  const championSearchRef = useRef<HTMLInputElement>(null)
  const filtered = useMemo(
    () => filterCharacterNames(query, scene.characterNames),
    [query, scene.characterNames],
  )

  const toggleSection = (id: SectionId) => {
    setOpenSections((previous) => {
      const next = new Set(previous)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const championMeta =
    filtered.length !== scene.characterNames.length
      ? `${filtered.length}/${scene.characterNames.length}`
      : String(scene.characterNames.length)

  const animTimeDisplay = scene.animSyncVfx ? null : scene.animTime
  const animDuration = scene.animDurationSeconds

  const showIndexHint =
    !scene.instantiated && !scene.instantiateError && !scene.pendingInstantiate && !scene.conversionPending
  const logMessages = [
    ...(scene.conversionStatus
      ? [t(scene.conversionStatus.langId, undefined, scene.conversionStatus.vars)]
      : []),
    ...(scene.instantiateError
      ? [t(scene.instantiateError.langId, undefined, scene.instantiateError.vars)]
      : []),
    ...(showIndexHint
      ? [t(LangId.VfxCharacterLogIndexHint, undefined, {
          champion: scene.selectedChampion,
          path: defaultChampionSknRelativePath(scene.selectedChampion),
        })]
      : []),
  ]
  const logMeta = logMessages.length > 0 ? String(logMessages.length) : undefined

  const selectChampion = (name: string) => {
    scene.setSelectedChampion(name)
    setQuery('')
    setChampionSearchFocused(false)
    championSearchRef.current?.blur()
  }

  const renderInstantiateControls = () => (
    <div className={styles.instantiateInChampions}>
      <div className={inspectorStyles.assetsBtnRow}>
        {!scene.instantiated ? (
          scene.isSelectedConverted ? (
            <>
              <button
                className={inspectorStyles.assetsBtn}
                disabled={assetLoading || scene.pendingInstantiate || scene.conversionPending}
                onClick={scene.instantiateExistingGltf}
                type="button"
              >
                {t(LangId.VfxCharacterInstantiateExistingGltf)}
              </button>
              <button
                className={inspectorStyles.assetsBtnSecondary}
                disabled={assetLoading || scene.pendingInstantiate || scene.conversionPending}
                onClick={() => void scene.reconvertAndInstantiateGltf()}
                type="button"
              >
                {t(LangId.VfxCharacterReconvertGltf)}
              </button>
              <p className={inspectorStyles.hint}>{t(LangId.VfxCharacterGltfExistsHint)}</p>
            </>
          ) : (
            <button
              className={inspectorStyles.assetsBtn}
              disabled={assetLoading || scene.pendingInstantiate || scene.conversionPending}
              onClick={() => void scene.instantiateInScene()}
              type="button"
            >
              {t(LangId.VfxCharacterInstantiateBtn)}
            </button>
          )
        ) : (
          <>
            <button className={inspectorStyles.assetsBtnSecondary} onClick={scene.removeFromScene} type="button">
              {t(LangId.VfxCharacterRemoveBtn)}
            </button>
            <button
              className={inspectorStyles.assetsBtnSecondary}
              disabled={!scene.gltfModel}
              onClick={scene.requestCameraFit}
              title={t(LangId.VfxCharacterFrameTitle)}
              type="button"
            >
              {t(LangId.VfxCharacterFrameBtn)}
            </button>
          </>
        )}
      </div>
    </div>
  )

  const renderAnimationsSection = () => (
    <Section
      id="animations"
      meta={String(scene.animationNames.length)}
      onToggle={toggleSection}
      openSections={openSections}
      title={t(LangId.VfxCharacterSectionAnimation)}
    >
      <label className={inspectorStyles.checkRow}>
        <input
          checked={scene.animSyncVfx}
          onChange={(event) => scene.setAnimSyncVfx(event.target.checked)}
          type="checkbox"
        />
        {t(LangId.VfxCharacterSyncTimeline)}
      </label>

      <label className={styles.fieldBlock}>
        <span className={inspectorStyles.fieldLabel}>{t(LangId.VfxCharacterClip)}</span>
        <select
          className={inspectorStyles.gameRootInput}
          onChange={(event) => scene.setAnimationName(event.target.value || null)}
          value={scene.animationName ?? ''}
        >
          {scene.animationNames.length === 0 ? (
            <option value="">{t(LangId.VfxCharacterNoAnmIndexed)}</option>
          ) : (
            scene.animationNames.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))
          )}
        </select>
      </label>

      {!scene.animationName ? (
        <p className={inspectorStyles.hint}>{t(LangId.VfxCharacterNoAnimSelected)}</p>
      ) : scene.animSyncVfx ? (
        <p className={inspectorStyles.hint}>
          {t(LangId.VfxCharacterAnimSyncGltfHint, undefined, {
            duration: animDuration.toFixed(2),
          })}
        </p>
      ) : (
        <>
          <div className={inspectorStyles.assetsBtnRow}>
            <button
              className={inspectorStyles.assetsBtnSecondary}
              onClick={() => scene.setAnimPlaying((playing) => !playing)}
              type="button"
            >
              {scene.animPlaying ? t(LangId.VfxCharacterPause) : t(LangId.VfxCharacterPlay)}
            </button>
            <button className={inspectorStyles.assetsBtnSecondary} onClick={scene.resetAnimation} type="button">
              {t(LangId.VfxCharacterReset)}
            </button>
          </div>

          <label className={styles.fieldBlock}>
            <span className={inspectorStyles.fieldLabel}>{t(LangId.VfxCharacterSpeed)}</span>
            <select
              className={inspectorStyles.gameRootInput}
              onChange={(event) => scene.setAnimPlayRate(Number(event.target.value))}
              value={String(scene.animPlayRate)}
            >
              {PLAY_RATE_OPTIONS.map((rate) => (
                <option key={rate} value={rate}>
                  {rate}x
                </option>
              ))}
            </select>
          </label>

          {animDuration > 0 ? (
            <>
              <input
                className={styles.scrub}
                max={animDuration}
                min={0}
                onChange={(event) => {
                  scene.setAnimPlaying(false)
                  scene.setAnimTime(Number(event.target.value))
                }}
                step={0.016}
                type="range"
                value={Math.min(animTimeDisplay ?? 0, animDuration)}
              />
              <p className={styles.animReadout}>
                {t(LangId.VfxCharacterAnimReadoutGltf, undefined, {
                  current: (animTimeDisplay ?? 0).toFixed(2),
                  total: animDuration.toFixed(2),
                  frame: scene.resolveAnimFrameIndex(animTimeDisplay ?? 0),
                })}
              </p>
            </>
          ) : null}
        </>
      )}
    </Section>
  )

  const panelBody = (
    <div className={inspectorStyles.inspectorScrollEmbedded}>
      <Section
        id="info"
        onToggle={toggleSection}
        openSections={openSections}
        title={t(LangId.VfxCharacterSectionInfo)}
      >
        <p className={styles.infoSubheading}>{t(LangId.VfxInspectorSectionGeometry)}</p>
        <div className={inspectorStyles.fieldRow}>
          <span className={inspectorStyles.fieldLabel}>{t(LangId.VfxCharacterChampion)}</span>
          <span className={inspectorStyles.fieldValue}>{scene.selectedChampion}</span>
        </div>
        {scene.isSelectedConverted ? (
          <>
            <VfxCharacterGltfPreviewSlot
              animationName={scene.animationName}
              baseName={championToGltfBaseName(scene.selectedChampion)}
              engineScale={resolveCharacterEngineScale(
                scene.characterEngineResizeEnabled,
                vfxScale,
              )}
              rotationXLolDeg={resolveCharacterEngineRotationXDeg(
                scene.characterEngineRotationEnabled,
              )}
              url={getGltfUrl(scene.selectedChampion)}
            />
            {scene.animationNames.length > 0 ? (
              <div className={inspectorStyles.fieldRow}>
                <span className={inspectorStyles.fieldLabel}>{t(LangId.VfxCharacterStatAnms)}</span>
                <span className={inspectorStyles.fieldValue}>{scene.animationNames.length}</span>
              </div>
            ) : null}
            <p className={inspectorStyles.hint}>{t(LangId.VfxCharacterGltfEmbeddedTextureHint)}</p>
          </>
        ) : (
          <p className={inspectorStyles.hint}>{t(LangId.VfxCharacterInfoHint)}</p>
        )}
      </Section>

      <Section
        id="champions"
        meta={championMeta}
        onToggle={toggleSection}
        openSections={openSections}
        title={t(LangId.VfxCharacterSectionChampions)}
      >
        {scene.isSelectedConverted ? renderInstantiateControls() : null}
        <input
          ref={championSearchRef}
          aria-label={t(LangId.VfxCharacterFilterAria)}
          className={inspectorStyles.gameRootInput}
          onBlur={() => setChampionSearchFocused(false)}
          onChange={(event) => setQuery(event.target.value)}
          onFocus={() => setChampionSearchFocused(true)}
          placeholder={t(LangId.VfxCharacterFilterPlaceholder)}
          type="search"
          value={query}
        />
        <div
          aria-label={t(LangId.VfxCharacterListAria)}
          className={[
            styles.championList,
            championSearchFocused ? styles.championListExpanded : '',
          ]
            .filter(Boolean)
            .join(' ')}
          role="listbox"
        >
          {filtered.length === 0 ? (
            <span className={inspectorStyles.hint}>{t(LangId.VfxCharacterNoMatch)}</span>
          ) : (
            filtered.map((name) => {
              const active = name === scene.selectedChampion
              const converted = isChampionInConvertedSet(name, scene.convertedModels)
              return (
                <button
                  aria-selected={active}
                  className={[
                    styles.championBtn,
                    active ? styles.championBtnActive : '',
                    converted ? styles.championBtnConverted : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  key={name}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => selectChampion(name)}
                  role="option"
                  type="button"
                >
                  {converted ? '● ' : ''}
                  {name}
                </button>
              )
            })
          )}
        </div>
      </Section>

      {scene.animationNames.length > 0 || scene.gltfModel ? renderAnimationsSection() : null}

      {!scene.isSelectedConverted ? (
        <Section
          id="instantiate"
          onToggle={toggleSection}
          openSections={openSections}
          title={t(LangId.VfxCharacterSectionInstantiate)}
        >
          {renderInstantiateControls()}
        </Section>
      ) : null}

      <Section
        id="log"
        meta={logMeta}
        onToggle={toggleSection}
        openSections={openSections}
        title={t(LangId.VfxCharacterSectionLog)}
      >
        {logMessages.length > 0 ? (
          <ul className={inspectorStyles.warningList}>
            {logMessages.map((message) => (
              <li className={inspectorStyles.warningItem} key={message}>
                {message}
              </li>
            ))}
          </ul>
        ) : (
          <p className={inspectorStyles.hint}>{t(LangId.VfxCharacterLogEmpty)}</p>
        )}
      </Section>

      {scene.gltfModel && scene.modelStats ? (
        <>
          <Section
            id="render"
            onToggle={toggleSection}
            openSections={openSections}
            title={t(LangId.VfxCharacterSectionRender)}
          >
            <label className={inspectorStyles.checkRow}>
              <input
                checked={scene.flatLighting}
                onChange={(event) => scene.setFlatLighting(event.target.checked)}
                type="checkbox"
              />
              {t(LangId.VfxCharacterFlatLighting)}
            </label>
            <label className={inspectorStyles.checkRow}>
              <input
                checked={scene.showWireframe}
                onChange={(event) => scene.setShowWireframe(event.target.checked)}
                type="checkbox"
              />
              {t(LangId.VfxCharacterWireframe)}
            </label>
            <label className={inspectorStyles.checkRow}>
              <input
                checked={scene.showSkeleton}
                onChange={(event) => scene.setShowSkeleton(event.target.checked)}
                type="checkbox"
              />
              {t(LangId.VfxCharacterShowSkeleton)}
            </label>

            <label className={styles.fieldBlock}>
              <span className={inspectorStyles.fieldLabel}>{t(LangId.VfxCharacterReferenceBone)}</span>
              <select
                className={inspectorStyles.gameRootInput}
                onChange={(event) => scene.setReferenceBoneName(event.target.value || null)}
                value={scene.referenceBoneName ?? ''}
              >
                {scene.boneNames.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </label>
            <p className={inspectorStyles.hint}>{t(LangId.VfxCharacterBindWeightHint)}</p>

            <p className={styles.infoSubheading}>{t(LangId.VfxCharacterEngineVfxSection)}</p>
            <label className={inspectorStyles.checkRow}>
              <input
                checked={scene.characterEngineResizeEnabled}
                onChange={(event) => scene.setCharacterEngineResizeEnabled(event.target.checked)}
                type="checkbox"
              />
              {t(LangId.VfxCharacterEngineResize)}
            </label>
            <p className={inspectorStyles.hint}>{t(LangId.VfxCharacterEngineResizeHint)}</p>

            <label className={inspectorStyles.checkRow}>
              <input
                checked={scene.characterEngineRotationEnabled}
                onChange={(event) => scene.setCharacterEngineRotationEnabled(event.target.checked)}
                type="checkbox"
              />
              {t(LangId.VfxCharacterEngineRotationX)}
            </label>
            <p className={inspectorStyles.hint}>{t(LangId.VfxCharacterEngineRotationXHint)}</p>
          </Section>

          <Section
            id="pose"
            onToggle={toggleSection}
            openSections={openSections}
            title={t(LangId.VfxCharacterSectionPose)}
          >
            <div className={styles.poseToggle} role="group" aria-label={t(LangId.VfxCharacterSectionPose)}>
              <button
                className={[
                  styles.poseToggleBtn,
                  scene.meshPoseMode === 'pose' ? styles.poseToggleBtnActive : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                onClick={() => scene.setMeshPoseMode('pose')}
                type="button"
              >
                {t(LangId.VfxCharacterPosePosition)}
              </button>
              <button
                className={[
                  styles.poseToggleBtn,
                  scene.meshPoseMode === 'rest' ? styles.poseToggleBtnActive : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                onClick={() => scene.setMeshPoseMode('rest')}
                type="button"
              >
                {t(LangId.VfxCharacterRestPosition)}
              </button>
            </div>
            <p className={inspectorStyles.hint}>{t(LangId.VfxCharacterPoseRestHint)}</p>
          </Section>
        </>
      ) : null}
    </div>
  )

  if (embedded) {
    return panelBody
  }

  return (
    <aside aria-label={t(LangId.VfxToolsCharacter)} className={styles.panelStandalone}>
      <div className={inspectorStyles.inspectorHead}>
        <span className={inspectorStyles.inspectorTitle}>{t(LangId.VfxToolsCharacter)}</span>
        {scene.instantiated ? (
          <span className={inspectorStyles.inspectorSubtitle}>
            {scene.selectedChampion} · {t(LangId.VfxCharacterInScene)}
          </span>
        ) : (
          <span className={inspectorStyles.inspectorSubtitleMuted}>{scene.selectedChampion || '—'}</span>
        )}
      </div>
      {panelBody}
    </aside>
  )
}
