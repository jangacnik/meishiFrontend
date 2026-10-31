import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import PrimeVue from 'primevue/config'
import { createMemoryHistory, createRouter } from 'vue-router'
import LoginView from './LoginView.vue'
import RegisterView from './RegisterView.vue'
import NotFoundView from './NotFoundView.vue'
import { ApiError } from '../lib/api'
import { useAuthStore } from '../stores/auth'

vi.mock('../lib/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../lib/api')>()),
  login: vi.fn(),
  register: vi.fn(),
}))

import * as api from '../lib/api'

function makeToken(): string {
  const claims = { sub: '1', nickname: 'sushi', role: 'USER', exp: Math.floor(Date.now() / 1000) + 3600 }
  return `h.${btoa(JSON.stringify(claims))}.s`
}

async function mountAt(component: object, path: string) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: { template: '<div />' } },
      { path: '/login', component: LoginView },
      { path: '/register', name: 'register', component: RegisterView },
      { path: '/elsewhere', component: { template: '<div />' } },
    ],
  })
  await router.push(path)
  await router.isReady()
  const wrapper = mount(component, { global: { plugins: [PrimeVue, router] } })
  return { wrapper, router }
}

async function fill(wrapper: ReturnType<typeof mount>, selector: string, value: string) {
  await wrapper.get(selector).setValue(value)
}

beforeEach(() => {
  localStorage.clear()
  setActivePinia(createPinia())
  vi.mocked(api.login).mockReset()
  vi.mocked(api.register).mockReset()
})

describe('LoginView', () => {
  it('asks for both fields when submitted empty and does not call the API', async () => {
    const { wrapper } = await mountAt(LoginView, '/login')

    await wrapper.get('form').trigger('submit')

    expect(wrapper.text()).toContain('Enter your nickname.')
    expect(wrapper.text()).toContain('Enter your password.')
    expect(api.login).not.toHaveBeenCalled()
  })

  it('clears a field error once the user types', async () => {
    const { wrapper } = await mountAt(LoginView, '/login')
    await wrapper.get('form').trigger('submit')

    await fill(wrapper, '#nickname', 'sushi')

    expect(wrapper.text()).not.toContain('Enter your nickname.')
  })

  it('logs in and navigates home', async () => {
    vi.mocked(api.login).mockResolvedValue({ token: makeToken() })
    const { wrapper, router } = await mountAt(LoginView, '/login')

    await fill(wrapper, '#nickname', 'sushi')
    await fill(wrapper, '#password', 'pw')
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(api.login).toHaveBeenCalledWith('sushi', 'pw')
    expect(useAuthStore().isAuthenticated).toBe(true)
    expect(router.currentRoute.value.path).toBe('/')
  })

  it('returns to the redirect target after login', async () => {
    vi.mocked(api.login).mockResolvedValue({ token: makeToken() })
    const { wrapper, router } = await mountAt(LoginView, '/login?redirect=/elsewhere')

    await fill(wrapper, '#nickname', 'sushi')
    await fill(wrapper, '#password', 'pw')
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(router.currentRoute.value.path).toBe('/elsewhere')
  })

  it.each(['//evil.example', 'https://evil.example', 'relative'])(
    'ignores the unsafe redirect %s',
    async (redirect) => {
      vi.mocked(api.login).mockResolvedValue({ token: makeToken() })
      const { wrapper, router } = await mountAt(LoginView, `/login?redirect=${encodeURIComponent(redirect)}`)

      await fill(wrapper, '#nickname', 'sushi')
      await fill(wrapper, '#password', 'pw')
      await wrapper.get('form').trigger('submit')
      await flushPromises()

      expect(router.currentRoute.value.path).toBe('/')
    },
  )

  it('shows a credentials message on 401', async () => {
    vi.mocked(api.login).mockRejectedValue(new ApiError('bad', 401))
    const { wrapper } = await mountAt(LoginView, '/login')

    await fill(wrapper, '#nickname', 'sushi')
    await fill(wrapper, '#password', 'pw')
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(wrapper.text()).toContain('Login failed. Check your nickname and password.')
    expect(useAuthStore().isAuthenticated).toBe(false)
  })

  it('shows the generic message for other failures', async () => {
    vi.mocked(api.login).mockRejectedValue(new ApiError('boom', 500))
    const { wrapper } = await mountAt(LoginView, '/login')

    await fill(wrapper, '#nickname', 'sushi')
    await fill(wrapper, '#password', 'pw')
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(wrapper.text()).toContain('Something went wrong on our side.')
  })

  it('tells the user when their session expired', async () => {
    const { wrapper } = await mountAt(LoginView, '/login?expired=1')

    expect(wrapper.text()).toContain('Session expired. Log in again.')
  })
})

describe('RegisterView', () => {
  it('prefills the activation key from the link and removes it from the URL', async () => {
    const { wrapper, router } = await mountAt(RegisterView, '/register?key=abc123')
    await flushPromises()

    expect((wrapper.get('#activationKey').element as HTMLInputElement).value).toBe('abc123')
    expect(router.currentRoute.value.query.key).toBeUndefined()
  })

  it('requires key, nickname and password', async () => {
    const { wrapper } = await mountAt(RegisterView, '/register')

    await wrapper.get('form').trigger('submit')

    expect(wrapper.text()).toContain('Enter your activation key.')
    expect(wrapper.text()).toContain('Choose a nickname.')
    expect(wrapper.text()).toContain('Choose a password.')
    expect(api.register).not.toHaveBeenCalled()
  })

  it('rejects mismatching passwords', async () => {
    const { wrapper } = await mountAt(RegisterView, '/register')

    await fill(wrapper, '#activationKey', 'k')
    await fill(wrapper, '#nickname', 'n')
    await fill(wrapper, '#password', 'one')
    await fill(wrapper, '#confirmPassword', 'two')
    await wrapper.get('form').trigger('submit')

    expect(wrapper.text()).toContain('Passwords do not match.')
    expect(api.register).not.toHaveBeenCalled()
  })

  it('registers, stores the session and navigates home', async () => {
    vi.mocked(api.register).mockResolvedValue({ token: makeToken() })
    const { wrapper, router } = await mountAt(RegisterView, '/register')

    await fill(wrapper, '#activationKey', 'k')
    await fill(wrapper, '#nickname', 'n')
    await fill(wrapper, '#password', 'pw')
    await fill(wrapper, '#confirmPassword', 'pw')
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(api.register).toHaveBeenCalledWith('k', 'n', 'pw')
    expect(useAuthStore().isAuthenticated).toBe(true)
    expect(router.currentRoute.value.path).toBe('/')
  })

  it('shows the server message when registration is rejected', async () => {
    vi.mocked(api.register).mockRejectedValue(new ApiError('activation key invalid', 400))
    const { wrapper } = await mountAt(RegisterView, '/register')

    await fill(wrapper, '#activationKey', 'k')
    await fill(wrapper, '#nickname', 'n')
    await fill(wrapper, '#password', 'pw')
    await fill(wrapper, '#confirmPassword', 'pw')
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(wrapper.text()).toContain('Activation key invalid.')
    expect(useAuthStore().isAuthenticated).toBe(false)
  })
})

describe('NotFoundView', () => {
  it('explains the page is missing and links home', async () => {
    const { wrapper } = await mountAt(NotFoundView, '/')

    expect(wrapper.get('h1').text()).toBe('Page not found')
    expect(wrapper.get('a').attributes('href')).toBe('/')
  })
})
