import { useEffect, useMemo, useRef, useState } from 'react'



import {

  createCompactElementCanvasVisibility,

  type CompactElementCanvasVisibility,

} from '@/core/canvasNodePresentation'

import type { CanvasScene } from '@/core/canvasScene'

import {

  computeCompactVisibilityInWorker,

  shouldUseSceneComputeWorker,

} from '@/core/sceneComputeWorkerClient'



function syncCompactVisibility(

  scene: CanvasScene,

  lightModeDefaultFirst: boolean,

): CompactElementCanvasVisibility {

  return createCompactElementCanvasVisibility(scene, { lightModeDefaultFirst })

}



function sceneCompactVisibilityKey(scene: CanvasScene, lightModeDefaultFirst: boolean): string {

  const blockViewDigest = scene.nodes

    .map((node) => {

      if (!node.blockElementView) {

        return ''

      }

      return `${node.id}:${JSON.stringify(node.blockElementView)}`

    })

    .join('\u0001')

  const elementViewDigest = scene.nodes

    .map((node) => {

      if (!node.node.elementView) {

        return ''

      }

      return `${node.id}:${JSON.stringify(node.node.elementView)}`

    })

    .join('\u0001')



  return `${lightModeDefaultFirst ? '1' : '0'}:${scene.nodes.length}:${scene.connections.length}:${blockViewDigest}:${elementViewDigest}:${scene.nodes.map((node) => node.id).join('\0')}`

}



/** Visibilidade compacta — Web Worker para cenas grandes; fallback síncrono se falhar. */

export function useCompactElementVisibility(

  scene: CanvasScene,

  lightModeDefaultFirst: boolean,

): CompactElementCanvasVisibility {

  const sceneKey = useMemo(

    () => sceneCompactVisibilityKey(scene, lightModeDefaultFirst),

    [lightModeDefaultFirst, scene.connections.length, scene.nodes, scene.nodes.length],

  )



  const [visibility, setVisibility] = useState<CompactElementCanvasVisibility>(() =>

    syncCompactVisibility(scene, lightModeDefaultFirst),

  )



  const requestGenerationRef = useRef(0)



  useEffect(() => {

    const syncResult = syncCompactVisibility(scene, lightModeDefaultFirst)

    setVisibility(syncResult)



    if (!shouldUseSceneComputeWorker(scene.nodes.length)) {

      return

    }



    const generation = ++requestGenerationRef.current

    let cancelled = false



    void computeCompactVisibilityInWorker(scene, lightModeDefaultFirst).then((next) => {

      if (cancelled || generation !== requestGenerationRef.current) {

        return

      }



      setVisibility(next)

    })



    return () => {

      cancelled = true

    }

  }, [lightModeDefaultFirst, sceneKey])



  return visibility

}


