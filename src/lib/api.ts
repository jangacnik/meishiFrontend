export type Role = 'USER' | 'ADMIN'

export interface UserSummary {
  id: string
  nickname: string | null
  role: Role
  activated: boolean
  createdAt: string
}

export interface CreatedUser {
  id: string
  activationKey: string
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
