# Algorithm Settings Feature

## Responsibility

Manages FSRS v6 algorithm parameters and desired retention configuration for individual users.

## Components

- `DesiredRetentionSlider` - Slider to adjust target retention rate (0-100%)
- `PresetSelector` - Quick selection of predefined FSRS parameter sets
- `ParameterSection` - Manual editing of 19 FSRS parameters

## Pages

- `AlgorithmSettings` - Full settings interface for algorithm customization

## Hooks

- `useAlgorithmSettings` - Hook for loading and saving FSRS parameters

## Constants

- `fsrsPresets.ts` - Predefined FSRS parameter sets (default, easy, hard, etc.)

## Types

(Types handled by User interface in shared or auth)

## Dependencies

- Auth feature (user-specific settings)
- Study feature (settings affect review scheduling)

## FSRS Parameters

19 parameters that control the spaced repetition algorithm:

- Request stability, Difficulty weights
- Stability weights for different states
- More info: <https://github.com/open-spaced-repetition/fsrs-rs>

## Usage Example

```tsx
import { useAlgorithmSettings } from '@/features/algorithm-settings/hooks/useAlgorithmSettings'

function MyComponent() {
  const { parameters, desiredRetention, saveSettings } = useAlgorithmSettings()
  // ...
}
```
