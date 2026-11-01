import { describe, expect, it } from 'vitest'
import { fc, test } from '@fast-check/vitest'
import { ApiError } from './api'
import { errorMessage } from './messages'

const FALLBACK = 'Fallback.'
const OFFLINE = 'Could not reach the server. Check your connection and try again.'
const TOO_MANY = 'Too many attempts. Wait a moment and try again.'
const SERVER_SIDE = 'Something went wrong on our side. Try again later.'

const status = fc.integer({ min: 100, max: 599 })
const serverMessage = fc.oneof(fc.string(), fc.constantFrom('nickname taken', 'ポケモン', '😀 oops', 'request failed with status 400'))
const meaningfulMessage = serverMessage.filter((text) => text.trim() !== '' && !text.startsWith('request failed'))

describe('errorMessage', () => {
  test.prop([fc.anything()])('never throws and returns a string for any value', (value) => {
    expect(typeof errorMessage(value, FALLBACK)).toBe('string')
  })

  test.prop([fc.anything().filter((value) => !(value instanceof TypeError) && !(value instanceof ApiError))])(
    'a value that is not an ApiError or TypeError gets the fallback',
    (value) => {
      expect(errorMessage(value, FALLBACK)).toBe(FALLBACK)
    },
  )

  test.prop([fc.string()])('a TypeError reports the connection problem', (text) => {
    expect(errorMessage(new TypeError(text), FALLBACK)).toBe(OFFLINE)
  })

  test.prop([serverMessage])('429 never leaks the server message', (message) => {
    expect(errorMessage(new ApiError(message, 429), FALLBACK)).toBe(TOO_MANY)
  })

  test.prop([serverMessage, fc.integer({ min: 500, max: 599 })])('5xx never leaks the server message', (message, code) => {
    expect(errorMessage(new ApiError(message, code), FALLBACK)).toBe(SERVER_SIDE)
  })

  test.prop([serverMessage, status.filter((code) => code !== 400 && code !== 409 && code !== 429 && code < 500)])(
    'other statuses use the fallback',
    (message, code) => {
      expect(errorMessage(new ApiError(message, code), FALLBACK)).toBe(FALLBACK)
    },
  )

  test.prop([meaningfulMessage, fc.constantFrom(400, 409)])('sentence-cased messages end with sentence punctuation', (message, code) => {
    expect(errorMessage(new ApiError(message, code), FALLBACK)).toMatch(/[.!?]$/)
  })

  test.prop([meaningfulMessage, fc.constantFrom(400, 409)])('sentence-casing is idempotent', (message, code) => {
    const once = errorMessage(new ApiError(message, code), FALLBACK)

    expect(errorMessage(new ApiError(once, code), FALLBACK)).toBe(once)
  })

  test.prop([meaningfulMessage, fc.constantFrom(400, 409)])(
    'messages start with an upper-case code point or a non-letter',
    (message, code) => {
      const [first] = Array.from(errorMessage(new ApiError(message, code), FALLBACK))

      expect(first).toBe(first.toUpperCase())
    },
  )

  test.prop([serverMessage, fc.constantFrom(400, 409)])('400/409 never yields an empty string', (message, code) => {
    expect(errorMessage(new ApiError(message, code), FALLBACK)).not.toBe('')
  })

  it('falls back for a whitespace-only 400 message', () => {
    expect(errorMessage(new ApiError('   ', 400), FALLBACK)).toBe(FALLBACK)
  })

  it('capitalises a non-BMP first letter', () => {
    expect(errorMessage(new ApiError('\u{10428}bc', 400), FALLBACK)).toBe('\u{10400}bc.')
  })
})
