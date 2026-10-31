import { afterEach, beforeEach, describe, expect, vi } from 'vitest'
import { fc, test } from '@fast-check/vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useAuthStore } from './auth'

vi.mock('../lib/api', () => ({ login: vi.fn(), register: vi.fn() }))

import * as api from '../lib/api'

const STORAGE_KEY = 'meishi.token'
const NOW_MS = Date.UTC(2026, 0, 1)

const makeToken = (claims: object) => {
  const bytes = new TextEncoder().encode(JSON.stringify(claims))
  return `h.${btoa(String.fromCharCode(...bytes))}.s`
}

const tokenSpec = fc.record({
  nickname: fc.string(),
  role: fc.constantFrom('USER' as const, 'ADMIN' as const),
  lifetimeSeconds: fc.integer({ min: 1, max: 2000 }),
})

type TokenSpec = { nickname: string; role: 'USER' | 'ADMIN'; lifetimeSeconds: number }

type Command =
  | { type: 'login'; spec: TokenSpec }
  | { type: 'register'; spec: TokenSpec }
  | { type: 'failedLogin' }
  | { type: 'logout' }
  | { type: 'logoutIfExpired' }
  | { type: 'setNickname'; nickname: string }
  | { type: 'advance'; millis: number }

const command: fc.Arbitrary<Command> = fc.oneof(
  tokenSpec.map((spec) => ({ type: 'login' as const, spec })),
  tokenSpec.map((spec) => ({ type: 'register' as const, spec })),
  fc.constant({ type: 'failedLogin' as const }),
  fc.constant({ type: 'logout' as const }),
  fc.constant({ type: 'logoutIfExpired' as const }),
  fc.string().map((nickname) => ({ type: 'setNickname' as const, nickname })),
  fc.integer({ min: 0, max: 1_000_000 }).map((millis) => ({ type: 'advance' as const, millis })),
)

interface Model {
  token: string | null
  nickname: string | null
  role: 'USER' | 'ADMIN' | null
  expMs: number
}

const signedOut: Model = { token: null, nickname: null, role: null, expMs: 0 }

describe('auth store', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(NOW_MS)
    localStorage.clear()
    setActivePinia(createPinia())
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.mocked(api.login).mockReset()
    vi.mocked(api.register).mockReset()
  })

  test.prop([fc.array(command, { maxLength: 30 })])('follows a simple model across random command sequences', async (commands) => {
    localStorage.clear()
    setActivePinia(createPinia())
    vi.setSystemTime(NOW_MS)
    const auth = useAuthStore()
    let model: Model = { ...signedOut }

    for (const cmd of commands) {
      if (cmd.type === 'login' || cmd.type === 'register') {
        const expMs = Date.now() + cmd.spec.lifetimeSeconds * 1000
        const token = makeToken({ sub: 'u', nickname: cmd.spec.nickname, role: cmd.spec.role, exp: Math.floor(expMs / 1000) })
        if (cmd.type === 'login') {
          vi.mocked(api.login).mockResolvedValueOnce({ token })
          await auth.login('n', 'p')
        } else {
          vi.mocked(api.register).mockResolvedValueOnce({ token })
          await auth.register('k', 'n', 'p')
        }
        model = { token, nickname: cmd.spec.nickname, role: cmd.spec.role, expMs: Math.floor(expMs / 1000) * 1000 }
      } else if (cmd.type === 'failedLogin') {
        vi.mocked(api.login).mockRejectedValueOnce(new Error('bad credentials'))
        await expect(auth.login('n', 'p')).rejects.toThrow()
      } else if (cmd.type === 'logout') {
        auth.logout()
        model = { ...signedOut }
      } else if (cmd.type === 'logoutIfExpired') {
        auth.logoutIfExpired()
        if (model.token && Date.now() >= model.expMs) model = { ...signedOut }
      } else if (cmd.type === 'setNickname') {
        auth.setNickname(cmd.nickname)
        if (model.token) model = { ...model, nickname: cmd.nickname }
      } else {
        vi.setSystemTime(Date.now() + cmd.millis)
      }

      expect(auth.token).toBe(model.token)
      expect(auth.isAuthenticated).toBe(model.token !== null)
      expect(auth.isAdmin).toBe(model.role === 'ADMIN')
      expect(auth.nickname).toBe(model.nickname)
      expect(localStorage.getItem(STORAGE_KEY)).toBe(model.token)
    }
  })

  test.prop([fc.integer({ min: -100_000, max: 100_000 }), fc.string()])(
    'a stored token is restored only while unexpired, otherwise it is removed',
    (offsetSeconds, nickname) => {
      const token = makeToken({ sub: 'u', nickname, role: 'USER', exp: NOW_MS / 1000 + offsetSeconds })
      localStorage.setItem(STORAGE_KEY, token)
      setActivePinia(createPinia())

      const auth = useAuthStore()

      expect(auth.isAuthenticated).toBe(offsetSeconds > 0)
      expect(localStorage.getItem(STORAGE_KEY)).toBe(offsetSeconds > 0 ? token : null)
    },
  )

  test.prop([fc.string({ minLength: 1 }).filter((text) => !text.includes('.'))])(
    'a garbage stored token never authenticates, never throws, and is removed',
    (garbage) => {
      localStorage.setItem(STORAGE_KEY, garbage)
      setActivePinia(createPinia())

      const auth = useAuthStore()

      expect(auth.isAuthenticated).toBe(false)
      expect(localStorage.getItem(STORAGE_KEY)).toBeNull()
    },
  )
})
