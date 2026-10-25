import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useAuthStore } from './auth'

vi.mock('../lib/api', () => ({ login: vi.fn() }))

import * as api from '../lib/api'

function makeToken(claims: object): string {
  const bytes = new TextEncoder().encode(JSON.stringify(claims))
  return `h.${btoa(String.fromCharCode(...bytes))}.s`
}

describe('auth store', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  it('stores the token and exposes claims after login', async () => {
    const exp = Math.floor(Date.now() / 1000) + 3600
    vi.mocked(api.login).mockResolvedValue({
      token: makeToken({ sub: '1', nickname: '寿司', role: 'ADMIN', exp }),
    })
    const auth = useAuthStore()

    await auth.login('寿司', 'pw')

    expect(auth.isAuthenticated).toBe(true)
    expect(auth.isAdmin).toBe(true)
    expect(auth.nickname).toBe('寿司')
  })

  it('ignores an expired stored token', () => {
    localStorage.setItem('meishi.token', makeToken({ sub: '1', nickname: 'a', role: 'USER', exp: 1 }))
    const auth = useAuthStore()
    expect(auth.isAuthenticated).toBe(false)
  })

  it('logout removes the stored token', async () => {
    const exp = Math.floor(Date.now() / 1000) + 3600
    vi.mocked(api.login).mockResolvedValue({ token: makeToken({ sub: '1', nickname: 'a', role: 'USER', exp }) })
    const auth = useAuthStore()
    await auth.login('a', 'pw')

    auth.logout()

    expect(auth.isAuthenticated).toBe(false)
    expect(localStorage.getItem('meishi.token')).toBeNull()
  })
})
