import { beforeEach, describe, expect, it } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import PrimeVue from 'primevue/config'
import ConfirmationService from 'primevue/confirmationservice'
import ToastService from 'primevue/toastservice'
import { createMemoryHistory, createRouter } from 'vue-router'
import App from './App.vue'

function signIn(role: 'USER' | 'ADMIN') {
  const claims = { sub: '1', nickname: 'sushi', role, exp: Math.floor(Date.now() / 1000) + 3600 }
  localStorage.setItem('meishi.token', `h.${btoa(JSON.stringify(claims))}.s`)
}

async function mountApp(role?: 'USER' | 'ADMIN') {
  localStorage.clear()
  if (role) signIn(role)
  setActivePinia(createPinia())
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: { template: '<p>home page</p>' } },
      { path: '/login', component: { template: '<p>login page</p>' } },
      { path: '/admin', component: { template: '<p>admin page</p>' } },
    ],
  })
  await router.push('/')
  await router.isReady()
  const wrapper = mount(App, { global: { plugins: [PrimeVue, ConfirmationService, ToastService, router] } })
  return { wrapper, router }
}

const linkTexts = (wrapper: Awaited<ReturnType<typeof mountApp>>['wrapper']) =>
  wrapper.findAll('nav.links-desktop a').map((a) => a.text())

beforeEach(() => localStorage.clear())

describe('App shell', () => {
  it('offers log in and register to anonymous visitors', async () => {
    const { wrapper } = await mountApp()

    expect(linkTexts(wrapper)).toEqual(['Log in', 'Register'])
    expect(wrapper.text()).toContain('home page')
  })

  it('shows the account link and log out for members, without the admin link', async () => {
    const { wrapper } = await mountApp('USER')

    expect(linkTexts(wrapper)).toEqual(['Account (sushi)'])
    expect(wrapper.find('nav.links-desktop button').text()).toBe('Log out')
  })

  it('shows the Users link to admins', async () => {
    const { wrapper } = await mountApp('ADMIN')

    expect(linkTexts(wrapper)).toEqual(['Account (sushi)', 'Users'])
  })

  it('logs out, clears the session and goes to the login page', async () => {
    const { wrapper, router } = await mountApp('USER')

    await wrapper.get('nav.links-desktop button').trigger('click')
    await flushPromises()

    expect(localStorage.getItem('meishi.token')).toBeNull()
    expect(router.currentRoute.value.path).toBe('/login')
    expect(linkTexts(wrapper)).toEqual(['Log in', 'Register'])
  })

  it('toggles the mobile menu and closes it on Escape', async () => {
    const { wrapper } = await mountApp('USER')
    const toggle = wrapper.get('button.menu-btn')
    expect(wrapper.find('nav.links-mobile').exists()).toBe(false)

    await toggle.trigger('click')
    expect(toggle.attributes('aria-expanded')).toBe('true')
    expect(toggle.attributes('aria-label')).toBe('Close menu')
    expect(wrapper.find('nav.links-mobile').exists()).toBe(true)

    await wrapper.get('header.nav').trigger('keydown.esc')
    expect(wrapper.find('nav.links-mobile').exists()).toBe(false)
  })

  it('closes the mobile menu after navigating', async () => {
    const { wrapper, router } = await mountApp('ADMIN')
    await wrapper.get('button.menu-btn').trigger('click')

    await wrapper.get('nav.links-mobile a[href="/admin"]').trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.path).toBe('/admin')
    expect(wrapper.find('nav.links-mobile').exists()).toBe(false)
  })

  it('logs out from the mobile menu', async () => {
    const { wrapper, router } = await mountApp('USER')
    await wrapper.get('button.menu-btn').trigger('click')

    await wrapper.get('nav.links-mobile button').trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.path).toBe('/login')
    expect(wrapper.find('nav.links-mobile').exists()).toBe(false)
  })

  it('shows the anonymous links in the mobile menu', async () => {
    const { wrapper } = await mountApp()
    await wrapper.get('button.menu-btn').trigger('click')

    expect(wrapper.findAll('nav.links-mobile a').map((a) => a.text())).toEqual(['Log in', 'Register'])
  })

  it('moves focus to the main region from the skip link', async () => {
    const { wrapper } = await mountApp()
    const holder = document.createElement('div')
    document.body.appendChild(holder)
    wrapper.unmount()
    const attached = mount(App, {
      attachTo: holder,
      global: {
        plugins: [PrimeVue, ConfirmationService, ToastService, createRouter({ history: createMemoryHistory(), routes: [{ path: '/', component: { template: '<p />' } }] })],
      },
    })

    await attached.get('a.skip-link').trigger('click')

    expect(document.activeElement).toBe(attached.get('main').element)
    attached.unmount()
    holder.remove()
  })
})
