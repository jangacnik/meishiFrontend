import { afterEach, describe, expect, vi } from 'vitest'
import { fc, test } from '@fast-check/vitest'
import { ApiError, getMe, login, register, setUnauthorizedHandler } from './api'

const errorStatus = fc.integer({ min: 400, max: 599 })
const successStatus = fc.integer({ min: 200, max: 299 }).filter((code) => code !== 204 && code !== 205)
const unicodeText = fc.oneof(
  fc.string({ unit: 'binary' }),
  fc.constantFrom('pässwörd', '😀🔑', 'say "hi"', 'back\\slash', '日本語', 'é', '{"a":1}'),
)
const tokenText = fc.stringMatching(/^[A-Za-z0-9._-]{0,40}$/)

const jsonResponse = (body: unknown, status: number) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })

const stubFetch = (response: Response) => {
  const fetchMock = vi.fn().mockResolvedValue(response)
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

describe('api client', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    setUnauthorizedHandler(() => {})
  })

  test.prop([errorStatus, fc.string({ minLength: 1 })])('a non-2xx JSON response becomes an ApiError with that status and message', async (status, error) => {
    stubFetch(jsonResponse({ error }, status))

    const failure = await getMe('t').catch((caught: unknown) => caught)

    expect(failure).toBeInstanceOf(ApiError)
    expect(failure).toMatchObject({ status, message: error })
  })

  test.prop([errorStatus, fc.constantFrom('text/plain', 'text/html', 'application/json'), fc.string()])(
    'a non-JSON or malformed error body becomes an ApiError, never a SyntaxError',
    async (status, contentType, text) => {
      fc.pre(!text.trim().startsWith('{') && !text.trim().startsWith('"'))
      stubFetch(new Response(text, { status, headers: { 'content-type': contentType } }))

      const failure = await getMe('t').catch((caught: unknown) => caught)

      expect(failure).toBeInstanceOf(ApiError)
      expect((failure as ApiError).status).toBe(status)
      expect(typeof (failure as ApiError).message).toBe('string')
    },
  )

  test.prop([successStatus, fc.jsonValue().map((value) => JSON.parse(JSON.stringify(value)))])(
    'a 2xx JSON response resolves to the parsed body',
    async (status, body) => {
      stubFetch(jsonResponse(body, status))

      await expect(getMe('t')).resolves.toEqual(body)
    },
  )

  test.prop([unicodeText, unicodeText])('login sends the exact nickname and password to the server', async (nickname, password) => {
    const fetchMock = stubFetch(jsonResponse({ token: 'x' }, 200))

    await login(nickname, password)

    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ nickname, password })
  })

  test.prop([unicodeText, unicodeText, unicodeText])('register sends the exact key, nickname and password', async (key, nickname, password) => {
    const fetchMock = stubFetch(jsonResponse({ token: 'x' }, 200))

    await register(key, nickname, password)

    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ activationKey: key, nickname, password })
  })

  test.prop([tokenText])('the Authorization header is present iff a token is given', async (token) => {
    const fetchMock = stubFetch(jsonResponse({}, 200))

    await getMe(token)

    const headers: Headers = fetchMock.mock.calls[0][1].headers
    expect(headers.get('Authorization')).toBe(token ? `Bearer ${token}` : null)
  })

  test.prop([tokenText.filter((token) => token !== '')])('a 401 for a signed-in request calls the unauthorized handler', async (token) => {
    const handler = vi.fn()
    setUnauthorizedHandler(handler)
    stubFetch(jsonResponse({ error: 'nope' }, 401))

    await getMe(token).catch(() => {})

    expect(handler).toHaveBeenCalledTimes(1)
  })

  test.prop([unicodeText, unicodeText])('a 401 from login never calls the unauthorized handler', async (nickname, password) => {
    const handler = vi.fn()
    setUnauthorizedHandler(handler)
    stubFetch(jsonResponse({ error: 'bad credentials' }, 401))

    await login(nickname, password).catch(() => {})

    expect(handler).not.toHaveBeenCalled()
  })
})
