export type Role = 'USER' | 'ADMIN'

export interface UserSummary {
  id: string
  nickname: string | null
  role: Role
  activated: boolean
  createdAt: string
  deletionRequestedAt: string | null
}

export interface CreatedUser {
  id: string
  activationKey: string
}

export interface MeUser {
  id: string
  nickname: string | null
  role: Role
  status: 'ACTIVE' | 'FROZEN'
  activated: boolean
  createdAt: string
  email: string | null
  phone: string | null
  firstName: string | null
  lastName: string | null
  addressLine1: string | null
  addressLine2: string | null
  postalCode: string | null
  city: string | null
  country: string | null
  deletionRequestedAt: string | null
}

export interface ProfileUpdate {
  email?: string
  addressLine1?: string
  addressLine2?: string
  postalCode?: string
  city?: string
  country?: string
}

class ApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

async function request<T>(path: string, options: RequestInit = {}, token?: string): Promise<T> {
  const headers = new Headers(options.headers)
  headers.set('Content-Type', 'application/json')
  if (token) headers.set('Authorization', `Bearer ${token}`)

  const response = await fetch(`/api${path}`, { ...options, headers })

  if (response.status === 204) {
    return undefined as T
  }

  const body = await response.json().catch(() => null)

  if (!response.ok) {
    throw new ApiError(body?.error ?? `request failed with status ${response.status}`, response.status)
  }

  return body as T
}

export function login(nickname: string, password: string): Promise<{ token: string }> {
  return request('/auth/login', { method: 'POST', body: JSON.stringify({ nickname, password }) })
}

export function register(
  activationKey: string,
  nickname: string,
  password: string,
): Promise<{ token: string }> {
  return request('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ activationKey, nickname, password }),
  })
}

export function getMe(token: string): Promise<MeUser> {
  return request('/users/me', {}, token)
}

export function updateMe(token: string, fields: ProfileUpdate): Promise<MeUser> {
  return request('/users/me', { method: 'PATCH', body: JSON.stringify(fields) }, token)
}

export function requestDeletion(token: string): Promise<MeUser> {
  return request('/users/me/request-deletion', { method: 'POST' }, token)
}

export function cancelDeletionRequest(token: string): Promise<MeUser> {
  return request('/users/me/request-deletion', { method: 'DELETE' }, token)
}

export function listUsers(token: string): Promise<UserSummary[]> {
  return request('/users', {}, token)
}

export function createUser(token: string, role: Role): Promise<CreatedUser> {
  return request('/users', { method: 'POST', body: JSON.stringify({ role }) }, token)
}

export function updateUserRole(token: string, id: string, role: Role): Promise<void> {
  return request(`/users/${id}`, { method: 'PATCH', body: JSON.stringify({ role }) }, token)
}

export function deleteUser(token: string, id: string): Promise<void> {
  return request(`/users/${id}`, { method: 'DELETE' }, token)
}
