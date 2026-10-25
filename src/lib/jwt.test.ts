import { describe, expect, it } from 'vitest'
import { decodeJwt, isExpired } from './jwt'

function makeToken(claims: object): string {
  const bytes = new TextEncoder().encode(JSON.stringify(claims))
  const payload = btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  return `header.${payload}.signature`
}

describe('decodeJwt', () => {
  it('round-trips a multibyte nickname', () => {
    const claims = { sub: 'id-1', nickname: '寿司', role: 'USER', exp: 1 }
    expect(decodeJwt(makeToken(claims))).toEqual(claims)
  })
})

describe('isExpired', () => {
  it('is true once exp has passed', () => {
    expect(isExpired({ sub: 'a', nickname: 'n', role: 'USER', exp: 1 })).toBe(true)
  })

  it('is false before exp', () => {
    const inAnHour = Math.floor(Date.now() / 1000) + 3600
    expect(isExpired({ sub: 'a', nickname: 'n', role: 'USER', exp: inAnHour })).toBe(false)
  })
})
