import { useCallback, useMemo, useState } from 'react'

import { showAppAlert } from '@/messenger_popup/appMessenger'
import type { CanvasScene } from '@/core/canvasScene'
import {
  buildSceneThroughSteps,
  createEmptyCodeToCanvasScene,
  finalizeCodeToCanvasScene,
  formatStepLabel,
  formatWizardSummary,
  getStepFocusNodeIds,
  prepareCodeToCanvasBuild,
  type CodeToCanvasStep,
  type StepVerdict,
} from '@/core/codeToCanvasSteps'
import { setCodeToNodeGraphPackFolder } from '@/core/nodeConfigurationPreference'
import type { NodeSchemaDefinition } from '@/core/nodeSchema'
import { stripExtension } from '@/core/sceneTabsStorage'

export type CodeToCanvasWizardPhase = 'idle' | 'running' | 'done'

export type CodeToCanvasWizardSummary = {
  wrongCount: number
  lines: string[]
  buildWarnings: string[]
}

export type CodeToCanvasWizardController = {
  open: boolean
  phase: CodeToCanvasWizardPhase
  stepIndex: number
  totalSteps: number
  stepLabel: string
  verdict: 'correct' | 'wrong' | null
  wrongDescription: string
  setVerdict: (verdict: 'correct' | 'wrong') => void
  setWrongDescription: (value: string) => void
  canAdvance: boolean
  isLastStep: boolean
  summary: CodeToCanvasWizardSummary | null
  onAdvance: () => void
  onCancel: () => void
}

type WizardRuntime = {
  packFolder: string
  sceneTitle: string
  steps: CodeToCanvasStep[]
  parseRegistry: Map<string, import('@/core/classGroupRitualStackParser').MutableClassGroupSchema>
  typeIndex: ReturnType<typeof import('@/core/codeToCanvasScene').buildPackTypeIndex>
  initialWarnings: string[]
}

export type UseCodeToCanvasWizardParams = {
  codeText: string
  codeDockFileName: string
  registry: Record<string, NodeSchemaDefinition>
  packFolderBySchemaId: Record<string, string>
  openOrReplaceSceneByTitle: (title: string, scene: CanvasScene) => void
  selectNode: (nodeId: string) => void
  focusNodes: (nodeIds: string[]) => void
}

export function useCodeToCanvasWizard({
  codeText,
  codeDockFileName,
  registry,
  packFolderBySchemaId,
  openOrReplaceSceneByTitle,
  selectNode,
  focusNodes,
}: UseCodeToCanvasWizardParams): {
  startWizard: (packFolder: string) => Promise<boolean>
  controller: CodeToCanvasWizardController
} {
  const [phase, setPhase] = useState<CodeToCanvasWizardPhase>('idle')
  const [runtime, setRuntime] = useState<WizardRuntime | null>(null)
  const [stepIndex, setStepIndex] = useState(0)
  const [verdicts, setVerdicts] = useState<StepVerdict[]>([])
  const [pendingVerdict, setPendingVerdict] = useState<'correct' | 'wrong' | null>(null)
  const [wrongDescription, setWrongDescription] = useState('')
  const [summary, setSummary] = useState<CodeToCanvasWizardSummary | null>(null)

  const resetWizard = useCallback(() => {
    setPhase('idle')
    setRuntime(null)
    setStepIndex(0)
    setVerdicts([])
    setPendingVerdict(null)
    setWrongDescription('')
    setSummary(null)
  }, [])

  const startWizard = useCallback(
    async (packFolder: string): Promise<boolean> => {
      const prepared = prepareCodeToCanvasBuild(
        codeText,
        packFolder,
        registry,
        packFolderBySchemaId,
      )

      if (!prepared.ok) {
        showAppAlert(prepared.error)
        return false
      }

      const sceneTitle = stripExtension(codeDockFileName).trim() || 'Cena'
      openOrReplaceSceneByTitle(sceneTitle, createEmptyCodeToCanvasScene())

      setRuntime({
        packFolder,
        sceneTitle,
        steps: prepared.steps,
        parseRegistry: prepared.parseRegistry,
        typeIndex: prepared.typeIndex,
        initialWarnings: prepared.warnings,
      })
      setStepIndex(0)
      setVerdicts([])
      setPendingVerdict(null)
      setWrongDescription('')
      setSummary(null)
      setPhase('running')
      setCodeToNodeGraphPackFolder(packFolder)
      return true
    },
    [codeDockFileName, codeText, openOrReplaceSceneByTitle, packFolderBySchemaId, registry],
  )

  const applyThroughIndex = useCallback(
    (activeRuntime: WizardRuntime, throughIndex: number, hydrate: boolean) => {
      const { scene, warnings, builder } = buildSceneThroughSteps(
        registry,
        activeRuntime.typeIndex,
        activeRuntime.parseRegistry,
        activeRuntime.initialWarnings,
        activeRuntime.steps,
        throughIndex,
        { hydrate },
      )

      openOrReplaceSceneByTitle(activeRuntime.sceneTitle, scene)

      const step = activeRuntime.steps[throughIndex]
      if (step) {
        const focusIds = getStepFocusNodeIds(step, builder.parsedToCanvas)
        if (focusIds.length > 0) {
          selectNode(focusIds[0]!)
          focusNodes(focusIds)
        }
      }

      return { scene, warnings, builder }
    },
    [focusNodes, openOrReplaceSceneByTitle, registry, selectNode],
  )

  const onAdvance = useCallback(() => {
    if (phase !== 'running' || !runtime || pendingVerdict === null) {
      return
    }

    const step = runtime.steps[stepIndex]
    if (!step) {
      return
    }

    const verdictEntry: StepVerdict = {
      stepId: step.id,
      verdict: pendingVerdict,
      ...(pendingVerdict === 'wrong' && wrongDescription.trim()
        ? { wrongDescription: wrongDescription.trim() }
        : {}),
    }

    const nextVerdicts = [...verdicts, verdictEntry]
    setVerdicts(nextVerdicts)

    const isLast = stepIndex >= runtime.steps.length - 1

    if (isLast) {
      const { scene, warnings, builder } = buildSceneThroughSteps(
        registry,
        runtime.typeIndex,
        runtime.parseRegistry,
        runtime.initialWarnings,
        runtime.steps,
        stepIndex,
        { hydrate: false },
      )
      const finalScene = finalizeCodeToCanvasScene(scene)
      openOrReplaceSceneByTitle(runtime.sceneTitle, finalScene)

      const focusIds = getStepFocusNodeIds(step, builder.parsedToCanvas)
      if (focusIds.length > 0) {
        selectNode(focusIds[0]!)
        focusNodes(focusIds)
      }

      const reviewSummary = formatWizardSummary(runtime.steps, nextVerdicts)
      setSummary({
        ...reviewSummary,
        buildWarnings: warnings,
      })
      setPhase('done')
      setPendingVerdict(null)
      setWrongDescription('')
      return
    }

    applyThroughIndex(runtime, stepIndex, false)
    setStepIndex(stepIndex + 1)
    setPendingVerdict(null)
    setWrongDescription('')
  }, [
    applyThroughIndex,
    focusNodes,
    openOrReplaceSceneByTitle,
    pendingVerdict,
    phase,
    registry,
    runtime,
    selectNode,
    stepIndex,
    verdicts,
    wrongDescription,
  ])

  const onCancel = useCallback(() => {
    resetWizard()
  }, [resetWizard])

  const currentStep = runtime?.steps[stepIndex]
  const stepLabel = currentStep ? formatStepLabel(currentStep) : ''
  const canAdvance =
    phase === 'running' &&
    pendingVerdict !== null &&
    (pendingVerdict === 'correct' || wrongDescription.trim().length > 0)

  const controller = useMemo<CodeToCanvasWizardController>(
    () => ({
      open: phase === 'running' || phase === 'done',
      phase,
      stepIndex,
      totalSteps: runtime?.steps.length ?? 0,
      stepLabel,
      verdict: pendingVerdict,
      wrongDescription,
      setVerdict: setPendingVerdict,
      setWrongDescription,
      canAdvance,
      isLastStep: runtime ? stepIndex >= runtime.steps.length - 1 : false,
      summary: phase === 'done' ? summary : null,
      onAdvance,
      onCancel,
    }),
    [
      canAdvance,
      onAdvance,
      onCancel,
      pendingVerdict,
      phase,
      runtime,
      stepIndex,
      stepLabel,
      summary,
      wrongDescription,
    ],
  )

  return { startWizard, controller }
}
