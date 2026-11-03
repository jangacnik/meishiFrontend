import { afterEach, describe, expect, it, vi } from 'vitest'
import { leaveTo, localPath } from './navigation'

describe('localPath', () => {
  it('keeps an in-app path', () => {
    expect(localPath('/oauth/authorize?client_id=a')).toBe('/oauth/authorize?client_id=a')
  })

  it.each([undefined, null, ['/a'], '', 'https://evil.example', '//evil.example', 'relative'])(
    'falls back to / for %s',
    (value) => {
      expect(localPath(value)).toBe('/')
    },
  )
})

describe('leaveTo', () => {
  afterEach(() => vi.restoreAllMocks())

  it('hands the URL to the browser', () => {
    const assign = vi.spyOn(window.location, 'assign').mockImplementation(() => {})

    leaveTo('https://omiyage.example/cb')

    expect(assign).toHaveBeenCalledWith('https://omiyage.example/cb')
  })
})
