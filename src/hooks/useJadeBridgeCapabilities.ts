import { useEffect, useState } from 'react'

import {
  fetchJadeBridgeCapabilities,
  getJadeBridgeBaseForHost,
  type JadeBridgeCapabilities,
} from '@/core/jadeBridgeApi'
import { setJadeHttpBridgeBase } from '@jade/lib/jadeHttpBridgeClient'

export function useJadeBridgeCapabilities() {
  const [capabilities, setCapabilities] = useState<JadeBridgeCapabilities | null>(null)
  const [loading, setLoading] = useState(true)

  const base = getJadeBridgeBaseForHost()
  const httpBridgeEnabled =
    capabilities?.provider === 'jade-http-bridge' || capabilities?.provider === 'mock-bridge'
  const features = capabilities?.features
  const hashBridgeEnabled = features?.hashCheck === true
  const convertToBinEnabled = features?.convertToBin === true
  const unhashTextEnabled = features?.unhashText === true
  const isMockBridge = capabilities?.provider === 'mock-bridge'
  const libraryBridgeEnabled = features?.library === true
  const updatesBridgeEnabled = features?.updates === true
  const behaviorBridgeEnabled = features?.behavior === true
  const materialOverrideEnabled = features?.materialOverride === true

  useEffect(() => {
    setJadeHttpBridgeBase(base)
    if (!base) {
      setCapabilities(null)
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)
    void fetchJadeBridgeCapabilities().then((caps) => {
      if (!cancelled) {
        setCapabilities(caps)
        setLoading(false)
      }
    })

    return () => {
      cancelled = true
    }
  }, [base])

  return {
    base,
    behaviorBridgeEnabled,
    capabilities,
    convertToBinEnabled,
    features,
    hashBridgeEnabled,
    httpBridgeEnabled,
    isMockBridge,
    libraryBridgeEnabled,
    loading,
    materialOverrideEnabled,
    unhashTextEnabled,
    updatesBridgeEnabled,
  }
}
