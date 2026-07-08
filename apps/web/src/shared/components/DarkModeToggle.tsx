import { Moon, Sun } from 'lucide-react'
import { Button } from './button'

interface DarkModeToggleProps {
  darkMode: boolean
  setDarkMode: (value: boolean) => void
}

export function DarkModeToggle({ darkMode, setDarkMode }: DarkModeToggleProps) {
  return (
    <div className="fixed bottom-6 right-6 z-50">
      <Button
        size="icon"
        onClick={() => setDarkMode(!darkMode)}
        className="w-12 h-12 rounded-full bg-surface-container border border-outline text-on-surface"
        variant="neutral"
      >
        {darkMode ? <Sun size={24} /> : <Moon size={24} />}
      </Button>
    </div>
  )
}
