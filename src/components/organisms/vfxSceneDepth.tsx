import {
  createContext,
  useContext,
  useLayoutEffect,
  useMemo,
  useRef,
  type ReactNode,
} from 'react'

import { useFBO } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import {
  DepthTexture,
  MeshDepthMaterial,
  type Camera,
  type DepthTexture as DepthTextureType,
  type WebGLRenderer,
} from 'three'
import type { Scene } from 'three'

/** Camada só para VFX — excluída do prepass de depth (chão + personagem ficam em 0). */
export const VFX_RENDER_LAYER = 1

const SceneDepthContext = createContext<DepthTextureType | null>(null)

export function useVfxSceneDepthTexture(): DepthTextureType | null {
  return useContext(SceneDepthContext)
}

const depthOverride = new MeshDepthMaterial()

function renderSceneDepth(
  gl: WebGLRenderer,
  scene: Scene,
  camera: Camera,
  target: ReturnType<typeof useFBO>,
) {
  const prevTarget = gl.getRenderTarget()
  const prevOverride = scene.overrideMaterial
  const prevMask = camera.layers.mask

  camera.layers.set(0)
  camera.layers.disable(VFX_RENDER_LAYER)
  scene.overrideMaterial = depthOverride

  gl.setRenderTarget(target)
  gl.clear()
  gl.render(scene, camera)

  scene.overrideMaterial = prevOverride
  camera.layers.mask = prevMask
  gl.setRenderTarget(prevTarget)
}

type VfxSceneDepthProviderProps = {
  enabled: boolean
  children: ReactNode
}

export function VfxSceneDepthProvider({ enabled, children }: VfxSceneDepthProviderProps) {
  const { gl, scene, camera, size } = useThree()
  const w = Math.max(1, size.width)
  const h = Math.max(1, size.height)

  const depthTexture = useMemo(() => new DepthTexture(w, h), [w, h])

  const fbo = useFBO(w, h, {
    depthBuffer: true,
    depthTexture,
  })

  const enabledRef = useRef(enabled)
  enabledRef.current = enabled

  useLayoutEffect(() => {
    fbo.setSize(w, h)
    depthTexture.image.width = w
    depthTexture.image.height = h
    depthTexture.needsUpdate = true
  }, [depthTexture, fbo, h, w])

  useFrame(() => {
    if (!enabledRef.current) return
    renderSceneDepth(gl, scene, camera, fbo)
  }, -2)

  const texture = enabled ? fbo.depthTexture : null

  return <SceneDepthContext.Provider value={texture}>{children}</SceneDepthContext.Provider>
}