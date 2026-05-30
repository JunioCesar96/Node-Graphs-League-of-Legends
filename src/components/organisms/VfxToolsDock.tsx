import { useCallback, useState } from 'react'

import type { VfxTextureLookupHit } from '@/core/vfx/vfxAssetLookup'
import type { VfxTransformDebugRow } from '@/core/vfx/vfxTransformDebugList'
import type { VfxWebEmitterBuilt } from '@/core/vfx/vfxWebBuilder'
import { LangId } from '@/core/language/languageIds'
import { useLanguage } from '@/language/LanguageProvider'

import type { useVfxCharacterScene } from '@/hooks/useVfxCharacterScene'

import type { BufferGeometry } from 'three'

import { CharacterIcon, InspectorIcon } from '@/components/atoms/VfxToolsIcons'
import { VfxToolsVerticalMenu, type VfxToolId } from '@/components/molecules/VfxToolsVerticalMenu'

import { VfxCharacterPanel } from './VfxCharacterPanel'
import { VfxDockInspector } from './VfxDockInspector'
import styles from './VfxToolsDock.module.css'

type CharacterScene = ReturnType<typeof useVfxCharacterScene>

type VfxToolsDockProps = {
  assetIndexSize: number
  assetLoading: boolean
  characterScene: CharacterScene
  vfxScale: number
  emitter: VfxWebEmitterBuilt | null
  gameRoot: string
  meshCacheSize: number
  meshGeometry: BufferGeometry | null
  meshResolved: boolean
  onGameRootChange: (value: string) => void
  onOpenTexFile: () => void
  onPickAssets: () => void
  particleNormalized?: number
  showTransformDebug?: boolean
  textureHit: { path: string; hit: VfxTextureLookupHit } | null
  textureResolved: boolean
  transformDebugRows?: VfxTransformDebugRow[] | null
  warnings: string[]
}

function ToolPanelIcon({ toolId }: { toolId: VfxToolId }) {
  if (toolId === 'inspector') {
    return <InspectorIcon size={16} />
  }
  return <CharacterIcon size={16} />
}

export function VfxToolsDock({
  assetIndexSize,
  assetLoading,
  characterScene,
  vfxScale,
  emitter,
  gameRoot,
  meshCacheSize,
  meshGeometry,
  meshResolved,
  onGameRootChange,
  onOpenTexFile,
  onPickAssets,
  particleNormalized = 0,
  showTransformDebug = false,
  textureHit,
  textureResolved,
  transformDebugRows = null,
  warnings,
}: VfxToolsDockProps) {
  const { t } = useLanguage()
  const [menuExpanded, setMenuExpanded] = useState(false)
  const [activeTool, setActiveTool] = useState<VfxToolId | null>(null)

  const handleSelectTool = useCallback(
    (toolId: VfxToolId) => {
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

  const toolTitle =
    activeTool === 'inspector' ? t(LangId.VfxInspectorTitle) : t(LangId.VfxToolsCharacter)

  const toolSubtitle =
    activeTool === 'inspector'
      ? emitter
        ? emitter.name
        : t(LangId.VfxInspectorNoEmitter)
      : characterScene.selectedChampion

  const toolSubtitleMuted =
    activeTool === 'inspector' ? !emitter : !characterScene.selectedChampion

  return (
    <div className={styles.toolsDock}>
      {activeTool ? (
        <aside aria-label={toolTitle} className={styles.toolPanel}>
          <header className={styles.toolPanelHead}>
            <span className={styles.toolPanelHeadIcon}>
              <ToolPanelIcon toolId={activeTool} />
            </span>
            <div className={styles.toolPanelHeadText}>
              <span className={styles.toolPanelTitle}>{toolTitle}</span>
              <span
                className={toolSubtitleMuted ? styles.toolPanelSubtitleMuted : styles.toolPanelSubtitle}
                title={toolSubtitle}
              >
                {toolSubtitle}
                {activeTool === 'character' && characterScene.instantiated ? ` · ${t(LangId.VfxCharacterInScene)}` : ''}
              </span>
            </div>
          </header>

          <div className={styles.toolPanelBody}>
            <div className={styles.toolPanelScroll}>
              {activeTool === 'inspector' ? (
                <VfxDockInspector
                  embedded
                  assetIndexSize={assetIndexSize}
                  assetLoading={assetLoading}
                  emitter={emitter}
                  gameRoot={gameRoot}
                  meshCacheSize={meshCacheSize}
                  meshGeometry={meshGeometry}
                  meshResolved={meshResolved}
                  onGameRootChange={onGameRootChange}
                  onOpenTexFile={onOpenTexFile}
                  onPickAssets={onPickAssets}
                  particleNormalized={particleNormalized}
                  showTransformDebug={showTransformDebug}
                  textureHit={textureHit}
                  textureResolved={textureResolved}
                  transformDebugRows={transformDebugRows}
                  warnings={warnings}
                />
              ) : (
                <VfxCharacterPanel
                  assetIndexSize={assetIndexSize}
                  embedded
                  assetLoading={assetLoading}
                  scene={characterScene}
                  vfxScale={vfxScale}
                />
              )}
            </div>
          </div>
        </aside>
      ) : null}

      <VfxToolsVerticalMenu
        activeTool={activeTool}
        expanded={menuExpanded}
        onSelectTool={handleSelectTool}
        onToggleMenu={handleToggleMenu}
      />
    </div>
  )
}
