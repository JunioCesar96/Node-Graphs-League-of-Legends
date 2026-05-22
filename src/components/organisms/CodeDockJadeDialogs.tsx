import EditorContextMenu from '@jade/components/EditorContextMenu'
import SettingsDialog from '@jade/components/SettingsDialog'
import PreferencesDialog from '@jade/components/PreferencesDialog'
import ThemesDialog from '@jade/components/ThemesDialog'
import AboutDialog from '@jade/components/AboutDialog'
import GeneralEditPanel from '@jade/components/GeneralEditPanel'
import ParticleEditorPanel from '@jade/components/ParticleEditorPanel'

import type { useCodeDockJadeEditor } from '@/hooks/useCodeDockJadeEditor'
import { useJadeBridgeCapabilities } from '@/hooks/useJadeBridgeCapabilities'

type JadeEditor = ReturnType<typeof useCodeDockJadeEditor>

type CodeDockJadeDialogsProps = {
  editor: JadeEditor
  value: string
  neekoSendTarget?: { canvasNodeId: string } | null
  onSendCodeToNeeko?: (canvasNodeId: string, text: string) => void
}

export function CodeDockJadeDialogs({
  editor,
  value,
  neekoSendTarget = null,
  onSendCodeToNeeko,
}: CodeDockJadeDialogsProps) {
  const { capabilities, httpBridgeEnabled } = useJadeBridgeCapabilities()
  const bridgeFeatures = httpBridgeEnabled ? capabilities?.features : undefined

  const ctxSelectedText = editor.ctxMenu?.selectedText ?? ''
  const showToNeekoNode =
    Boolean(neekoSendTarget && onSendCodeToNeeko && ctxSelectedText.length > 0)

  const handleToNeekoNode = () => {
    if (!neekoSendTarget || !onSendCodeToNeeko || ctxSelectedText.length === 0) {
      return
    }
    onSendCodeToNeeko(neekoSendTarget.canvasNodeId, ctxSelectedText)
  }

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
          onToNeekoNode={showToNeekoNode ? handleToNeekoNode : undefined}
          onUnfoldEmitters={editor.unfoldAllEmitters}
          showToNeekoNode={showToNeekoNode}
          x={editor.ctxMenu.x}
          y={editor.ctxMenu.y}
        />
      ) : null}

      <GeneralEditPanel
        docked
        editorContent={value}
        httpBridgeEnabled={httpBridgeEnabled && capabilities?.features?.materialOverride === true}
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
        httpBridgeFeatures={bridgeFeatures}
        isOpen={editor.showSettings}
        onClose={() => editor.setShowSettings(false)}
        tauriFeaturesEnabled={false}
      />

      <PreferencesDialog
        httpBridgeEnabled={httpBridgeEnabled}
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
