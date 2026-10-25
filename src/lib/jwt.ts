import type { Role } from './api'

export interface JwtClaims {
  sub: string
  nickname: string
  role: Role
  exp: number
}

// Claims are read unverified and only drive UI hints (e.g. showing the Admin link); the API enforces authorization.
export function decodeJwt(token: string): JwtClaims {
  const payload = token.split('.')[1]
  const binary = atob(payload.replace(/-/g, '+').replace(/_/g, '/'))
  const json = new TextDecoder().decode(Uint8Array.from(binary, (char) => char.charCodeAt(0)))
  return JSON.parse(json) as JwtClaims
}

export function isExpired(claims: JwtClaims): boolean {
  return Date.now() >= claims.exp * 1000
}
