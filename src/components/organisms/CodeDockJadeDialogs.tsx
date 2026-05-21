import EditorContextMenu from '@jade/components/EditorContextMenu'
import SettingsDialog from '@jade/components/SettingsDialog'
import PreferencesDialog from '@jade/components/PreferencesDialog'
import ThemesDialog from '@jade/components/ThemesDialog'
import AboutDialog from '@jade/components/AboutDialog'
import GeneralEditPanel from '@jade/components/GeneralEditPanel'
import ParticleEditorPanel from '@jade/components/ParticleEditorPanel'

import type { useCodeDockJadeEditor } from '@/hooks/useCodeDockJadeEditor'

type JadeEditor = ReturnType<typeof useCodeDockJadeEditor>

type CodeDockJadeDialogsProps = {
  editor: JadeEditor
  value: string
}

export function CodeDockJadeDialogs({ editor, value }: CodeDockJadeDialogsProps) {
  return (
    <>
      {editor.ctxMenu ? (
        <EditorContextMenu
          hasEmitters={editor.hasEmitters()}
          onClose={() => editor.setCtxMenu(null)}
          onCopy={editor.handleCopy}
          onCut={editor.handleCut}
          onFoldEmitters={editor.foldAllEmitters}
          onPaste={editor.handlePaste}
          onSelectAll={editor.handleSelectAll}
          onUnfoldEmitters={editor.unfoldAllEmitters}
          x={editor.ctxMenu.x}
          y={editor.ctxMenu.y}
        />
      ) : null}

      <GeneralEditPanel
        docked
        editorContent={value}
        isOpen={editor.generalEditOpen}
        onClose={() => editor.setGeneralEditOpen(false)}
        onContentChange={editor.handlePanelContentChange}
      />

      <ParticleEditorPanel
        docked
        editorContent={value}
        isOpen={editor.particlePanelOpen}
        onClose={() => editor.setParticlePanelOpen(false)}
        onContentChange={editor.handlePanelContentChange}
        onScrollToLine={editor.scrollToLine}
      />

      <SettingsDialog
        isOpen={editor.showSettings}
        onClose={() => editor.setShowSettings(false)}
        tauriFeaturesEnabled={false}
      />

      <PreferencesDialog
        isOpen={editor.showPreferences}
        onClose={() => editor.setShowPreferences(false)}
        onEmitterHintsChange={editor.onEmitterHintsChange}
        onSyntaxCheckingChange={editor.onSyntaxCheckingChange}
      />

      <ThemesDialog
        hideWorkspaceSection
        isOpen={editor.showThemes}
        onClose={() => editor.setShowThemes(false)}
        onThemeApplied={editor.onThemeApplied}
      />

      <AboutDialog isOpen={editor.showAbout} onClose={() => editor.setShowAbout(false)} />
    </>
  )
}
