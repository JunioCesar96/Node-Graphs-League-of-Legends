import { LangId } from '@/core/language/languageIds'
import { useJadeSurfaceTheme } from '@/hooks/useJadeSurfaceTheme'
import { useLanguage } from '@/language/LanguageProvider'

import { AppToggleCheckbox } from '@/components/atoms/AppToggleCheckbox'

import appStyles from '@/components/organisms/AppMenuBar.module.css'

function ThemeToggleRows({
  classNamePrefix,
  onOpenThemes,
  showOpenThemes,
}: {
  classNamePrefix: 'app' | 'jade'
  onOpenThemes?: () => void
  showOpenThemes: boolean
}) {
  const { t } = useLanguage()
  const { themeEnabled, syntaxEnabled, toggleTheme, toggleSyntax } = useJadeSurfaceTheme()

  const rowClass = classNamePrefix === 'app' ? appStyles.menuItemThemeToggle : 'menu-option menu-option-theme-toggle'

  return (
    <>
      <button
        aria-checked={themeEnabled}
        className={rowClass}
        onClick={() => void toggleTheme()}
        role="menuitemcheckbox"
        type="button"
      >
        <span>{t(LangId.CtxApplyJadeTheme, 'Tema')}</span>
        <AppToggleCheckbox checked={themeEnabled} decorative size="compact" />
      </button>
      <button
        aria-checked={syntaxEnabled}
        className={rowClass}
        onClick={() => void toggleSyntax()}
        role="menuitemcheckbox"
        type="button"
      >
        <span>{t(LangId.CtxApplyJadeSyntax, 'Syntax Color Scheme')}</span>
        <AppToggleCheckbox checked={syntaxEnabled} decorative size="compact" />
      </button>
      {showOpenThemes && onOpenThemes ? (
        <>
          <div aria-hidden className={classNamePrefix === 'app' ? appStyles.menuSeparator : 'menu-separator'} />
          <button
            className={classNamePrefix === 'app' ? appStyles.menuItem : 'menu-option'}
            onClick={onOpenThemes}
            type="button"
          >
            {t(LangId.MenuJadeThemesPicker, 'Temas Jade…')}
          </button>
        </>
      ) : null}
    </>
  )
}

/** Estrutura Options → Jade Themes → Theme Options (barra principal da app). */
export function AppMenuJadeThemeOptions({ onOpenThemes }: { onOpenThemes?: () => void }) {
  const { t } = useLanguage()

  return (
    <div className={appStyles.menuItemWithSub}>
      <button className={appStyles.menuItem} type="button">
        {t(LangId.MenuJadeThemes, 'Jade Themes')}
      </button>
      <div className={appStyles.menuSubPanel}>
        <div className={`${appStyles.menuItemWithSub} ${appStyles.menuItemWithSubNested}`}>
          <button className={appStyles.menuItem} type="button">
            {t(LangId.MenuThemeOptions, 'Theme Options')}
          </button>
          <div className={appStyles.menuSubPanel}>
            <ThemeToggleRows classNamePrefix="app" onOpenThemes={onOpenThemes} showOpenThemes />
          </div>
        </div>
      </div>
    </div>
  )
}

/** Conteúdo do menu Options no MenuBar Jade (CodeDock). */
export function JadeMenuBarOptionsMenu({ onOpenThemes }: { onOpenThemes?: () => void }) {
  const { t } = useLanguage()

  return (
    <>
      <div className="menu-item-with-submenu">
        <button className="menu-option" type="button">
          <span>{t(LangId.MenuJadeThemes, 'Jade Themes')}</span>
          <span className="submenu-arrow">›</span>
        </button>
        <div className="menu-submenu">
          <div className="menu-item-with-submenu">
            <button className="menu-option" type="button">
              <span>{t(LangId.MenuThemeOptions, 'Theme Options')}</span>
              <span className="submenu-arrow">›</span>
            </button>
            <div className="menu-submenu">
              <ThemeToggleRows
                classNamePrefix="jade"
                onOpenThemes={onOpenThemes}
                showOpenThemes={Boolean(onOpenThemes)}
              />
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
