import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import router from './index'
import { useAuthStore } from '../stores/auth'

function makeToken(claims: object): string {
  return `h.${btoa(JSON.stringify(claims))}.s`
}

const future = () => Math.floor(Date.now() / 1000) + 3600

async function visit(path: string) {
  await router.push(path)
  return router.currentRoute.value
}

describe('router guards', () => {
  beforeEach(async () => {
    localStorage.clear()
    setActivePinia(createPinia())
    await router.push('/nowhere-start')
  })

  function signIn(role: 'USER' | 'ADMIN') {
    localStorage.setItem('meishi.token', makeToken({ sub: '1', nickname: 'n', role, exp: future() }))
    setActivePinia(createPinia())
  }

  it('redirects an anonymous visitor from a protected page to login with the redirect target', async () => {
    const route = await visit('/admin')

    expect(route.name).toBe('login')
    expect(route.query.redirect).toBe('/admin')
  })

  it('lets an anonymous visitor see login and register', async () => {
    expect((await visit('/login')).name).toBe('login')
    expect((await visit('/register')).name).toBe('register')
  })

  it('redirects a signed-in visitor away from guest-only pages', async () => {
    signIn('USER')

    expect((await visit('/login')).name).toBe('home')
    expect((await visit('/register')).name).toBe('home')
  })

  it('keeps non-admins out of the admin page', async () => {
    signIn('USER')

    expect((await visit('/admin')).name).toBe('home')
  })

  it('lets admins into the admin page', async () => {
    signIn('ADMIN')

    expect((await visit('/admin')).name).toBe('admin')
  })

  it('logs out and redirects when the stored session expired in memory', async () => {
    signIn('USER')
    const auth = useAuthStore()
    auth.claims = { ...auth.claims!, exp: 1 }

    const route = await visit('/')

    expect(auth.isAuthenticated).toBe(false)
    expect(route.name).toBe('login')
  })

  it('falls back to the not-found route and sets the page title', async () => {
    const route = await visit('/does/not/exist')

    expect(route.name).toBe('not-found')
    expect(document.title).toBe('Page not found - Meishi')
  })

  it('titles pages after their route', async () => {
    await visit('/login')

    expect(document.title).toBe('Log in - Meishi')
  })
})
