import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import PrimeVue from 'primevue/config'
import { createMemoryHistory, createRouter } from 'vue-router'
import ProfileView from './ProfileView.vue'
import LogoutView from './LogoutView.vue'
import { ApiError } from '../lib/api'
import { useAuthStore } from '../stores/auth'

vi.mock('primevue/useconfirm', () => ({ useConfirm: () => ({ require: vi.fn() }) }))
vi.mock('primevue/usetoast', () => ({ useToast: () => ({ add: vi.fn() }) }))
vi.mock('../lib/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../lib/api')>()),
  getOAuthClient: vi.fn(),
  getMe: vi.fn(),
}))
vi.mock('../lib/navigation', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../lib/navigation')>()),
  leaveTo: vi.fn(),
}))

import * as api from '../lib/api'
import { leaveTo } from '../lib/navigation'

const RETURN_URI = 'https://omiyage.example/account'
const appQuery = `client_id=omiyage&return_uri=${encodeURIComponent(RETURN_URI)}`

function signIn() {
  const claims = { sub: '1', nickname: 'sushi', role: 'USER', exp: Math.floor(Date.now() / 1000) + 3600 }
  localStorage.setItem('meishi.token', `h.${btoa(JSON.stringify(claims))}.s`)
  setActivePinia(createPinia())
}

async function mountAt(component: object, path: string) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/profile', component: ProfileView },
      { path: '/logout', component: LogoutView },
      { path: '/login', name: 'login', component: { template: '<div />' } },
    ],
  })
  await router.push(path)
  await router.isReady()
  const wrapper = mount(component, { global: { plugins: [PrimeVue, router] } })
  await flushPromises()
  return { wrapper, router }
}

enableAutoUnmount(afterEach)

beforeEach(() => {
  localStorage.clear()
  setActivePinia(createPinia())
  vi.mocked(api.getOAuthClient).mockReset().mockResolvedValue({ clientId: 'omiyage', name: 'Omiyage' })
  vi.mocked(api.getMe).mockReset().mockRejectedValue(new ApiError('boom', 503))
  vi.mocked(leaveTo).mockReset()
})

describe('ProfileView', () => {
  it('links back to the app when the server confirms the return URI', async () => {
    signIn()

    const { wrapper } = await mountAt(ProfileView, `/profile?${appQuery}`)

    expect(api.getOAuthClient).toHaveBeenCalledWith({ client_id: 'omiyage', return_uri: RETURN_URI })
    const link = wrapper.get('a.return-link')
    expect(link.attributes('href')).toBe(RETURN_URI)
    expect(link.text()).toBe('Back to Omiyage')
    expect(wrapper.get('h1').text()).toBe('Welcome, sushi')
  })

  it('shows no link when the server rejects the return URI', async () => {
    signIn()
    vi.mocked(api.getOAuthClient).mockRejectedValue(new ApiError('invalid_return_uri', 400))

    const { wrapper } = await mountAt(ProfileView, `/profile?client_id=omiyage&return_uri=https%3A%2F%2Fevil.example`)

    expect(wrapper.find('a.return-link').exists()).toBe(false)
  })

  it.each(['', 'client_id=omiyage', `return_uri=${encodeURIComponent(RETURN_URI)}`])(
    'shows no link and asks nothing for query "%s"',
    async (query) => {
      signIn()

      const { wrapper } = await mountAt(ProfileView, `/profile?${query}`)

      expect(api.getOAuthClient).not.toHaveBeenCalled()
      expect(wrapper.find('a.return-link').exists()).toBe(false)
    },
  )
})

describe('LogoutView', () => {
  it('signs out and returns to a registered return URI', async () => {
    signIn()

    await mountAt(LogoutView, `/logout?${appQuery}`)

    expect(useAuthStore().isAuthenticated).toBe(false)
    expect(localStorage.getItem('meishi.token')).toBeNull()
    expect(leaveTo).toHaveBeenCalledWith(RETURN_URI)
  })

  it('signs out and stays at Meishi when the return URI is not registered', async () => {
    signIn()
    vi.mocked(api.getOAuthClient).mockRejectedValue(new ApiError('invalid_return_uri', 400))

    const { router } = await mountAt(LogoutView, '/logout?client_id=omiyage&return_uri=https%3A%2F%2Fevil.example')

    expect(useAuthStore().isAuthenticated).toBe(false)
    expect(leaveTo).not.toHaveBeenCalled()
    expect(router.currentRoute.value.name).toBe('login')
  })

  it('signs out and goes to login without app parameters', async () => {
    signIn()

    const { router } = await mountAt(LogoutView, '/logout')

    expect(useAuthStore().isAuthenticated).toBe(false)
    expect(api.getOAuthClient).not.toHaveBeenCalled()
    expect(router.currentRoute.value.name).toBe('login')
  })
})
