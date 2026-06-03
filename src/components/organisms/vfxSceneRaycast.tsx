import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  type MutableRefObject,
  type ReactNode,
} from 'react'

import type { Object3D } from 'three'

type VfxSceneRaycastContextValue = {
  rootsRef: MutableRefObject<Object3D[]>
  registerRaycastRoot: (id: string, object: Object3D | null) => void
}

const VfxSceneRaycastContext = createContext<VfxSceneRaycastContextValue | null>(null)

export function useVfxSceneRaycast(): VfxSceneRaycastContextValue | null {
  return useContext(VfxSceneRaycastContext)
}

export function VfxSceneRaycastProvider({
  children,
  rootsRef: externalRootsRef,
}: {
  children: ReactNode
  rootsRef: MutableRefObject<Object3D[]>
}) {
  const mapRef = useRef(new Map<string, Object3D>())

  const registerRaycastRoot = useCallback(
    (id: string, object: Object3D | null) => {
      if (object) mapRef.current.set(id, object)
      else mapRef.current.delete(id)
      externalRootsRef.current = [...mapRef.current.values()]
    },
    [externalRootsRef],
  )

  const value = useMemo(
    () => ({ rootsRef: externalRootsRef, registerRaycastRoot }),
    [externalRootsRef, registerRaycastRoot],
  )

  return <VfxSceneRaycastContext.Provider value={value}>{children}</VfxSceneRaycastContext.Provider>
}