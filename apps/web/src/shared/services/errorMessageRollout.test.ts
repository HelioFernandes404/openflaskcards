import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const projectRoot = resolve(__dirname, '../../..')

const filesWithoutRawErrorMessages = [
  'src/features/study/pages/StudySession.tsx',
  'src/features/algorithm-settings/hooks/useAlgorithmSettings.ts',
  'src/features/cards/importExport/hooks/useDeckCardsImport.ts',
  'src/features/cards/importExport/hooks/useDeckCardsExport.ts',
  'src/features/cards/importExport/hooks/useCsvParser.ts',
  'src/features/cards/hooks/useBrowseCardsViewModel.ts',
]

const forbiddenPatterns = [
  'err instanceof Error ? err.message',
  'error instanceof Error ? error.message',
]

describe('error message rollout', () => {
  it('removes raw Error.message passthrough from targeted user-facing files', () => {
    for (const relativePath of filesWithoutRawErrorMessages) {
      const source = readFileSync(resolve(projectRoot, relativePath), 'utf8')

      for (const pattern of forbiddenPatterns) {
        expect(
          source,
          `${relativePath} still contains "${pattern}"`,
        ).not.toContain(pattern)
      }
    }
  })
})
