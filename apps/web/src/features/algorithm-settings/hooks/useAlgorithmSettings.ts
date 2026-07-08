import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { ApiStudyService } from '@/features/study/services/ApiStudyService'
import type { Preset } from '@/features/algorithm-settings/constants/fsrsPresets'
import { PRESETS } from '@/features/algorithm-settings/constants/fsrsPresets'
import { normalizeFSRSWeights } from '@/features/algorithm-settings/constants/fsrsParameterInfo'
import { getUserFacingErrorMessage } from '@/shared/services/userFacingErrors'
import { useNotification } from '@/shared/providers/NotificationProvider'

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

/**
 * Debounce utility - delays function execution until after wait period
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number,
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null

  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}

export function useAlgorithmSettings() {
  const [retention, setRetention] = useState(0.9)
  const [params, setParams] = useState<number[]>([])
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const [error, setError] = useState<string | null>(null)
  const [initialLoading, setInitialLoading] = useState(true)
  const [optimizationStatus, setOptimizationStatus] = useState<string | null>(
    null,
  )
  const [lastOptimization, setLastOptimization] = useState<string | null>(null)
  const [isOptimizing, setIsOptimizing] = useState(false)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const studyService = useMemo(() => new ApiStudyService(), [])
  const { showToast } = useNotification()

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
  }, [])

  const loadUserSettings = useCallback(async () => {
    try {
      setInitialLoading(true)
      const currentUser = await studyService.getCurrentUser()
      setRetention(currentUser.desiredRetention ?? 0.9)
      setParams(normalizeFSRSWeights(currentUser.fsrsParameters))
      setOptimizationStatus(currentUser.optimizationStatus ?? 'idle')
      setLastOptimization(currentUser.lastOptimization ?? null)
      setError(null)
      setSaveStatus('saved')
    } catch (err) {
      const message = getUserFacingErrorMessage(err, {
        fallbackKey: "Couldn't load your algorithm settings. Please try again.",
      })
      setError(message)
      setSaveStatus('error')
      showToast(message, 'error')
      console.error('Failed to load settings:', err)
    } finally {
      setInitialLoading(false)
    }
  }, [studyService, showToast])

  useEffect(() => {
    loadUserSettings()
    return () => stopPolling()
  }, [loadUserSettings, stopPolling])

  const pollOptimizationStatus = useCallback(() => {
    stopPolling()
    pollRef.current = setInterval(() => {
      void (async () => {
        try {
          const currentUser = await studyService.getCurrentUser()
          const status = currentUser.optimizationStatus ?? 'idle'
          setOptimizationStatus(status)
          setLastOptimization(currentUser.lastOptimization ?? null)

          if (status === 'running') {
            return
          }

          stopPolling()
          setIsOptimizing(false)

          if (status === 'completed') {
            setRetention(currentUser.desiredRetention ?? 0.9)
            setParams(normalizeFSRSWeights(currentUser.fsrsParameters))
            showToast('FSRS optimization completed')
            return
          }
          if (status === 'insufficient_data') {
            showToast('Not enough review history to optimize yet', 'error')
            return
          }
          if (status === 'failed') {
            showToast('FSRS optimization failed', 'error')
          }
        } catch (err) {
          stopPolling()
          setIsOptimizing(false)
          console.error('Failed to poll optimization status:', err)
        }
      })()
    }, 2000)
  }, [showToast, stopPolling, studyService])

  const runOptimization = useCallback(async () => {
    setIsOptimizing(true)
    try {
      const result = await studyService.optimizeFSRS()
      setOptimizationStatus(result.status)
      pollOptimizationStatus()
    } catch (err) {
      setIsOptimizing(false)
      const message = getUserFacingErrorMessage(err, {
        fallbackKey: "Couldn't start FSRS optimization. Please try again.",
      })
      showToast(message, 'error')
    }
  }, [pollOptimizationStatus, showToast, studyService])

  const debouncedSave = useMemo(
    () =>
      debounce(async (newRetention: number, newParams: number[]) => {
        setSaveStatus('saving')
        try {
          await studyService.updateFSRSSettings({
            desiredRetention: newRetention,
            weights: newParams,
          })
          setSaveStatus('saved')
          setError(null)
          showToast('Settings saved successfully')
        } catch (err) {
          setSaveStatus('error')
          const message = getUserFacingErrorMessage(err, {
            fallbackKey:
              "Couldn't save your algorithm settings. Please try again.",
          })
          setError(message)
          showToast(message, 'error')
          console.error('Failed to save settings:', err)
        }
      }, 1000),
    [studyService, showToast],
  )

  const updateRetention = useCallback(
    (value: number) => {
      setRetention(value)
      setSaveStatus('saving')
      debouncedSave(value, params)
    },
    [params, debouncedSave],
  )

  const updateParams = useCallback(
    (index: number, value: number) => {
      const newParams = [...params]
      newParams[index] = value
      setParams(newParams)
      setSaveStatus('saving')
      debouncedSave(retention, newParams)
    },
    [params, retention, debouncedSave],
  )

  const applyPreset = useCallback(
    (preset: Preset) => {
      const normalizedParams = normalizeFSRSWeights(preset.params)
      setRetention(preset.retention)
      setParams(normalizedParams)
      setSaveStatus('saving')
      debouncedSave(preset.retention, normalizedParams)
    },
    [debouncedSave],
  )

  const resetToDefaults = useCallback(() => {
    applyPreset(PRESETS.balanced)
  }, [applyPreset])

  return {
    retention,
    params,
    saveStatus,
    initialLoading,
    error,
    updateRetention,
    updateParams,
    applyPreset,
    resetToDefaults,
    optimizationStatus,
    lastOptimization,
    isOptimizing,
    runOptimization,
  }
}
