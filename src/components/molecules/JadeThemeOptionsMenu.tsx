import { LangId } from '@/core/language/languageIds'
import { useJadeSurfaceTheme } from '@/hooks/useJadeSurfaceTheme'
import { useLanguage } from '@/language/LanguageProvider'

import { AppToggleCheckbox } from '@/components/atoms/AppToggleCheckbox'

import appStyles from '@/components/organisms/AppMenuBar.module.css'

function ThemeToggleRows({
  classNamePrefix,
  onOpenJadeThemes,
  onOpenNativeThemes,
}: {
  classNamePrefix: 'app' | 'jade'
  onOpenJadeThemes?: () => void
  onOpenNativeThemes?: () => void
}) {
  const { t } = useLanguage()
  const { themeEnabled, syntaxEnabled, backgroundEnabled, fontsEnabled, toggleTheme, toggleSyntax, toggleBackground, toggleFonts } =
    useJadeSurfaceTheme()

  const rowClass = classNamePrefix === 'app' ? appStyles.menuItemThemeToggle : 'menu-option menu-option-theme-toggle'
  const showThemePickers = Boolean(onOpenJadeThemes || onOpenNativeThemes)

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
      <button
        aria-checked={backgroundEnabled}
        className={rowClass}
        onClick={() => void toggleBackground()}
        role="menuitemcheckbox"
        type="button"
      >
        <span>{t(LangId.CtxApplyJadeBackground, 'Background')}</span>
        <AppToggleCheckbox checked={backgroundEnabled} decorative size="compact" />
      </button>
      <button
        aria-checked={fontsEnabled}
        className={rowClass}
        onClick={() => void toggleFonts()}
        role="menuitemcheckbox"
        type="button"
      >
        <span>{t(LangId.CtxApplyJadeFonts, 'Fonts')}</span>
        <AppToggleCheckbox checked={fontsEnabled} decorative size="compact" />
      </button>
      {showThemePickers ? (
        <>
          <div aria-hidden className={classNamePrefix === 'app' ? appStyles.menuSeparator : 'menu-separator'} />
          {onOpenJadeThemes ? (
            <button
              className={classNamePrefix === 'app' ? appStyles.menuItem : 'menu-option'}
              onClick={onOpenJadeThemes}
              type="button"
            >
              {t(LangId.MenuJadeThemesPicker, 'Jade Themes…')}
            </button>
          ) : null}
          {onOpenNativeThemes ? (
            <button
              className={classNamePrefix === 'app' ? appStyles.menuItem : 'menu-option'}
              onClick={onOpenNativeThemes}
              type="button"
            >
              {t(LangId.MenuNativeThemesPicker, 'Native Themes…')}
            </button>
          ) : null}
        </>
      ) : null}
    </>
  )
}

/** Options → Theme Options (barra principal da app). */
export function AppMenuJadeThemeOptions({
  onOpenJadeThemes,
  onOpenNativeThemes,
}: {
  onOpenJadeThemes?: () => void
  onOpenNativeThemes?: () => void
}) {
  const { t } = useLanguage()

  return (
    <div className={appStyles.menuItemWithSub}>
      <button className={appStyles.menuItem} type="button">
        {t(LangId.MenuThemeOptions, 'Theme Options')}
      </button>
      <div className={appStyles.menuSubPanel}>
        <ThemeToggleRows
          classNamePrefix="app"
          onOpenJadeThemes={onOpenJadeThemes}
          onOpenNativeThemes={onOpenNativeThemes}
        />
      </div>
    </div>
  )
}

/** Conteúdo do menu Options no MenuBar Jade (CodeDock). */
export function JadeMenuBarOptionsMenu({
  onOpenJadeThemes,
  onOpenNativeThemes,
}: {
  onOpenJadeThemes?: () => void
  onOpenNativeThemes?: () => void
}) {
  const { t } = useLanguage()

  return (
    <div className="menu-item-with-submenu">
      <button className="menu-option" type="button">
        <span>{t(LangId.MenuThemeOptions, 'Theme Options')}</span>
        <span className="submenu-arrow">›</span>
      </button>
      <div className="menu-submenu">
        <ThemeToggleRows
          classNamePrefix="jade"
          onOpenJadeThemes={onOpenJadeThemes}
          onOpenNativeThemes={onOpenNativeThemes}
        />
      </div>
    </div>
  )
}
