import { describe, expect, it } from 'vitest'
import { authorizeTarget, cancelUrl } from './oauthCancel'

const redirect = '/oauth/authorize?response_type=code&client_id=omiyage&redirect_uri=https%3A%2F%2Fomiyage.example%2Fauth%2Fcallback&state=abc123&code_challenge=x&code_challenge_method=S256'

describe('authorizeTarget', () => {
  it('reads client, redirect uri and state from an authorize path', () => {
    expect(authorizeTarget(redirect)).toEqual({
      clientId: 'omiyage',
      redirectUri: 'https://omiyage.example/auth/callback',
      state: 'abc123',
    })
  })

  it('has no state when the request carries none', () => {
    expect(authorizeTarget('/oauth/authorize?client_id=omiyage&redirect_uri=https%3A%2F%2Fa.example%2Fcb')?.state).toBeNull()
  })

  it.each([
    undefined,
    null,
    ['/oauth/authorize'],
    '',
    '/',
    '/admin?client_id=omiyage&redirect_uri=https%3A%2F%2Fa.example',
    'https://evil.example/oauth/authorize?client_id=a&redirect_uri=b',
    '//evil.example/oauth/authorize?client_id=a&redirect_uri=b',
    '/oauth/authorize?client_id=omiyage',
    '/oauth/authorize?redirect_uri=https%3A%2F%2Fa.example',
    '/oauth/authorizeX?client_id=a&redirect_uri=b',
  ])('is null for %s', (value) => {
    expect(authorizeTarget(value)).toBeNull()
  })
})

describe('cancelUrl', () => {
  it('returns access_denied with the state, per RFC 6749 4.1.2.1', () => {
    expect(cancelUrl('https://omiyage.example/auth/callback', 'abc123')).toBe(
      'https://omiyage.example/auth/callback?error=access_denied&state=abc123',
    )
  })

  it('keeps query parameters the redirect uri already has', () => {
    expect(cancelUrl('https://a.example/cb?x=1', 's')).toBe('https://a.example/cb?x=1&error=access_denied&state=s')
  })

  it('leaves the state out when there is none', () => {
    expect(cancelUrl('https://a.example/cb', null)).toBe('https://a.example/cb?error=access_denied')
  })

  it.each(['javascript:alert(1)', 'data:text/html,x', 'not a url', '//a.example/cb'])('is null for %s', (uri) => {
    expect(cancelUrl(uri, 's')).toBeNull()
  })
})
