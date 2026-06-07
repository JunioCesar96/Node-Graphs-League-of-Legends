import { useCallback, useState, type MutableRefObject } from 'react'

import type { VfxAxisWorldColors, VfxViewportSettings } from '@/core/vfx/vfxViewportPreferences'
import { LangId } from '@/core/language/languageIds'
import { useLanguage } from '@/language/LanguageProvider'

import { SceneIcon, VfxLolIcon } from '@/components/atoms/VfxToolsIcons'
import { VfxContextToolRow } from '@/components/molecules/VfxContextToolRow'
import {
  VfxAxisWorldSettingsFields,
  VfxGlobalRotationSettingsFields,
  VfxGroundSettingsFields,
  VfxPositionSettingsFields,
} from '@/components/molecules/VfxViewportContextFields'
import {
  VfxScene3dVerticalMenu,
  type VfxViewportToolId,
} from '@/components/molecules/VfxScene3dVerticalMenu'

import styles from './VfxScene3dDock.module.css'

type SceneSectionId = 'viewsTips'
type ContextToolId = 'axisWorld' | 'ground' | 'globalRotation' | 'position'

function PanelSection({
  id,
  title,
  openSections,
  onToggle,
  children,
}: {
  id: SceneSectionId
  title: string
  openSections: Set<SceneSectionId>
  onToggle: (id: SceneSectionId) => void
  children: React.ReactNode
}) {
  const open = openSections.has(id)
  return (
    <section className={styles.section}>
      <button
        aria-expanded={open}
        className={styles.sectionHead}
        onClick={() => onToggle(id)}
        type="button"
      >
        <span className={styles.sectionChevron} data-open={open ? '1' : '0'} />
        <span className={styles.sectionTitle}>{title}</span>
      </button>
      {open ? <div className={styles.sectionBody}>{children}</div> : null}
    </section>
  )
}

type VfxScene3dDockProps = {
  onAxisWorldColorsChange: (next: VfxAxisWorldColors) => void
  onAxisWorldScaleChange: (next: [number, number, number]) => void
  onGlobalRotationOffsetChange: (next: [number, number, number]) => void
  onGroundPositionChange: (next: [number, number, number]) => void
  onGroundScale2dChange: (next: [number, number]) => void
  onPositionOffsetChange: (next: [number, number, number]) => void
  onSettingsChange: (patch: Partial<VfxViewportSettings>) => void
  onToggleProjection: () => void
  onToggleSetting: (key: keyof VfxViewportSettings) => void
  settings: VfxViewportSettings
  toggleProjectionRef: MutableRefObject<(() => void) | null>
}

function ToolPanelIcon({ toolId }: { toolId: VfxViewportToolId }) {
  if (toolId === 'scene') {
    return <SceneIcon size={16} />
  }
  return <VfxLolIcon size={16} />
}

export function VfxScene3dDock({
  onAxisWorldColorsChange,
  onAxisWorldScaleChange,
  onGlobalRotationOffsetChange,
  onGroundPositionChange,
  onGroundScale2dChange,
  onPositionOffsetChange,
  onSettingsChange,
  onToggleProjection,
  onToggleSetting,
  settings,
  toggleProjectionRef,
}: VfxScene3dDockProps) {
  const { t } = useLanguage()
  const [menuExpanded, setMenuExpanded] = useState(false)
  const [activeTool, setActiveTool] = useState<VfxViewportToolId | null>('scene')
  const [openSceneSections, setOpenSceneSections] = useState<Set<SceneSectionId>>(() => new Set())
  const [openContextTools, setOpenContextTools] = useState<Set<ContextToolId>>(() => new Set())

  const toggleSceneSection = (id: SceneSectionId) => {
    setOpenSceneSections((previous) => {
      const next = new Set(previous)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleContextTool = useCallback((id: ContextToolId) => {
    setOpenContextTools((previous) => {
      const next = new Set(previous)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const handleSelectTool = useCallback(
    (toolId: VfxViewportToolId) => {
      if (activeTool === toolId && !menuExpanded) {
        setActiveTool(null)
        return
      }
      setActiveTool(toolId)
      setMenuExpanded(false)
    },
    [activeTool, menuExpanded],
  )

  const handleToggleMenu = useCallback(() => {
    setMenuExpanded((previous) => !previous)
  }, [])

  const toggle = (key: keyof VfxViewportSettings) => {
    onToggleSetting(key)
  }

  const toolTitle =
    activeTool === 'scene' ? t(LangId.VfxSceneMenuTitle) : t(LangId.VfxVfxLolMenuTitle)

  const scenePanel = (
    <>
      <label className={styles.overlayItem}>
        <input checked={settings.darkScene} onChange={() => toggle('darkScene')} type="checkbox" />
        <span className={styles.overlayLabel}>{t(LangId.VfxViewportDarkScene)}</span>
      </label>
      <label className={styles.overlayItem} title="Alternar com a tecla 5">
        <input
          checked={settings.orthographicProjection}
          onChange={() => toggleProjectionRef.current?.() ?? onToggleProjection()}
          type="checkbox"
        />
        <span className={styles.overlayLabel}>{t(LangId.VfxViewportOrthographic)}</span>
      </label>
      <label className={styles.overlayItem}>
        <input checked={settings.showGrid} onChange={() => toggle('showGrid')} type="checkbox" />
        <span className={styles.overlayLabel}>{t(LangId.VfxViewportGrid)}</span>
      </label>

      <VfxContextToolRow
        checked={settings.showAxisWorld}
        expanded={openContextTools.has('axisWorld')}
        onCheckedChange={(checked) => onSettingsChange({ showAxisWorld: checked })}
        onToggleExpand={() => toggleContextTool('axisWorld')}
        settingsEnabled={settings.showAxisWorld}
        title={t(LangId.VfxViewportAxisWorld)}
      >
        <VfxAxisWorldSettingsFields
          compact
          colors={settings.axisWorldColors}
          disabled={!settings.showAxisWorld}
          onColorsChange={onAxisWorldColorsChange}
          onScaleChange={onAxisWorldScaleChange}
          scale={settings.axisWorldScale}
        />
      </VfxContextToolRow>

      <label className={styles.overlayItem}>
        <input
          checked={settings.showEmitterShapes}
          onChange={() => toggle('showEmitterShapes')}
          type="checkbox"
        />
        <span className={styles.overlayLabel}>{t(LangId.VfxViewportWireframe)}</span>
      </label>
      <label className={styles.overlayItem} title={t(LangId.VfxViewportMeshOnlyTitle)}>
        <input
          checked={settings.meshOnlyEnabled}
          onChange={() => toggle('meshOnlyEnabled')}
          type="checkbox"
        />
        <span className={styles.overlayLabel}>{t(LangId.VfxViewportMeshOnly)}</span>
      </label>
      <label className={styles.overlayItem}>
        <input checked={settings.showGizmos} onChange={() => toggle('showGizmos')} type="checkbox" />
        <span className={styles.overlayLabel}>{t(LangId.VfxViewportOrbit)}</span>
      </label>
      <label className={styles.overlayItem} title={t(LangId.VfxViewportAutoRebuildTitle)}>
        <input
          checked={settings.vfxAutoRebuildEnabled}
          onChange={() => toggle('vfxAutoRebuildEnabled')}
          type="checkbox"
        />
        <span className={styles.overlayLabel}>{t(LangId.VfxViewportAutoRebuild)}</span>
      </label>

      <PanelSection
        id="viewsTips"
        onToggle={toggleSceneSection}
        openSections={openSceneSections}
        title={t(LangId.VfxViewportViewsTips)}
      >
        <div className={styles.viewHints} title={t(LangId.VfxViewportShortcutsTitle)}>
          <span>7 Top · 3 Right · 1 Front · 5 Persp/Ortho</span>
          <span>Ctrl+7 Bottom · Ctrl+3 Left · Ctrl+1 Back</span>
          <span>MMB órbita · botão direito pan · roda zoom</span>
        </div>
      </PanelSection>
    </>
  )

  const vfxLolPanel = (
    <>
      <VfxContextToolRow
        checked={settings.showGround}
        expanded={openContextTools.has('ground')}
        onCheckedChange={(checked) => onSettingsChange({ showGround: checked })}
        onToggleExpand={() => toggleContextTool('ground')}
        settingsEnabled={settings.showGround}
        title={t(LangId.VfxViewportGround)}
      >
        <VfxGroundSettingsFields
          compact
          disabled={!settings.showGround}
          groundPosition={settings.groundPosition}
          groundScale2d={settings.groundScale2d}
          onGroundPositionChange={onGroundPositionChange}
          onGroundScale2dChange={onGroundScale2dChange}
        />
      </VfxContextToolRow>

      <VfxContextToolRow
        checked={settings.vfxGlobalRotationEnabled}
        expanded={openContextTools.has('globalRotation')}
        onCheckedChange={(checked) => onSettingsChange({ vfxGlobalRotationEnabled: checked })}
        onToggleExpand={() => toggleContextTool('globalRotation')}
        settingsEnabled={settings.vfxGlobalRotationEnabled}
        title={t(LangId.VfxViewportGlobalRotation)}
      >
        <VfxGlobalRotationSettingsFields
          compact
          disabled={!settings.vfxGlobalRotationEnabled}
          offsetDegrees={settings.vfxGlobalRotationOffsetDegrees}
          onOffsetDegreesChange={onGlobalRotationOffsetChange}
        />
      </VfxContextToolRow>

      <label className={styles.overlayItem} title={t(LangId.VfxViewportBirthRotationLoLTitle)}>
        <input
          checked={settings.vfxBirthRotationLoLEnabled}
          onChange={() => toggle('vfxBirthRotationLoLEnabled')}
          type="checkbox"
        />
        <span className={styles.overlayLabel}>{t(LangId.VfxViewportBirthRotationLoL)}</span>
      </label>

      <VfxContextToolRow
        checked={settings.vfxPositionEnabled}
        expanded={openContextTools.has('position')}
        onCheckedChange={(checked) => onSettingsChange({ vfxPositionEnabled: checked })}
        onToggleExpand={() => toggleContextTool('position')}
        settingsEnabled={settings.vfxPositionEnabled}
        title={t(LangId.VfxViewportPosition)}
      >
        <VfxPositionSettingsFields
          compact
          disabled={!settings.vfxPositionEnabled}
          offset={settings.vfxPositionOffset}
          onOffsetChange={onPositionOffsetChange}
        />
      </VfxContextToolRow>

      <label className={styles.overlayItem} title={t(LangId.VfxViewportCamLockTitle)}>
        <input
          checked={settings.vfxCamLockEnabled}
          onChange={() => toggle('vfxCamLockEnabled')}
          type="checkbox"
        />
        <span className={styles.overlayLabel}>{t(LangId.VfxViewportCamLock)}</span>
      </label>
      <label className={styles.overlayItem} title={t(LangId.VfxViewportLockMotionTitle)}>
        <input
          checked={settings.vfxLockMotionEnabled}
          onChange={() => toggle('vfxLockMotionEnabled')}
          type="checkbox"
        />
        <span className={styles.overlayLabel}>{t(LangId.VfxViewportLockMotion)}</span>
      </label>
      <label className={styles.overlayItem} title={t(LangId.VfxViewportTransformDebugTitle)}>
        <input
          checked={settings.showTransformDebug}
          onChange={() => toggle('showTransformDebug')}
          type="checkbox"
        />
        <span className={styles.overlayLabel}>{t(LangId.VfxViewportTransformDebug)}</span>
      </label>
      <label className={styles.overlayItem} title={t(LangId.VfxViewportSceneDepthTitle)}>
        <input
          checked={settings.sceneDepthFade}
          onChange={() => toggle('sceneDepthFade')}
          type="checkbox"
        />
        <span className={styles.overlayLabel}>{t(LangId.VfxViewportSceneDepth)}</span>
      </label>
    </>
  )

  return (
    <div className={styles.sceneDock}>
      <VfxScene3dVerticalMenu
        activeTool={activeTool}
        expanded={menuExpanded}
        onSelectTool={handleSelectTool}
        onToggleMenu={handleToggleMenu}
      />

      {activeTool ? (
        <aside aria-label={toolTitle} className={styles.scenePanel}>
          <header className={styles.scenePanelHead}>
            <span className={styles.scenePanelHeadIcon}>
              <ToolPanelIcon toolId={activeTool} />
            </span>
            <span className={styles.scenePanelTitle}>{toolTitle}</span>
          </header>

          <div className={styles.scenePanelScroll}>
            {activeTool === 'scene' ? scenePanel : vfxLolPanel}
          </div>
        </aside>
      ) : null}
    </div>
  )
}
