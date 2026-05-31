import { useRef } from 'react'

import { SurfaceThemeContextMenu } from '@/components/molecules/SurfaceThemeContextMenu'
import { LangId } from '@/core/language/languageIds'
import {
  clearStoredRitobinExePath,
  getStoredRitobinExePath,
  readAbsolutePathFromDroppedOrPickedFile,
  setStoredRitobinExePath,
} from '@/core/ritobinExePreference'
import type { RecentSceneListItem } from '@/core/sceneTabsStorage'
import { useSurfaceThemeContextMenu } from '@/hooks/useSurfaceThemeContextMenu'
import { useLanguage } from '@/language/LanguageProvider'
import styles from './AppMenuBar.module.css'

export type AppMenuBarProps = {
  nodeLightModeEnabled: boolean
  nodeConfigurationMode: boolean
  onDeleteSelection: () => void
  onImportGraph: (file: File) => void
  onNewWorkScene: () => void
  onOpenRecentScene: (recentId: string) => void
  onOpenStubBin: () => void
  onRequestAddNode: () => void
  onSaveWorkScene: () => void
  onToggleNodeLightMode: () => void
  onToggleNodeConfigurationMode: () => void
  onEditClassGroupPackFolder?: () => void
  onGraphsToCode?: () => void
  onToggleCodeDock: () => void
  onToggleVfxDock: () => void
  recentScenes: RecentSceneListItem[]
}

export function AppMenuBar({
  nodeLightModeEnabled,
  nodeConfigurationMode,
  onDeleteSelection,
  onImportGraph,
  onNewWorkScene,
  onOpenRecentScene,
  onOpenStubBin,
  onRequestAddNode,
  onSaveWorkScene,
  onToggleNodeLightMode,
  onToggleNodeConfigurationMode,
  onEditClassGroupPackFolder,
  onGraphsToCode,
  onToggleCodeDock,
  onToggleVfxDock,
  recentScenes,
}: AppMenuBarProps) {
  const { locale, locales, reloadLocales, setLocale, t } = useLanguage()
  const {
    surfaceThemeMenuAnchor,
    openSurfaceThemeContextMenu,
    closeSurfaceThemeContextMenu,
  } = useSurfaceThemeContextMenu()
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const ritobinExeInputRef = useRef<HTMLInputElement | null>(null)

  return (
    <>
      <header className={styles.bar} onContextMenu={openSurfaceThemeContextMenu}>
      <span className={styles.brand}>Node Graphs LOL</span>

      <nav aria-label="Principal" className={styles.nav}>
        <div className={styles.menu}>
          <button className={styles.menuButton} type="button">
            {t(LangId.MenuFile)}
          </button>
          <div className={styles.menuPanel} role="menu">
            <input
              accept=".json,.bin"
              className={styles.hiddenInput}
              onChange={(changeEvent) => {
                const picked = changeEvent.target.files?.[0]

                if (picked) {
                  onImportGraph(picked)
                  changeEvent.target.value = ''
                }
              }}
              ref={fileInputRef}
              type="file"
            />
            <button
              className={styles.menuItem}
              onClick={() => fileInputRef.current?.click()}
              type="button"
            >
              {t(LangId.MenuFileOpen)}
            </button>
            <button className={styles.menuItem} onClick={onOpenStubBin} type="button">
              {t(LangId.MenuFileStubBin)}
            </button>
          </div>
        </div>

        <div className={styles.menu}>
          <button className={styles.menuButton} type="button">
            {t(LangId.MenuLanguage)}
          </button>
          <div className={styles.menuPanel} role="menu">
            {locales.length === 0 ? (
              <span className={styles.menuItemDisabled}>—</span>
            ) : (
              locales.map((entry) => (
                <button
                  aria-checked={entry === locale}
                  className={styles.menuItemConfig}
                  key={entry}
                  onClick={() => {
                    void setLocale(entry)
                  }}
                  role="menuitemradio"
                  type="button"
                >
                  <span
                    aria-hidden
                    className={[
                      styles.menuCheckbox,
                      entry === locale ? styles.menuCheckboxChecked : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                  />
                  <span>{entry}</span>
                </button>
              ))
            )}
            <div aria-hidden className={styles.menuSeparator} />
            <button
              className={styles.menuItem}
              onClick={() => {
                void reloadLocales()
              }}
              type="button"
            >
              {t(LangId.MenuLanguageReload)}
            </button>
          </div>
        </div>

        <div className={styles.menu}>
          <button className={styles.menuButton} type="button">
            {t(LangId.MenuRitobin)}
          </button>
          <div className={styles.menuPanel} role="menu">
            <input
              accept=".exe,.EXE"
              className={styles.hiddenInput}
              onChange={(changeEvent) => {
                const picked = changeEvent.target.files?.[0]

                changeEvent.target.value = ''

                if (!picked) {
                  return
                }

                const fromFilesystem = readAbsolutePathFromDroppedOrPickedFile(picked)

                const nextPath =
                  fromFilesystem ??
                  window.prompt(
                    `O browser não expõe o caminho absoluto ao ficheiro "${picked.name}".\nCole aqui o caminho completo para o ritobin (.exe):`,
                    getStoredRitobinExePath() ?? '',
                  )?.trim() ??
                  ''

                if (nextPath.length === 0) {
                  return
                }

                setStoredRitobinExePath(nextPath)

                window.alert(
                  nextPath.length > 204
                    ? `Caminho guardado:\n…${nextPath.slice(-180)}`
                    : `Caminho guardado:\n${nextPath}`,
                )
              }}
              ref={ritobinExeInputRef}
              type="file"
            />
            <button
              className={styles.menuItem}
              onClick={() => ritobinExeInputRef.current?.click()}
              type="button"
            >
              {t(LangId.MenuRitobinChooseExe)}
            </button>
            <button
              className={styles.menuItem}
              onClick={() => {
                const raw = window.prompt(
                  'Caminho absoluto do ritobin.exe:',
                  getStoredRitobinExePath() ?? '',
                )

                if (raw === null) {
                  return
                }

                const next = raw.trim()

                if (next.length === 0) {
                  window.alert('Caminho vazio — não alterado.')

                  return
                }

                setStoredRitobinExePath(next)

                window.alert(`Caminho guardado (${String(next.length)} caracteres).`)
              }}
              type="button"
            >
              {t(LangId.MenuRitobinEditPath)}
            </button>
            <button
              className={styles.menuItem}
              onClick={() => {
                const current = getStoredRitobinExePath()

                if (!current) {
                  window.alert('Nenhum executável ritobin está configurado.')

                  return
                }

                void navigator.clipboard.writeText(current).then(
                  () => {
                    window.alert('Caminho copiado para a área de transferência.')
                  },
                  () => {
                    window.alert(`Caminho atual:\n${current}`)
                  },
                )
              }}
              type="button"
            >
              {t(LangId.MenuRitobinCopyPath)}
            </button>
            <button
              className={styles.menuItemDanger}
              onClick={() => {
                clearStoredRitobinExePath()
                window.alert('Caminho do ritobin removido.')
              }}
              type="button"
            >
              {t(LangId.MenuRitobinClearPath)}
            </button>
          </div>
        </div>

        <div className={styles.menu}>
          <button className={styles.menuButton} type="button">
            {t(LangId.MenuGraph)}
          </button>
          <div className={styles.menuPanel} role="menu">
            <button className={styles.menuItem} onClick={onNewWorkScene} type="button">
              {t(LangId.MenuGraphNewScene)}
            </button>
            <div className={styles.menuItemWithSub}>
              <button className={styles.menuItem} type="button">
                {t(LangId.MenuGraphRecentScenes)}
              </button>
              <div className={styles.menuSubPanel} role="menu">
                {recentScenes.length === 0 ? (
                  <span className={styles.menuItemDisabled}>{t(LangId.MenuGraphNoRecent)}</span>
                ) : (
                  recentScenes.map((entry) => (
                    <button
                      className={styles.menuItem}
                      key={entry.id}
                      onClick={() => onOpenRecentScene(entry.id)}
                      type="button"
                    >
                      {entry.sourceFileName ?? entry.title}
                      {entry.openedAt ? (
                        <span className={styles.menuItemRecentMeta}>
                          {new Date(entry.openedAt).toLocaleString()}
                        </span>
                      ) : null}
                    </button>
                  ))
                )}
              </div>
            </div>
            <div aria-hidden className={styles.menuSeparator} />
            <button className={styles.menuItem} onClick={onSaveWorkScene} type="button">
              {t(LangId.MenuGraphSave)}
            </button>
            {onGraphsToCode ? (
              <>
                <div aria-hidden className={styles.menuSeparator} />
                <button className={styles.menuItem} onClick={onGraphsToCode} type="button">
                  {t(LangId.MenuGraphToCode)}
                </button>
              </>
            ) : null}
          </div>
        </div>

        <div className={styles.menu}>
          <button className={styles.menuButton} onClick={onToggleCodeDock} type="button">
            {t(LangId.MenuCode)}
          </button>
        </div>

        <div className={styles.menu}>
          <button className={styles.menuButton} onClick={onToggleVfxDock} type="button">
            {t(LangId.MenuVfx)}
          </button>
        </div>

        <div className={styles.menu}>
          <button className={styles.menuButton} type="button">
            {t(LangId.MenuNodes)}
          </button>
          <div className={styles.menuPanel} role="menu">
            <button className={styles.menuItem} onClick={onRequestAddNode} type="button">
              {t(LangId.MenuNodesAdd)}
            </button>
            <button className={styles.menuItemDanger} onClick={onDeleteSelection} type="button">
              {t(LangId.MenuNodesRemove)}
            </button>
            <button
              aria-checked={nodeLightModeEnabled}
              className={styles.menuItemConfig}
              onClick={onToggleNodeLightMode}
              role="menuitemcheckbox"
              type="button"
            >
              <span
                aria-hidden
                className={[
                  styles.menuCheckbox,
                  nodeLightModeEnabled ? styles.menuCheckboxChecked : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
              />
              <span>{t(LangId.MenuNodesLightMode)}</span>
            </button>
            <button
              aria-checked={nodeConfigurationMode}
              className={styles.menuItemConfig}
              onClick={onToggleNodeConfigurationMode}
              role="menuitemcheckbox"
              type="button"
            >
              <span
                aria-hidden
                className={[
                  styles.menuCheckbox,
                  nodeConfigurationMode ? styles.menuCheckboxChecked : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
              />
              <span>{t(LangId.MenuNodesConfigure)}</span>
            </button>
            {nodeConfigurationMode && onEditClassGroupPackFolder ? (
              <button
                className={styles.menuItem}
                onClick={onEditClassGroupPackFolder}
                type="button"
              >
                {t(LangId.MenuNodesClassGroupFolder)}
              </button>
            ) : null}
          </div>
        </div>
      </nav>
    </header>
      {surfaceThemeMenuAnchor ? (
        <SurfaceThemeContextMenu
          anchor={surfaceThemeMenuAnchor}
          onClose={closeSurfaceThemeContextMenu}
        />
      ) : null}
    </>
  )
}
