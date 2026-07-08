import type { AnyRouter } from '@tanstack/react-router'
import { lazy, Suspense } from 'react'

const QueryDevtools = lazy(() =>
  import('@tanstack/react-query-devtools').then((m) => ({
    default: m.ReactQueryDevtools,
  })),
)
const RouterDevtools = lazy(() =>
  import('@tanstack/react-router-devtools').then((m) => ({
    default: m.TanStackRouterDevtools,
  })),
)

export function DevTools({ router }: { router: AnyRouter }) {
  if (!import.meta.env.DEV) {
    return null
  }

  return (
    <Suspense fallback={null}>
      <QueryDevtools buttonPosition="bottom-left" />
      <RouterDevtools router={router} position="bottom-right" />
    </Suspense>
  )
}
