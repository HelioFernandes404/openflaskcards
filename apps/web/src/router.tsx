import {
  Outlet,
  createRootRoute,
  createRoute,
  createRouter,
  lazyRouteComponent,
  redirect,
} from '@tanstack/react-router'
import { ProtectedRoute } from '@/features/auth/components/ProtectedRoute'
import { BrowseCards } from '@/features/cards/pages/BrowseCards'
import { AppShell } from '@/shared/layout/AppShell'

function RouteFallback() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center text-sm text-on-surface-variant">
      Loading...
    </div>
  )
}

const rootRoute = createRootRoute({
  component: () => (
    <div className="min-h-screen relative">
      <Outlet />
    </div>
  ),
})

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  component: lazyRouteComponent(
    () => import('@/features/auth/pages/LoginPage'),
    'LoginPage',
  ),
})

const registerRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/register',
  component: lazyRouteComponent(
    () => import('@/features/auth/pages/RegisterPage'),
    'RegisterPage',
  ),
})

const forgotPasswordRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/forgot-password',
  component: lazyRouteComponent(
    () => import('@/features/auth/pages/ForgotPasswordPage'),
    'ForgotPasswordPage',
  ),
})

interface ResetPasswordSearch {
  token?: string
}

const resetPasswordRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/reset-password',
  validateSearch: (search: Record<string, unknown>): ResetPasswordSearch => ({
    token: typeof search.token === 'string' ? search.token : undefined,
  }),
  component: lazyRouteComponent(
    () => import('@/features/auth/pages/ResetPasswordPage'),
    'ResetPasswordPage',
  ),
})

const protectedRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: 'protected',
  component: ProtectedRoute,
})

const shellRoute = createRoute({
  getParentRoute: () => protectedRoute,
  id: 'shell',
  component: AppShell,
})

const dashboardRoute = createRoute({
  getParentRoute: () => shellRoute,
  path: '/',
  component: lazyRouteComponent(
    () => import('@/features/dashboard/pages/Dashboard'),
    'Dashboard',
  ),
})

const profileRoute = createRoute({
  getParentRoute: () => shellRoute,
  path: '/profile',
  component: lazyRouteComponent(
    () => import('@/features/profile/pages/ProfilePage'),
    'ProfilePage',
  ),
})

const createDeckRoute = createRoute({
  getParentRoute: () => shellRoute,
  path: '/decks/create',
  component: lazyRouteComponent(
    () => import('@/features/decks/pages/CreateDeck'),
    'CreateDeck',
  ),
})

const notesListRoute = createRoute({
  getParentRoute: () => shellRoute,
  path: '/notes',
  component: lazyRouteComponent(
    () => import('@/features/notes/pages/NotesList'),
    'NotesList',
  ),
})

const noteCreateRoute = createRoute({
  getParentRoute: () => shellRoute,
  path: '/notes/create',
  component: lazyRouteComponent(
    () => import('@/features/notes/pages/NoteEditor'),
    'NoteEditor',
  ),
})

const noteViewRoute = createRoute({
  getParentRoute: () => shellRoute,
  path: '/notes/$noteId',
  component: lazyRouteComponent(
    () => import('@/features/notes/pages/NoteView'),
    'NoteView',
  ),
})

const noteEditRoute = createRoute({
  getParentRoute: () => shellRoute,
  path: '/notes/$noteId/edit',
  component: lazyRouteComponent(
    () => import('@/features/notes/pages/NoteEditor'),
    'NoteEditor',
  ),
})

const studyPlansListRoute = createRoute({
  getParentRoute: () => shellRoute,
  path: '/study-plans',
  component: lazyRouteComponent(
    () => import('@/features/study-plans/pages/StudyPlansList'),
    'StudyPlansList',
  ),
})

const studyPlanCreateRoute = createRoute({
  getParentRoute: () => shellRoute,
  path: '/study-plans/create',
  component: lazyRouteComponent(
    () => import('@/features/study-plans/pages/StudyPlanEditor'),
    'StudyPlanEditor',
  ),
})

const studyPlanViewRoute = createRoute({
  getParentRoute: () => shellRoute,
  path: '/study-plans/$planId',
  component: lazyRouteComponent(
    () => import('@/features/study-plans/pages/StudyPlanView'),
    'StudyPlanView',
  ),
})

const studyPlanEditRoute = createRoute({
  getParentRoute: () => shellRoute,
  path: '/study-plans/$planId/edit',
  component: lazyRouteComponent(
    () => import('@/features/study-plans/pages/StudyPlanEditor'),
    'StudyPlanEditor',
  ),
})

const lettersListRoute = createRoute({
  getParentRoute: () => shellRoute,
  path: '/letters',
  component: lazyRouteComponent(
    () => import('@/features/letters/pages/LettersList'),
    'LettersList',
  ),
})

const letterCreateRoute = createRoute({
  getParentRoute: () => shellRoute,
  path: '/letters/create',
  component: lazyRouteComponent(
    () => import('@/features/letters/pages/LetterEditor'),
    'LetterEditor',
  ),
})

const letterViewRoute = createRoute({
  getParentRoute: () => shellRoute,
  path: '/letters/$letterId',
  component: lazyRouteComponent(
    () => import('@/features/letters/pages/LetterView'),
    'LetterView',
  ),
})

const letterEditRoute = createRoute({
  getParentRoute: () => shellRoute,
  path: '/letters/$letterId/edit',
  component: lazyRouteComponent(
    () => import('@/features/letters/pages/LetterEditor'),
    'LetterEditor',
  ),
})

const kanbanRoute = createRoute({
  getParentRoute: () => shellRoute,
  path: '/kanban',
  component: lazyRouteComponent(
    () => import('@/features/kanban/pages/KanbanBoard'),
    'KanbanBoard',
  ),
})

const kanbanHelpRoute = createRoute({
  getParentRoute: () => shellRoute,
  path: '/kanban/help',
  component: lazyRouteComponent(
    () => import('@/features/kanban/pages/KanbanLoopHelp'),
    'KanbanLoopHelp',
  ),
})

const addCardsRoute = createRoute({
  getParentRoute: () => shellRoute,
  path: '/decks/$deckId/cards/add',
  component: lazyRouteComponent(
    () => import('@/features/cards/pages/AddCards'),
    'AddCards',
  ),
})

const importExportRoute = createRoute({
  getParentRoute: () => shellRoute,
  path: '/decks/$deckId/cards/import',
  component: lazyRouteComponent(
    () => import('@/features/cards/importExport/ImportExportPage'),
    'ImportExportPage',
  ),
})

const algorithmSettingsRoute = createRoute({
  getParentRoute: () => shellRoute,
  path: '/settings/algorithm',
  component: lazyRouteComponent(
    () => import('@/features/algorithm-settings/pages/AlgorithmSettings'),
    'AlgorithmSettings',
  ),
})

const browseCardsRoute = createRoute({
  getParentRoute: () => shellRoute,
  path: '/cards/browse',
  component: BrowseCards,
})

interface HelpPromptSearch {
  type?: string
  module?: string
  template?: string
}

const helpPromptRoute = createRoute({
  getParentRoute: () => shellRoute,
  path: '/helps/prompt',
  validateSearch: (search: Record<string, unknown>): HelpPromptSearch => ({
    type: typeof search.type === 'string' ? search.type : undefined,
    module: typeof search.module === 'string' ? search.module : undefined,
    template: typeof search.template === 'string' ? search.template : undefined,
  }),
  component: lazyRouteComponent(
    () => import('@/features/helps/pages/HelpPromptPage'),
    'HelpPromptPage',
  ),
})

const studySessionRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: '/decks/$deckId/study',
  component: lazyRouteComponent(
    () => import('@/features/study/pages/StudySession'),
    'StudySession',
  ),
})

const catchAllRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '$',
  beforeLoad: () => {
    throw redirect({ to: '/', replace: true })
  },
})

const routeTree = rootRoute.addChildren([
  loginRoute,
  registerRoute,
  forgotPasswordRoute,
  resetPasswordRoute,
  protectedRoute.addChildren([
    shellRoute.addChildren([
      dashboardRoute,
      profileRoute,
      createDeckRoute,
      notesListRoute,
      noteCreateRoute,
      noteViewRoute,
      noteEditRoute,
      studyPlansListRoute,
      studyPlanCreateRoute,
      studyPlanViewRoute,
      studyPlanEditRoute,
      lettersListRoute,
      letterCreateRoute,
      letterViewRoute,
      letterEditRoute,
      kanbanRoute,
      kanbanHelpRoute,
      addCardsRoute,
      importExportRoute,
      algorithmSettingsRoute,
      browseCardsRoute,
      helpPromptRoute,
    ]),
    studySessionRoute,
  ]),
  catchAllRoute,
])

export const router = createRouter({
  routeTree,
  defaultPendingComponent: RouteFallback,
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
