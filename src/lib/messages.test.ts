import { describe, expect, it } from 'vitest'
import { ApiError } from './api'
import { errorMessage } from './messages'

describe('errorMessage', () => {
  it('sentence-cases server messages for 409', () => {
    expect(errorMessage(new ApiError('nickname taken', 409), 'Fallback.')).toBe('Nickname taken.')
  })

  it('uses the fallback when a 400 has no server message', () => {
    expect(errorMessage(new ApiError('request failed with status 400', 400), 'Fallback.')).toBe('Fallback.')
  })

  it('maps 429 and 5xx to friendly copy', () => {
    expect(errorMessage(new ApiError('x', 429), 'Fallback.')).toMatch(/Too many attempts/)
    expect(errorMessage(new ApiError('x', 503), 'Fallback.')).toMatch(/our side/)
  })

  it('reports network failures', () => {
    expect(errorMessage(new TypeError('Failed to fetch'), 'Fallback.')).toMatch(/Could not reach the server/)
  })
})
