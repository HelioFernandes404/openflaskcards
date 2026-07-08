import { useState } from 'react'
import { PageHeader } from '@/shared/layout/PageHeader'
import { Button } from '@/shared/components/button'
import { ConfirmDialog } from '@/shared/components/confirm-dialog'
import { Spinner } from '@/shared/components/spinner'
import { useAlgorithmSettings } from '@/features/algorithm-settings/hooks/useAlgorithmSettings'
import { DesiredRetentionSlider } from '@/features/algorithm-settings/components/DesiredRetentionSlider'
import { PresetSelector } from '@/features/algorithm-settings/components/PresetSelector'
import { AdvancedParametersPanel } from '@/features/algorithm-settings/components/ParameterSection'
import { SaveStatusBadge } from '@/features/algorithm-settings/components/SaveStatusBadge'
import { OptimizationPanel } from '@/features/algorithm-settings/components/OptimizationPanel'
import { FsrsGuidePanel } from '@/features/algorithm-settings/components/FsrsGuidePanel'
import { ForgettingCurveChart } from '@/features/study/components/ForgettingCurveChart'

export function AlgorithmSettings() {
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const {
    retention,
    params,
    saveStatus,
    initialLoading,
    updateRetention,
    updateParams,
    applyPreset,
    resetToDefaults,
    optimizationStatus,
    lastOptimization,
    isOptimizing,
    runOptimization,
  } = useAlgorithmSettings()

  const safeParams = params.length > 0 ? params : []
  const exampleStability =
    safeParams.length >= 4
      ? (safeParams[0] + safeParams[1] + safeParams[2] + safeParams[3]) / 4
      : 5.0
  const safeRetention = retention != null && !isNaN(retention) ? retention : 0.9
  const w20 = safeParams.length >= 21 ? safeParams[20] : undefined
  const decay = w20 != null && w20 > 0 ? -w20 : undefined

  if (initialLoading) {
    return (
      <div className="max-w-7xl flex items-center justify-center py-24">
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <div className="max-w-7xl">
      <PageHeader
        title="Review scheduling"
        subtitle="Control how often cards come back for review"
        backTo="/"
        actions={<SaveStatusBadge status={saveStatus} />}
      />

      <div className="mb-6 rounded-lg border border-outline bg-surface-container-low px-4 py-3 text-sm text-on-surface-variant">
        FSRS schedules each card based on how well you remember it. These
        settings affect all your decks — changes save automatically.
      </div>

      <FsrsGuidePanel />

      <OptimizationPanel
        status={optimizationStatus}
        lastOptimization={lastOptimization}
        isOptimizing={isOptimizing}
        onOptimize={() => void runOptimization()}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <div className="space-y-6">
          <DesiredRetentionSlider
            value={safeRetention}
            onChange={updateRetention}
          />
          <PresetSelector
            activeRetention={safeRetention}
            onSelect={applyPreset}
          />
          <Button
            variant="neutral"
            onClick={() => setShowResetConfirm(true)}
            className="w-full"
          >
            Reset to recommended defaults
          </Button>
        </div>

        <div className="space-y-3">
          <div>
            <h2 className="font-semibold text-on-surface">
              Forgetting curve preview
            </h2>
            <p className="text-sm text-on-surface-variant mt-1">
              Shows how memory fades over time at your target retention. Higher
              retention schedules reviews sooner.
            </p>
          </div>
          <ForgettingCurveChart
            stability={exampleStability}
            desiredRetention={safeRetention}
            decay={decay}
          />
        </div>
      </div>

      <AdvancedParametersPanel
        parameters={safeParams}
        onChange={(index, value) => updateParams(index, value)}
      />

      <ConfirmDialog
        isOpen={showResetConfirm}
        onClose={() => setShowResetConfirm(false)}
        onConfirm={() => {
          resetToDefaults()
          setShowResetConfirm(false)
        }}
        title="Reset to recommended defaults?"
        message="This restores 90% target retention and the standard FSRS weights. Your current custom values will be replaced."
        confirmText="Reset"
        variant="warning"
      />
    </div>
  )
}
