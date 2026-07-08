import { Component, type ErrorInfo, type ReactNode } from 'react'
import { AlertCircle } from 'lucide-react'
import { Button } from '@/shared/components/button'
import { getLastRequestId } from '@/shared/services/apiLogger'

interface ErrorBoundaryProps {
  children: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
}

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { hasError: false }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    const requestId = getLastRequestId()
    console.error('Unhandled render error', {
      error,
      componentStack: info.componentStack,
      requestId,
    })
  }

  private handleReload = (): void => {
    window.location.reload()
  }

  render(): ReactNode {
    if (!this.state.hasError) {
      return this.props.children
    }

    const requestId = getLastRequestId()

    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-surface text-on-surface">
        <div className="w-full max-w-md rounded-lg border border-outline bg-surface-container p-6 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-danger-50">
            <AlertCircle
              className="text-danger-800"
              size={24}
              strokeWidth={1.5}
            />
          </div>
          <h1 className="text-xl font-semibold mb-2">Something went wrong</h1>
          <p className="text-sm text-on-surface-variant mb-4">
            The app hit an unexpected error. Reload the page to continue.
          </p>
          {requestId && (
            <p className="text-xs text-on-surface-variant mb-4 font-mono">
              Request ID: {requestId}
            </p>
          )}
          <Button type="button" onClick={this.handleReload}>
            Reload page
          </Button>
        </div>
      </div>
    )
  }
}
