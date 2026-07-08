# Auth Feature

## Responsibility

Manages user authentication and authorization throughout the application.

## Components

- `ProtectedRoute` - Route wrapper that requires authentication

## Pages

- `LoginPage` - User login form and authentication
- `RegisterPage` - New user registration form

## Hooks

- `useAuth` - Authentication context and state management

## Services

- `AuthService` - API calls for login, register, logout, session management

## Types

- `auth.ts` - TypeScript types for auth requests/responses (LoginRequest, RegisterRequest, AuthResponse)

## Dependencies

- LocalStorage for token persistence
- Axios for API calls

## Usage Example

```tsx
import { useAuth } from '@/features/auth/hooks/useAuth'

function MyComponent() {
  const { user, login, logout } = useAuth()
  // ...
}
```
