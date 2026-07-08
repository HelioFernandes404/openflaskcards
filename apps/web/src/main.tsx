import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from '@tanstack/react-router'
import { queryClient } from '@/shared/lib/query-client'
import { DevTools } from '@/shared/components/DevTools'
import './index.css'

function loadRuntimeConfig(): Promise<void> {
  if (import.meta.env.DEV) {
    return Promise.resolve()
  }

  if (typeof window !== 'undefined' && window.__OPENFLASKCARDS_CONFIG__) {
    return Promise.resolve()
  }

  return new Promise((resolve) => {
    const existingScript = document.querySelector<HTMLScriptElement>(
      'script[data-openflaskcards-runtime-config]',
    )

    if (existingScript) {
      if (existingScript.dataset.loaded === 'true') {
        resolve()
        return
      }

      existingScript.addEventListener('load', () => resolve(), { once: true })
      existingScript.addEventListener('error', () => resolve(), { once: true })
      return
    }

    const script = document.createElement('script')
    script.src = '/runtime-config.js'
    script.async = false
    script.dataset.openflashcardsRuntimeConfig = 'true'
    script.addEventListener(
      'load',
      () => {
        script.dataset.loaded = 'true'
        resolve()
      },
      { once: true },
    )
    script.addEventListener('error', () => resolve(), { once: true })
    document.head.appendChild(script)
  })
}

async function enableMocking(): Promise<void> {
  if (!import.meta.env.DEV || import.meta.env.VITE_MSW !== 'true') {
    return
  }
  const { worker } = await import('@/mocks/browser')
  await worker.start({ onUnhandledRequest: 'bypass' })
}

async function bootstrap() {
  await loadRuntimeConfig()
  await enableMocking()

  const [
    { router },
    { AuthProvider },
    { NotificationProvider },
    { StudyDataProvider },
    { StudyPlanProvider },
    { ErrorBoundary },
  ] = await Promise.all([
    import('./router.tsx'),
    import('@/features/auth/hooks/useAuth'),
    import('@/shared/providers/NotificationProvider'),
    import('@/features/study/providers/StudyDataProvider'),
    import('@/features/study-plans/providers/StudyPlanProvider'),
    import('@/shared/components/ErrorBoundary'),
  ])

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <ErrorBoundary>
          <AuthProvider>
            <NotificationProvider>
              <StudyDataProvider>
                <StudyPlanProvider>
                  <RouterProvider router={router} />
                  <DevTools router={router} />
                </StudyPlanProvider>
              </StudyDataProvider>
            </NotificationProvider>
          </AuthProvider>
        </ErrorBoundary>
      </QueryClientProvider>
    </StrictMode>,
  )
}

void bootstrap()
