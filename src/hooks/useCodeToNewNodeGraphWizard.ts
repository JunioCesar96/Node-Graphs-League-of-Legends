import { useCallback, useMemo, useState } from 'react'

import { showAppAlert } from '@/messenger_popup/appMessenger'
import type { CanvasScene } from '@/core/canvasScene'
import { createEmptyNewNodeGraphScene, prepareCodeToNewNodeGraph } from '@/core/codeToNewNodeGraph'
import {
  buildNewNodeGraphThroughSteps,
  formatNewNodeGraphStepLabel,
  formatNewNodeGraphWizardSummary,
  getNewNodeGraphStepFocusNodeIds,
  planNewNodeGraphSteps,
  type NewNodeGraphStep,
  type NewNodeGraphStepVerdict,
} from '@/core/codeToNewNodeGraphSteps'
import { setCodeToNewNodeGraphPackFolder } from '@/core/nodeConfigurationPreference'
import type { NodeSchemaDefinition } from '@/core/nodeSchema'
import { stripExtension } from '@/core/sceneTabsStorage'

export type CodeToNewNodeGraphWizardPhase = 'idle' | 'running' | 'done'

export type CodeToNewNodeGraphWizardSummary = {
  wrongCount: number
  lines: string[]
  buildWarnings: string[]
}

export type CodeToNewNodeGraphWizardController = {
  open: boolean
  phase: CodeToNewNodeGraphWizardPhase
  stepIndex: number
  totalSteps: number
  stepLabel: string
  verdict: 'correct' | 'wrong' | null
  wrongDescription: string
  setVerdict: (verdict: 'correct' | 'wrong') => void
  setWrongDescription: (value: string) => void
  canAdvance: boolean
  isLastStep: boolean
  summary: CodeToNewNodeGraphWizardSummary | null
  onAdvance: () => void
  onCancel: () => void
}

type WizardRuntime = {
  folder: string
  sceneTitle: string
  steps: NewNodeGraphStep[]
  parseRegistry: Map<string, import('@/core/classGroupRitualStackParser').MutableClassGroupSchema>
  initialWarnings: string[]
}

export type UseCodeToNewNodeGraphWizardParams = {
  codeText: string
  codeDockFileName: string
  persistPack: (
    folder: string,
    schemas: NodeSchemaDefinition[],
    warnings: string[],
    rootSchemaIds: string[],
    options?: { silent?: boolean },
  ) => Promise<void>
  openOrReplaceSceneByTitle: (title: string, scene: CanvasScene) => void
  selectNode: (nodeId: string) => void
  focusNodes: (nodeIds: string[]) => void
  onSceneBuilt?: (scene: CanvasScene) => void
}

export function useCodeToNewNodeGraphWizard({
  codeText,
  codeDockFileName,
  persistPack,
  openOrReplaceSceneByTitle,
  selectNode,
  focusNodes,
  onSceneBuilt,
}: UseCodeToNewNodeGraphWizardParams): {
  startWizard: (folder: string) => Promise<boolean>
  controller: CodeToNewNodeGraphWizardController
} {
  const [phase, setPhase] = useState<CodeToNewNodeGraphWizardPhase>('idle')
  const [runtime, setRuntime] = useState<WizardRuntime | null>(null)
  const [stepIndex, setStepIndex] = useState(0)
  const [verdicts, setVerdicts] = useState<NewNodeGraphStepVerdict[]>([])
  const [pendingVerdict, setPendingVerdict] = useState<'correct' | 'wrong' | null>(null)
  const [wrongDescription, setWrongDescription] = useState('')
  const [summary, setSummary] = useState<CodeToNewNodeGraphWizardSummary | null>(null)

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
    async (folder: string): Promise<boolean> => {
      const prepared = prepareCodeToNewNodeGraph(codeText)

      if (!prepared.ok) {
        showAppAlert(prepared.error)
        return false
      }

      await persistPack(folder, prepared.schemas, prepared.warnings, prepared.rootSchemaIds, {
        silent: true,
      })

      const steps = planNewNodeGraphSteps(prepared.parseRegistry)
      if (steps.length === 0) {
        showAppAlert('Nenhum passo de construção gerado.')
        return false
      }

      const sceneTitle = stripExtension(codeDockFileName).trim() || 'Cena'
      openOrReplaceSceneByTitle(sceneTitle, createEmptyNewNodeGraphScene())

      setRuntime({
        folder,
        sceneTitle,
        steps,
        parseRegistry: prepared.parseRegistry,
        initialWarnings: prepared.warnings,
      })
      setStepIndex(0)
      setVerdicts([])
      setPendingVerdict(null)
      setWrongDescription('')
      setSummary(null)
      setPhase('running')
      setCodeToNewNodeGraphPackFolder(folder)
      return true
    },
    [codeDockFileName, codeText, openOrReplaceSceneByTitle, persistPack],
  )

  const applyThroughIndex = useCallback(
    (activeRuntime: WizardRuntime, throughIndex: number, hydrate: boolean) => {
      const { scene, warnings, builder } = buildNewNodeGraphThroughSteps(
        activeRuntime.parseRegistry,
        activeRuntime.initialWarnings,
        activeRuntime.steps,
        throughIndex,
        { hydrate },
      )

      openOrReplaceSceneByTitle(activeRuntime.sceneTitle, scene)

      const step = activeRuntime.steps[throughIndex]
      if (step) {
        const focusIds = getNewNodeGraphStepFocusNodeIds(step, builder.parsedToCanvas)
        if (focusIds.length > 0) {
          selectNode(focusIds[0]!)
          focusNodes(focusIds)
        }
      }

      return { scene, warnings, builder }
    },
    [focusNodes, openOrReplaceSceneByTitle, selectNode],
  )

  const onAdvance = useCallback(() => {
    if (phase !== 'running' || !runtime || pendingVerdict === null) {
      return
    }

    const step = runtime.steps[stepIndex]
    if (!step) {
      return
    }

    const verdictEntry: NewNodeGraphStepVerdict = {
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
      const { scene, warnings, builder } = buildNewNodeGraphThroughSteps(
        runtime.parseRegistry,
        runtime.initialWarnings,
        runtime.steps,
        stepIndex,
        { hydrate: true },
      )

      openOrReplaceSceneByTitle(runtime.sceneTitle, scene)
      onSceneBuilt?.(scene)

      const focusIds = getNewNodeGraphStepFocusNodeIds(step, builder.parsedToCanvas)
      if (focusIds.length > 0) {
        selectNode(focusIds[0]!)
        focusNodes(focusIds)
      }

      setSummary({
        ...formatNewNodeGraphWizardSummary(runtime.steps, nextVerdicts),
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
    onSceneBuilt,
    openOrReplaceSceneByTitle,
    pendingVerdict,
    phase,
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
  const stepLabel = currentStep ? formatNewNodeGraphStepLabel(currentStep) : ''
  const canAdvance =
    phase === 'running' &&
    pendingVerdict !== null &&
    (pendingVerdict === 'correct' || wrongDescription.trim().length > 0)

  const controller = useMemo<CodeToNewNodeGraphWizardController>(
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
