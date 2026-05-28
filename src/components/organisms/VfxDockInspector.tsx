import { useMemo, useState } from 'react'

import type { VfxTextureLookupHit } from '@/core/vfx/vfxAssetLookup'
import { countPreviewParticlesForEmitter } from '@/core/vfx/vfxParticleInstances'
import { computeEmitterActiveWindow } from '@/core/vfx/vfxEmitterTimeline'
import { normalizeVec4Tuple } from '@/core/vfx/vfxColor'
import { sampleDynamicsVec4 } from '@/core/vfx/vfxEmbedSample'
import { miscRenderFlagsInvertFaces } from '@/core/vfx/vfxRenderFlags'
import type { VfxTransformDebugRow } from '@/core/vfx/vfxTransformDebugList'
import type { VfxWebEmitterBuilt } from '@/core/vfx/vfxWebBuilder'
import { LangId } from '@/core/language/languageIds'
import { useLanguage } from '@/language/LanguageProvider'

import type { BufferGeometry } from 'three'

import { VfxColorSwatchRow } from '@/components/molecules/VfxColorSwatchRow'
import { VfxMeshPreviewSlot } from './VfxMeshPreviewSlot'
import { VfxTexturePreviewSlot } from './VfxTexturePreviewSlot'
import styles from './VfxDockInspector.module.css'

const BLEND_LABELS: Record<number, string> = {
  0: 'opaque',
  1: 'alpha',
  4: 'additive',
  7: 'additive (alt)',
}

type SectionId = 'material' | 'color' | 'geometry' | 'textures' | 'transform' | 'status'

type VfxDockInspectorProps = {
  defaultCollapsed?: boolean
  emitter: VfxWebEmitterBuilt | null
  particleNormalized?: number
  textureResolved: boolean
  textureHit: { path: string; hit: VfxTextureLookupHit } | null
  meshResolved: boolean
  meshGeometry: BufferGeometry | null
  meshCacheSize: number
  assetIndexSize: number
  warnings: string[]
  onPickAssets: () => void
  onOpenTexFile: () => void
  assetLoading: boolean
  gameRoot: string
  onGameRootChange: (value: string) => void
  /** Linhas de debug transform (activo com «Debug transform» na cena 3D). */
  showTransformDebug?: boolean
  transformDebugRows?: VfxTransformDebugRow[] | null
}

function Section({
  id,
  title,
  openSections,
  onToggle,
  children,
}: {
  id: SectionId
  title: string
  openSections: Set<SectionId>
  onToggle: (id: SectionId) => void
  children: React.ReactNode
}) {
  const open = openSections.has(id)
  return (
    <section className={styles.section}>
      <button
        className={styles.sectionHead}
        onClick={() => onToggle(id)}
        type="button"
        aria-expanded={open}
      >
        <span className={styles.sectionChevron} data-open={open ? '1' : '0'} />
        <span className={styles.sectionTitle}>{title}</span>
      </button>
      {open ? <div className={styles.sectionBody}>{children}</div> : null}
    </section>
  )
}

export function VfxDockInspector({
  defaultCollapsed = false,
  emitter,
  particleNormalized = 0,
  textureResolved,
  textureHit,
  meshResolved,
  meshGeometry,
  meshCacheSize,
  assetIndexSize,
  warnings,
  onPickAssets,
  onOpenTexFile,
  assetLoading,
  gameRoot,
  onGameRootChange,
  showTransformDebug = false,
  transformDebugRows = null,
}: VfxDockInspectorProps) {
  const { t } = useLanguage()
  const [collapsed, setCollapsed] = useState(defaultCollapsed)
  const [openSections, setOpenSections] = useState<Set<SectionId>>(
    () => new Set(['material', 'color', 'geometry', 'textures', 'transform', 'status']),
  )

  const toggleSection = (id: SectionId) => {
    setOpenSections((previous) => {
      const next = new Set(previous)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const parsed = emitter?.parsed

  const colorRgba = useMemo(() => {
    if (!parsed?.color) return null
    return normalizeVec4Tuple(sampleDynamicsVec4(parsed.color, particleNormalized))
  }, [parsed?.color, particleNormalized])

  if (collapsed) {
    return (
      <aside
        aria-label={t(LangId.VfxInspectorTitle)}
        className={[styles.inspector, styles.inspectorCollapsed].join(' ')}
      >
        <button
          aria-label={t(LangId.VfxInspectorTitle)}
          className={styles.vertTab}
          onClick={() => setCollapsed(false)}
          title={t(LangId.VfxInspectorTitle)}
          type="button"
        >
          <span className={styles.vertTabLabel}>{t(LangId.VfxInspectorTab)}</span>
        </button>
      </aside>
    )
  }

  return (
    <aside aria-label={t(LangId.VfxInspectorTitle)} className={styles.inspector}>
      <button
        aria-label={t(LangId.VfxInspectorCollapse)}
        className={styles.collapseBtn}
        onClick={() => setCollapsed(true)}
        title={t(LangId.VfxInspectorCollapse)}
        type="button"
      >
        ‹
      </button>
      <div className={styles.inspectorHead}>
        <span className={styles.inspectorTitle}>{t(LangId.VfxInspectorTitle)}</span>
        {emitter ? (
          <span className={styles.inspectorSubtitle} title={emitter.name}>
            {emitter.name}
          </span>
        ) : (
          <span className={styles.inspectorSubtitleMuted}>{t(LangId.VfxInspectorNoEmitter)}</span>
        )}
      </div>

      <div className={styles.inspectorScroll}>
        <Section
          id="material"
          onToggle={toggleSection}
          openSections={openSections}
          title={t(LangId.VfxInspectorSectionMaterial)}
        >
          {emitter ? (
            <>
              <div className={styles.fieldRow}>
                <span className={styles.fieldLabel}>Pass</span>
                <span className={styles.fieldValue}>{emitter.parsed.pass}</span>
              </div>
              {emitter.parsed.importance > 0 ? (
                <div className={styles.fieldRow}>
                  <span className={styles.fieldLabel}>Importance</span>
                  <span className={styles.fieldValue}>{emitter.parsed.importance}</span>
                </div>
              ) : null}
              {emitter.parsed.alphaRef > 0 ? (
                <div className={styles.fieldRow}>
                  <span className={styles.fieldLabel}>Alpha ref</span>
                  <span className={styles.fieldValue}>{emitter.parsed.alphaRef}</span>
                </div>
              ) : null}
              <div className={styles.fieldRow}>
                <span className={styles.fieldLabel}>Blend</span>
                <span className={styles.fieldValue}>
                  {BLEND_LABELS[emitter.parsed.blendMode] ?? `mode ${emitter.parsed.blendMode}`}
                </span>
              </div>
              <div className={styles.fieldRow}>
                <span className={styles.fieldLabel}>Sprite</span>
                <span className={styles.fieldValue}>
                  {Math.max(1, Math.round(emitter.parsed.texDiv?.[0] ?? 1))}×
                  {Math.max(1, Math.round(emitter.parsed.texDiv?.[1] ?? 1))}
                </span>
              </div>
              {emitter.parsed.uvRotation !== 0 ? (
                <div className={styles.fieldRow}>
                  <span className={styles.fieldLabel}>UV rot.</span>
                  <span className={styles.fieldValue}>{emitter.parsed.uvRotation}°</span>
                </div>
              ) : null}
              {emitter.parsed.birthDrag?.constant &&
              Array.isArray(emitter.parsed.birthDrag.constant) &&
              (emitter.parsed.birthDrag.constant as number[]).some((v) => Math.abs(Number(v)) > 1e-6) ? (
                <div className={styles.fieldRow}>
                  <span className={styles.fieldLabel}>Drag</span>
                  <span className={styles.fieldValue}>
                    {(emitter.parsed.birthDrag.constant as number[]).map((v) => Number(v).toFixed(1)).join(', ')}
                  </span>
                </div>
              ) : null}
              {emitter.parsed.paletteDefinition?.paletteTexture ? (
                <div className={styles.fieldRow}>
                  <span className={styles.fieldLabel}>Palette</span>
                  <span className={styles.fieldValue}>
                    #{emitter.parsed.paletteDefinition.paletteSelector?.constant &&
                    Array.isArray(emitter.parsed.paletteDefinition.paletteSelector.constant)
                      ? Number(
                          (emitter.parsed.paletteDefinition.paletteSelector.constant as number[])[0],
                        ).toFixed(0)
                      : '0'}
                    /{emitter.parsed.paletteDefinition.paletteCount}
                  </span>
                </div>
              ) : null}
              {miscRenderFlagsInvertFaces(emitter.parsed.miscRenderFlags) ? (
                <div className={styles.fieldRow}>
                  <span className={styles.fieldLabel}>Faces</span>
                  <span className={styles.fieldValue}>invertidas (misc=1)</span>
                </div>
              ) : null}
              <div className={styles.fieldRow}>
                <span className={styles.fieldLabel}>Partículas</span>
                <span className={styles.fieldValue}>
                  {emitter.parsed.isSingleParticle
                    ? '1 (single)'
                    : `~${countPreviewParticlesForEmitter(emitter.parsed)} (rate ${emitter.parsed.rate})`}
                </span>
              </div>
              <div className={styles.fieldRow}>
                <span className={styles.fieldLabel}>Textura</span>
                <span
                  className={[
                    styles.badge,
                    textureResolved ? styles.badgeOk : styles.badgeWarn,
                  ].join(' ')}
                >
                  {textureResolved ? 'resolvida' : emitter.texturePath ? 'em falta' : '—'}
                </span>
              </div>
              {emitter.texturePath ? (
                <div className={styles.pathBlock} title={emitter.texturePath}>
                  Ritual: {emitter.texturePath.replace(/^ASSETS\//i, '')}
                </div>
              ) : null}
              {textureHit ? (
                <div className={styles.pathBlock} title={textureHit.hit.matchedKey}>
                  Ficheiro: {textureHit.hit.matchedKey.replace(/^assets\//i, '')} ({textureHit.hit.matchKind}
                  {textureHit.hit.isDds ? ', dds' : ''})
                </div>
              ) : assetIndexSize > 0 && emitter.texturePath ? (
                <p className={styles.hint}>
                  Não encontrada no índice — confira se o .tex/.dds está na pasta e se seleccionou a raiz do
                  .wad.client.
                </p>
              ) : assetIndexSize === 0 ? (
                <p className={styles.hint}>Clique em «Pasta assets…» para indexar ASSETS/.</p>
              ) : null}
            </>
          ) : (
            <p className={styles.hint}>{t(LangId.VfxInspectorSelectEmitterHint)}</p>
          )}
        </Section>

        <Section
          id="color"
          onToggle={toggleSection}
          openSections={openSections}
          title={t(LangId.VfxInspectorSectionColor)}
        >
          {parsed && colorRgba ? (
            <VfxColorSwatchRow
              label={t(LangId.VfxInspectorColorTint)}
              rgba={colorRgba}
              subtitle={
                parsed.color?.dynamics?.times?.length
                  ? `${t(LangId.VfxInspectorColorAnimated)} · t = ${particleNormalized.toFixed(2)}`
                  : undefined
              }
            />
          ) : parsed ? (
            <p className={styles.hint}>—</p>
          ) : (
            <p className={styles.hint}>{t(LangId.VfxInspectorSelectEmitterHint)}</p>
          )}
        </Section>

        <Section
          id="geometry"
          onToggle={toggleSection}
          openSections={openSections}
          title={t(LangId.VfxInspectorSectionGeometry)}
        >
          {parsed ? (
            <>
              <div className={styles.fieldRow}>
                <span className={styles.fieldLabel}>Primitivo</span>
                <span className={styles.fieldValue}>{parsed.primitiveKind || '—'}</span>
              </div>
              {parsed.attachBoneName ? (
                <div className={styles.fieldRow}>
                  <span className={styles.fieldLabel}>Osso (ritual)</span>
                  <span className={styles.fieldValue}>{parsed.attachBoneName}</span>
                </div>
              ) : null}
              {parsed.bindWeight?.constant != null ? (
                <div className={styles.fieldRow}>
                  <span className={styles.fieldLabel}>bindWeight</span>
                  <span className={styles.fieldValue}>{String(parsed.bindWeight.constant)}</span>
                </div>
              ) : null}
              <div className={styles.fieldRow}>
                <span className={styles.fieldLabel}>Preview</span>
                <span className={styles.fieldValue}>{emitter.geometry}</span>
              </div>
              <div className={styles.fieldRow}>
                <span className={styles.fieldLabel}>Mesh</span>
                <span
                  className={[
                    styles.badge,
                    meshResolved ? styles.badgeOk : parsed.meshPath ? styles.badgeWarn : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                >
                  {meshResolved ? 'carregada' : parsed.meshPath ? 'em falta' : '—'}
                </span>
              </div>
              <div className={styles.fieldRow}>
                <span className={styles.fieldLabel}>Duração</span>
                <span className={styles.fieldValue}>{emitter.duration.toFixed(2)}s</span>
              </div>
              {(() => {
                const window = computeEmitterActiveWindow(parsed)
                return (
                  <div className={styles.fieldRow}>
                    <span className={styles.fieldLabel}>Activo</span>
                    <span className={styles.fieldValue}>
                      {window.start.toFixed(2)}s – {window.end.toFixed(2)}s
                    </span>
                  </div>
                )
              })()}
              {parsed.skeletonPath ? (
                <div className={styles.pathBlock} title={parsed.skeletonPath}>
                  SKL: {parsed.skeletonPath.replace(/^ASSETS\//i, '')}
                </div>
              ) : null}
              {parsed.animationPath ? (
                <div className={styles.pathBlock} title={parsed.animationPath}>
                  ANM: {parsed.animationPath.replace(/^ASSETS\//i, '')}
                </div>
              ) : null}
              <VfxMeshPreviewSlot
                geometry={meshGeometry}
                meshCacheSize={meshCacheSize}
                ritualPath={parsed.meshPath ?? ''}
              />
              {!meshResolved && parsed.meshPath && meshCacheSize > 0 ? (
                <p className={styles.hint}>
                  .scb/.sco não encontrado no índice — confira o path no ritual e a pasta de assets.
                </p>
              ) : !parsed.meshPath ? (
                <p className={styles.hint}>Emitter sem mSimpleMeshName — usa primitivo no viewport.</p>
              ) : meshCacheSize === 0 ? (
                <p className={styles.hint}>Clique em «Pasta assets…» para indexar meshes.</p>
              ) : null}
            </>
          ) : (
            <p className={styles.hint}>—</p>
          )}
        </Section>

        <Section
          id="textures"
          onToggle={toggleSection}
          openSections={openSections}
          title={t(LangId.VfxInspectorSectionAssets)}
        >
          <div className={styles.assetsBlock}>
            <input
              className={styles.gameRootInput}
              onChange={(event) => onGameRootChange(event.target.value)}
              placeholder="Rótulo da pasta"
              value={gameRoot}
            />
            <div className={styles.assetsBtnRow}>
              <button
                className={styles.assetsBtn}
                disabled={assetLoading}
                onClick={onPickAssets}
                type="button"
              >
                {assetLoading ? t(LangId.VfxInspectorIndexing) : t(LangId.VfxInspectorPickAssetsFolder)}
              </button>
              <button
                className={styles.assetsBtnSecondary}
                disabled={assetLoading}
                onClick={onOpenTexFile}
                title="Abrir o .tex/.dds/.png exacto do disco"
                type="button"
              >
                Abrir .tex…
              </button>
            </div>
            <span className={styles.assetMeta}>
              {assetIndexSize > 0
                ? `${assetIndexSize} textura(s) — actualização automática`
                : 'A carregar pasta de assets… (só define uma vez)'}
            </span>

            <VfxTexturePreviewSlot
              assetIndexSize={assetIndexSize}
              isDds={textureHit?.hit.isDds}
              previewUrl={textureHit?.hit.url ?? null}
              ritualPath={
                textureHit?.path ??
                emitter?.texturePath ??
                emitter?.colorTexturePath ??
                emitter?.textureMultPath ??
                ''
              }
            />
          </div>
        </Section>

        {showTransformDebug ? (
          <Section
            id="transform"
            onToggle={toggleSection}
            openSections={openSections}
            title="Debug transform"
          >
            {transformDebugRows && transformDebugRows.length > 0 ? (
              <ul className={styles.debugList}>
                {transformDebugRows.map((row) => (
                  <li className={styles.debugListItem} key={row.label}>
                    <span className={styles.debugListLabel}>{row.label}</span>
                    <span
                      className={styles.debugListValue}
                      style={row.accent ? { color: row.accent } : undefined}
                      title={row.value}
                    >
                      {row.value}
                    </span>
                  </li>
                ))}
              </ul>
            ) : emitter ? (
              <p className={styles.hint}>
                Sem dados no tempo actual (emitter invisível ou fora da janela activa).
              </p>
            ) : (
              <p className={styles.hint}>{t(LangId.VfxInspectorSelectEmitterHint)}</p>
            )}
          </Section>
        ) : null}

        {warnings.length ? (
          <Section
            id="status"
            onToggle={toggleSection}
            openSections={openSections}
            title={t(LangId.VfxInspectorSectionStatus)}
          >
            <ul className={styles.warningList}>
              {warnings.map((warning) => (
                <li className={styles.warningItem} key={warning}>
                  {warning}
                </li>
              ))}
            </ul>
          </Section>
        ) : null}
      </div>
    </aside>
  )
}

export function emitterAccentColor(name: string): string {
  const lower = name.toLowerCase()
  if (lower.includes('ring')) return '#3dd6c8'
  if (lower.includes('splat')) return '#f0c14a'
  if (lower.includes('juice')) return '#6eb5ff'
  if (lower.includes('glow') || lower.includes('core')) return '#7ef0ff'
  return '#8aa4c8'
}
