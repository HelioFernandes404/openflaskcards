import { Link, Outlet, useMatchRoute } from '@tanstack/react-router'
import { useEffect } from 'react'
import {
  Layers,
  LayoutDashboard,
  Database,
  Settings,
  User,
  Plus,
  Sparkles,
  StickyNote,
  ListChecks,
  KanbanSquare,
  Music2,
} from 'lucide-react'
import { cn } from '@/shared/utils'
import { Button } from '@/shared/components/button'
import { Separator } from '@/shared/components/separator'
import { Avatar, AvatarFallback } from '@/shared/components/avatar'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { useStudyData } from '@/features/study/providers/StudyDataProvider'
import { prefetchBrowseData } from '@/features/cards/services/browsePrefetch'
const navLinkClass =
  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors cursor-pointer'
const navLinkActiveClass = 'bg-surface-container-high text-on-surface'
const navLinkInactiveClass =
  'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'

const mobileNavLinkClass =
  'flex flex-1 flex-col items-center gap-1 py-2 text-[10px] font-medium transition-colors cursor-pointer min-w-0 px-0.5'
const mobileNavLinkActiveClass = 'text-on-surface'
const mobileNavLinkInactiveClass = 'text-on-surface-variant'

function UserInitials({ email }: { email: string }) {
  const initials = email.slice(0, 2).toUpperCase()
  return (
    <Avatar className="size-8">
      <AvatarFallback className="text-xs">{initials}</AvatarFallback>
    </Avatar>
  )
}

const navItems = [
  {
    to: '/',
    label: 'Home',
    mobileLabel: 'Home',
    icon: LayoutDashboard,
    end: true,
  },
  {
    to: '/cards/browse',
    label: 'Browse Cards',
    mobileLabel: 'Browse',
    icon: Database,
    end: false,
  },
  {
    to: '/letters',
    label: 'Letters',
    mobileLabel: 'Letters',
    icon: Music2,
    end: false,
  },
  {
    to: '/notes',
    label: 'Notes',
    mobileLabel: 'Notes',
    icon: StickyNote,
    end: false,
  },
  {
    to: '/study-plans',
    label: 'Study Plans',
    mobileLabel: 'Plans',
    icon: ListChecks,
    end: false,
  },
  {
    to: '/settings/algorithm',
    label: 'Algorithm',
    mobileLabel: 'FSRS',
    icon: Settings,
    end: false,
  },
  {
    to: '/profile',
    label: 'Profile',
    mobileLabel: 'Profile',
    icon: User,
    end: false,
  },
  {
    to: '/helps/prompt',
    label: 'Prompt Help',
    mobileLabel: 'Prompt',
    icon: Sparkles,
    end: false,
  },
  {
    to: '/kanban',
    label: 'Kanban',
    mobileLabel: 'Kanban',
    icon: KanbanSquare,
    end: false,
  },
] as const

const mobileNavItems = [
  navItems[0],
  navItems[1],
  navItems[2],
  {
    to: '/decks/create',
    label: 'New Deck',
    mobileLabel: 'New',
    icon: Plus,
    end: false,
  } as const,
  navItems[5],
  navItems[6],
]

export function AppShell() {
  const { user } = useAuth()
  const { studyService } = useStudyData()
  const matchRoute = useMatchRoute()
  const isBrowseRoute = Boolean(matchRoute({ to: '/cards/browse' }))

  useEffect(() => {
    prefetchBrowseData(studyService)
  }, [studyService])

  const prefetchBrowse = () => prefetchBrowseData(studyService)

  return (
    <div
      className={cn(
        'flex',
        isBrowseRoute ? 'h-screen overflow-hidden' : 'min-h-screen',
      )}
    >
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-60 shrink-0 flex-col border-r border-outline bg-surface-container-low">
        <div className="flex items-center gap-3 p-5">
          <div className="flex size-10 items-center justify-center rounded-lg bg-primary border border-outline">
            <Layers size={22} className="text-on-primary" strokeWidth={1.5} />
          </div>
          <div className="min-w-0">
            <p className="font-display font-semibold text-on-surface truncate">
              Study Decker
            </p>
            <p className="text-xs text-on-surface-variant truncate">
              Spaced Repetition System
            </p>
          </div>
        </div>

        <Separator />

        <nav className="flex-1 space-y-1 p-3" aria-label="Main navigation">
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <Link
              key={to}
              to={to}
              activeOptions={{ exact: end }}
              className={navLinkClass}
              activeProps={{ className: navLinkActiveClass }}
              inactiveProps={{ className: navLinkInactiveClass }}
              onMouseEnter={to === '/cards/browse' ? prefetchBrowse : undefined}
              onFocus={to === '/cards/browse' ? prefetchBrowse : undefined}
            >
              <Icon size={18} />
              {label}
            </Link>
          ))}
        </nav>

        <div className="p-3 space-y-2">
          <p className="px-3 text-[11px] leading-snug text-on-surface-variant">
            Selecione um texto e pressione{' '}
            <kbd className="rounded border border-outline bg-surface-container px-1 py-0.5 font-mono text-[10px]">
              Alt+S
            </kbd>{' '}
            para ouvir (ou Alt+Shift+S se o atalho conflitar).
          </p>
          <Button className="w-full gap-2" asChild>
            <Link to="/decks/create">
              <Plus size={16} />
              New Deck
            </Link>
          </Button>

          {user && (
            <Link
              to="/profile"
              className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-surface-container transition-colors cursor-pointer"
            >
              <UserInitials email={user.email} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-on-surface truncate">
                  {user.email}
                </p>
              </div>
            </Link>
          )}
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col min-w-0 min-h-0 pb-16 md:pb-0">
        <main
          className={cn(
            'flex-1 w-full min-h-0',
            isBrowseRoute
              ? 'flex flex-col overflow-hidden p-0 max-w-none'
              : 'p-4 md:p-8 max-w-7xl mx-auto',
          )}
        >
          <Outlet />
        </main>
      </div>

      {/* Mobile bottom nav */}
      <nav
        className="md:hidden fixed bottom-0 inset-x-0 z-40 flex border-t border-outline bg-surface-container-low pb-[env(safe-area-inset-bottom)]"
        aria-label="Mobile navigation"
      >
        {mobileNavItems.map(({ to, mobileLabel, icon: Icon, end }) => (
          <Link
            key={to}
            to={to}
            activeOptions={{ exact: end }}
            className={mobileNavLinkClass}
            activeProps={{ className: mobileNavLinkActiveClass }}
            inactiveProps={{ className: mobileNavLinkInactiveClass }}
          >
            <Icon size={20} />
            <span className="truncate max-w-full">{mobileLabel}</span>
          </Link>
        ))}
      </nav>
    </div>
  )
}
