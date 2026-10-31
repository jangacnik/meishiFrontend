import { afterEach, describe, expect, it, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'

describe('main', () => {
  afterEach(() => {
    document.body.innerHTML = ''
    localStorage.clear()
    vi.resetModules()
  })

  it('mounts the app and logs out to the login page when the API reports an expired session', async () => {
    document.body.innerHTML = '<div id="app"></div>'
    const claims = { sub: '1', nickname: 'sushi', role: 'USER', exp: Math.floor(Date.now() / 1000) + 3600 }
    const token = `h.${btoa(JSON.stringify(claims))}.s`
    localStorage.setItem('meishi.token', token)
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: 'expired' }), { status: 401 })))

    await import('./main')
    const { default: router } = await import('./router')
    await router.isReady()
    await flushPromises()

    expect(document.querySelector('#app .nav')).not.toBeNull()

    await vi.waitFor(() => expect(localStorage.getItem('meishi.token')).toBeNull())
    await vi.waitFor(() => expect(router.currentRoute.value.name).toBe('login'))
    expect(router.currentRoute.value.query).toMatchObject({ redirect: '/', expired: '1' })
    vi.unstubAllGlobals()
  })
})
