import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as api from './api'

const fetchMock = vi.fn()

function respond(status: number, body?: unknown) {
  fetchMock.mockResolvedValue(
    status === 204 ? new Response(null, { status }) : new Response(JSON.stringify(body ?? {}), { status }),
  )
}

function lastCall() {
  const [url, init] = fetchMock.mock.calls.at(-1) as [string, RequestInit]
  const headers = new Headers(init.headers)
  return {
    url,
    method: init.method ?? 'GET',
    auth: headers.get('Authorization'),
    body: init.body ? JSON.parse(init.body as string) : undefined,
  }
}

describe('api endpoints', () => {
  beforeEach(() => {
    fetchMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
  })
  afterEach(() => vi.unstubAllGlobals())

  const cases: [string, () => Promise<unknown>, string, string, unknown, boolean][] = [
    ['register', () => api.register('key', 'nick', 'pw'), 'POST', '/api/auth/register', { activationKey: 'key', nickname: 'nick', password: 'pw' }, false],
    ['updateMe', () => api.updateMe('tok', { city: 'Kyoto' }), 'PATCH', '/api/users/me', { city: 'Kyoto' }, true],
    ['requestDeletion', () => api.requestDeletion('tok'), 'POST', '/api/users/me/request-deletion', undefined, true],
    ['cancelDeletionRequest', () => api.cancelDeletionRequest('tok'), 'DELETE', '/api/users/me/request-deletion', undefined, true],
    ['listUsers', () => api.listUsers('tok'), 'GET', '/api/users', undefined, true],
    ['createUser', () => api.createUser('tok', 'ADMIN'), 'POST', '/api/users', { role: 'ADMIN' }, true],
    ['updateUserRole', () => api.updateUserRole('tok', 'u1', 'USER'), 'PATCH', '/api/users/u1', { role: 'USER' }, true],
    ['updateUserStatus', () => api.updateUserStatus('tok', 'u1', 'FROZEN'), 'PATCH', '/api/users/u1/status', { status: 'FROZEN' }, true],
    ['deleteUser', () => api.deleteUser('tok', 'u1'), 'DELETE', '/api/users/u1', undefined, true],
    ['updateMyNickname', () => api.updateMyNickname('tok', 'new'), 'PATCH', '/api/users/me/nickname', { nickname: 'new' }, true],
    ['changeMyPassword', () => api.changeMyPassword('tok', 'old', 'new'), 'PATCH', '/api/users/me/password', { oldPassword: 'old', newPassword: 'new' }, true],
    ['adminUpdateUser', () => api.adminUpdateUser('tok', 'u1', { email: 'a@b.c' }), 'PATCH', '/api/users/u1/profile', { email: 'a@b.c' }, true],
    ['adminSetPassword', () => api.adminSetPassword('tok', 'u1', 'pw'), 'PATCH', '/api/users/u1/password', { newPassword: 'pw' }, true],
  ]

  it.each(cases)('%s sends the right request', async (_name, call, method, url, body, authenticated) => {
    respond(200, { ok: true })

    await call()

    expect(lastCall()).toEqual({ url, method, auth: authenticated ? 'Bearer tok' : null, body })
  })

  it('resolves to undefined on 204 without reading a body', async () => {
    respond(204)

    await expect(api.deleteUser('tok', 'u1')).resolves.toBeUndefined()
  })

  it('returns the parsed body of a successful call', async () => {
    respond(200, { id: 'u1', nickname: 'a' })

    await expect(api.getMe('tok')).resolves.toEqual({ id: 'u1', nickname: 'a' })
  })

  it('rejects with the server error message and status', async () => {
    respond(409, { error: 'nickname taken' })

    await expect(api.updateMyNickname('tok', 'x')).rejects.toMatchObject({ status: 409, message: 'nickname taken' })
  })

  it('falls back to a generic message when the error body has none', async () => {
    fetchMock.mockResolvedValue(new Response('boom', { status: 500 }))

    await expect(api.listUsers('tok')).rejects.toMatchObject({ status: 500, message: 'request failed with status 500' })
  })

  it('calls the unauthorized handler on 401 for session endpoints', async () => {
    const handler = vi.fn()
    api.setUnauthorizedHandler(handler)
    respond(401, { error: 'expired' })

    await expect(api.getMe('tok')).rejects.toBeInstanceOf(api.ApiError)

    expect(handler).toHaveBeenCalledOnce()
  })

  it('does not call the unauthorized handler on 401 from the change-password endpoint', async () => {
    const handler = vi.fn()
    api.setUnauthorizedHandler(handler)
    respond(401, { error: 'wrong password' })

    await expect(api.changeMyPassword('tok', 'a', 'b')).rejects.toMatchObject({ status: 401 })

    expect(handler).not.toHaveBeenCalled()
  })
})
