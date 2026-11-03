import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import PrimeVue from 'primevue/config'
import { createMemoryHistory, createRouter } from 'vue-router'
import OAuthAuthorizeView from './OAuthAuthorizeView.vue'
import { ApiError } from '../lib/api'

vi.mock('../lib/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../lib/api')>()),
  getOAuthClient: vi.fn(),
  authorize: vi.fn(),
}))
vi.mock('../lib/navigation', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../lib/navigation')>()),
  leaveTo: vi.fn(),
}))

import * as api from '../lib/api'
import { leaveTo } from '../lib/navigation'

const request = {
  response_type: 'code',
  client_id: 'omiyage',
  redirect_uri: 'https://omiyage.example/auth/callback',
  state: 'xyz',
  code_challenge: 'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM',
  code_challenge_method: 'S256',
}
const authorizePath = `/oauth/authorize?${new URLSearchParams(request)}`

function signIn() {
  const claims = { sub: '1', nickname: 'sushi', role: 'USER', exp: Math.floor(Date.now() / 1000) + 3600 }
  localStorage.setItem('meishi.token', `h.${btoa(JSON.stringify(claims))}.s`)
  setActivePinia(createPinia())
}

async function mountAt(path: string) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/oauth/authorize', component: OAuthAuthorizeView },
      { path: '/login', name: 'login', component: { template: '<div />' } },
    ],
  })
  await router.push(path)
  await router.isReady()
  const wrapper = mount(OAuthAuthorizeView, { global: { plugins: [PrimeVue, router] } })
  await flushPromises()
  return { wrapper, router }
}

enableAutoUnmount(afterEach)

beforeEach(() => {
  localStorage.clear()
  setActivePinia(createPinia())
  vi.mocked(api.getOAuthClient).mockReset().mockResolvedValue({ clientId: 'omiyage', name: 'Omiyage' })
  vi.mocked(api.authorize).mockReset()
  vi.mocked(leaveTo).mockReset()
})

describe('OAuthAuthorizeView', () => {
  it('sends a signed-in user straight back to the app with the server-built URL', async () => {
    signIn()
    vi.mocked(api.authorize).mockResolvedValue({ redirectUrl: 'https://omiyage.example/auth/callback?code=c&state=xyz' })

    const { wrapper } = await mountAt(authorizePath)

    expect(api.getOAuthClient).toHaveBeenCalledWith({ client_id: request.client_id, redirect_uri: request.redirect_uri })
    expect(api.authorize).toHaveBeenCalledWith(expect.any(String), request)
    expect(leaveTo).toHaveBeenCalledWith('https://omiyage.example/auth/callback?code=c&state=xyz')
    expect(wrapper.get('h1').text()).toBe('Signing you in to Omiyage')
  })

  it('sends a visitor without a session to login and back here afterwards', async () => {
    const { router } = await mountAt(authorizePath)

    expect(router.currentRoute.value.name).toBe('login')
    expect(router.currentRoute.value.query.redirect).toBe(authorizePath)
    expect(api.authorize).not.toHaveBeenCalled()
    expect(leaveTo).not.toHaveBeenCalled()
  })

  it.each(Object.keys(request))('shows an error and never redirects when %s is missing', async (key) => {
    signIn()
    const query = new URLSearchParams(request)
    query.delete(key)

    const { wrapper, router } = await mountAt(`/oauth/authorize?${query}`)

    expect(wrapper.text()).toContain('This sign-in link is not valid.')
    expect(api.getOAuthClient).not.toHaveBeenCalled()
    expect(leaveTo).not.toHaveBeenCalled()
    expect(router.currentRoute.value.path).toBe('/oauth/authorize')
  })

  it('shows an error and never redirects when the server rejects the client or redirect URI', async () => {
    vi.mocked(api.getOAuthClient).mockRejectedValue(new ApiError('invalid_redirect_uri', 400))

    const { wrapper, router } = await mountAt(authorizePath)

    expect(wrapper.get('h1').text()).toBe('Cannot sign you in')
    expect(wrapper.text()).toContain('This sign-in link is not valid.')
    expect(router.currentRoute.value.path).toBe('/oauth/authorize')
    expect(leaveTo).not.toHaveBeenCalled()
  })

  it('shows an error when the server refuses to issue a code', async () => {
    signIn()
    vi.mocked(api.authorize).mockRejectedValue(new ApiError('invalid_request', 400))

    const { wrapper } = await mountAt(authorizePath)

    expect(wrapper.text()).toContain('This sign-in link is not valid.')
    expect(leaveTo).not.toHaveBeenCalled()
  })

  it('sends the user to login and back here when the server rejects the session', async () => {
    signIn()
    vi.mocked(api.authorize).mockRejectedValue(new ApiError('unauthorized', 401))

    const { router } = await mountAt(authorizePath)

    expect(router.currentRoute.value.name).toBe('login')
    expect(router.currentRoute.value.query.redirect).toBe(authorizePath)
    expect(localStorage.getItem('meishi.token')).toBeNull()
    expect(leaveTo).not.toHaveBeenCalled()
  })

  it('shows a retry message when the server is down', async () => {
    vi.mocked(api.getOAuthClient).mockRejectedValue(new ApiError('boom', 503))

    const { wrapper } = await mountAt(authorizePath)

    expect(wrapper.find('[role="alert"], .p-message').exists()).toBe(true)
    expect(wrapper.text()).not.toContain('This sign-in link is not valid.')
    expect(leaveTo).not.toHaveBeenCalled()
  })
})
