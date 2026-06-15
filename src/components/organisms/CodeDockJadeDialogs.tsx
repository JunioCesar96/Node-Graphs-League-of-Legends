import { buildThemesDialogLabels } from '@/core/language/themesDialogLabels'
import { useLanguage } from '@/language/LanguageProvider'
import SettingsDialog from '@jade/components/SettingsDialog'
import PreferencesDialog from '@jade/components/PreferencesDialog'
import ThemesDialog from '@jade/components/ThemesDialog'
import AboutDialog from '@jade/components/AboutDialog'
import GeneralEditPanel from '@jade/components/GeneralEditPanel'
import ParticleEditorPanel from '@jade/components/ParticleEditorPanel'

import { CodeDockEditorContextMenu } from '@/components/molecules/CodeDockEditorContextMenu'
import { isRitualHashToken } from '@/core/vfx/lolFnv1aHash'
import type { useCodeDockJadeEditor } from '@/hooks/useCodeDockJadeEditor'
import { useJadeBridgeCapabilities } from '@/hooks/useJadeBridgeCapabilities'

type JadeEditor = ReturnType<typeof useCodeDockJadeEditor>

type CodeDockJadeDialogsProps = {
  editor: JadeEditor
  value: string
  neekoSendTarget?: { canvasNodeId: string } | null
  onSendCodeToNeeko?: (canvasNodeId: string, text: string) => void
  primarySelectedNodeId?: string | null
  onReplaceValueToGraph?: (snippet: string) => void
}

export function CodeDockJadeDialogs({
  editor,
  value,
  neekoSendTarget = null,
  onSendCodeToNeeko,
  primarySelectedNodeId = null,
  onReplaceValueToGraph,
}: CodeDockJadeDialogsProps) {
  const { t } = useLanguage()
  const themesDialogLabels = buildThemesDialogLabels(t)
  const { capabilities, httpBridgeEnabled } = useJadeBridgeCapabilities()
  const bridgeFeatures = httpBridgeEnabled ? capabilities?.features : undefined

  const ctxSelectedText = editor.ctxMenu?.selectedText ?? ''
  const clickOnSelection = editor.ctxMenu?.clickOnSelection ?? false
  const showToNeekoNode =
    Boolean(neekoSendTarget && onSendCodeToNeeko && clickOnSelection && ctxSelectedText.length > 0)

  const showReplaceValueToGraph = Boolean(
    primarySelectedNodeId &&
      onReplaceValueToGraph &&
      clickOnSelection &&
      ctxSelectedText.length > 0,
  )

  const showConvertHashToString = isRitualHashToken(ctxSelectedText)
  const showConvertAllUndefinedHashes = ctxSelectedText.length === 0

  const handleToNeekoNode = () => {
    if (!neekoSendTarget || !onSendCodeToNeeko || ctxSelectedText.length === 0) {
      return
    }
    onSendCodeToNeeko(neekoSendTarget.canvasNodeId, ctxSelectedText)
  }

  const handleReplaceValueToGraph = () => {
    if (!onReplaceValueToGraph || ctxSelectedText.length === 0) {
      return
    }
    onReplaceValueToGraph(ctxSelectedText)
  }

  return (
    <>
      {editor.ctxMenu ? (
        <CodeDockEditorContextMenu
          hasEmitters={editor.hasEmitters()}
          hasSystems={editor.hasSystems()}
          onClose={() => editor.setCtxMenu(null)}
          onConvertHashToString={showConvertHashToString ? editor.handleConvertHashToString : undefined}
          onConvertAllUndefinedHashes={
            showConvertAllUndefinedHashes ? editor.handleConvertAllUndefinedHashesToString : undefined
          }
          onCopy={editor.handleCopy}
          onCut={editor.handleCut}
          onFoldEmitters={editor.foldAllEmitters}
          onFoldSystems={editor.foldAllSystems}
          onPaste={editor.handlePaste}
          onSelectAll={editor.handleSelectAll}
          onToNeekoNode={showToNeekoNode ? handleToNeekoNode : undefined}
          onReplaceValueToGraph={showReplaceValueToGraph ? handleReplaceValueToGraph : undefined}
          onUnfoldEmitters={editor.unfoldAllEmitters}
          onUnfoldSystems={editor.unfoldAllSystems}
          showConvertHashToString={showConvertHashToString}
          showConvertAllUndefinedHashes={showConvertAllUndefinedHashes}
          showToNeekoNode={showToNeekoNode}
          showReplaceValueToGraph={showReplaceValueToGraph}
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
        labels={themesDialogLabels}
        onClose={() => editor.setShowThemes(false)}
        onThemeApplied={editor.onThemeApplied}
        scope="jade"
      />

      <ThemesDialog
        hideWorkspaceSection
        isOpen={editor.showNativeThemes}
        labels={themesDialogLabels}
        onClose={() => editor.setShowNativeThemes(false)}
        onThemeApplied={editor.onThemeApplied}
        scope="native"
      />

      <AboutDialog isOpen={editor.showAbout} onClose={() => editor.setShowAbout(false)} />
    </>
  )
}
