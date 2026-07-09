export interface LoginRequest {
  email: string
  password: string
}

export interface RegisterRequest {
  email: string
  password: string
  nickname: string
  name?: string
}

// The refresh token is never present here — the server sets it as an
// httpOnly cookie (Set-Cookie), not in the JSON body. See
// apps/api/internal/auth/handler.go.
export interface AuthResponse {
  access_token: string
  token_type: string
  expires_in: number
}

export type RefreshTokenResponse = AuthResponse
