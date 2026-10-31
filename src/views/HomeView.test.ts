import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import PrimeVue from 'primevue/config'
import HomeView from './HomeView.vue'
import { ApiError, type MeUser } from '../lib/api'
import { useAuthStore } from '../stores/auth'

const confirmRequire = vi.fn()
const toastAdd = vi.fn()
vi.mock('primevue/useconfirm', () => ({ useConfirm: () => ({ require: confirmRequire }) }))
vi.mock('primevue/usetoast', () => ({ useToast: () => ({ add: toastAdd }) }))
vi.mock('../lib/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../lib/api')>()),
  getMe: vi.fn(),
  updateMe: vi.fn(),
  updateMyNickname: vi.fn(),
  changeMyPassword: vi.fn(),
  requestDeletion: vi.fn(),
  cancelDeletionRequest: vi.fn(),
}))

import * as api from '../lib/api'

const me: MeUser = {
  id: '1',
  nickname: 'sushi',
  role: 'USER',
  status: 'ACTIVE',
  activated: true,
  createdAt: '2026-01-01T00:00:00Z',
  email: 'a@b.co',
  phone: null,
  firstName: null,
  lastName: null,
  addressLine1: '1 Main St',
  addressLine2: null,
  postalCode: null,
  city: 'Kyoto',
  country: null,
  deletionRequestedAt: null,
}

function signIn(role: 'USER' | 'ADMIN' = 'USER') {
  const claims = { sub: '1', nickname: 'sushi', role, exp: Math.floor(Date.now() / 1000) + 3600 }
  localStorage.setItem('meishi.token', `h.${btoa(JSON.stringify(claims))}.s`)
}

async function mountHome(role: 'USER' | 'ADMIN' = 'USER') {
  signIn(role)
  setActivePinia(createPinia())
  const wrapper = mount(HomeView, { global: { plugins: [PrimeVue] } })
  await flushPromises()
  return wrapper
}

const submitForm = async (wrapper: Awaited<ReturnType<typeof mountHome>>, title: string) => {
  const form = wrapper.findAll('form').find((f) => f.find('h2').text() === title)!
  await form.trigger('submit')
  await flushPromises()
}

const buttonByText = (wrapper: Awaited<ReturnType<typeof mountHome>>, text: string) =>
  wrapper.findAll('button').find((b) => b.text().includes(text))!

beforeEach(() => {
  localStorage.clear()
  confirmRequire.mockReset()
  toastAdd.mockReset()
  vi.mocked(api.getMe).mockReset().mockResolvedValue(me)
  vi.mocked(api.updateMe).mockReset()
  vi.mocked(api.updateMyNickname).mockReset()
  vi.mocked(api.changeMyPassword).mockReset()
  vi.mocked(api.requestDeletion).mockReset()
  vi.mocked(api.cancelDeletionRequest).mockReset()
})

describe('HomeView', () => {
  it('greets the user, shows their role and fills the form from the profile', async () => {
    const wrapper = await mountHome()

    expect(wrapper.get('h1').text()).toBe('Welcome, sushi')
    expect(wrapper.text()).toContain('Member')
    expect((wrapper.get('#email').element as HTMLInputElement).value).toBe('a@b.co')
    expect((wrapper.get('#city').element as HTMLInputElement).value).toBe('Kyoto')
    expect((wrapper.get('#country').element as HTMLInputElement).value).toBe('')
  })

  it('shows the Admin pill for admins', async () => {
    expect((await mountHome('ADMIN')).text()).toContain('Admin')
  })

  it('offers a retry when the profile cannot be loaded', async () => {
    vi.mocked(api.getMe).mockRejectedValueOnce(new ApiError('x', 500))
    const wrapper = await mountHome()

    expect(wrapper.text()).toContain('Something went wrong on our side.')
    await buttonByText(wrapper, 'Retry').trigger('click')
    await flushPromises()

    expect(wrapper.find('#email').exists()).toBe(true)
  })

  describe('contact details', () => {
    it('rejects an invalid email without calling the API', async () => {
      const wrapper = await mountHome()
      await wrapper.get('#email').setValue('not-an-email')

      await submitForm(wrapper, 'Contact details')

      expect(wrapper.text()).toContain('Enter a valid email address.')
      expect(api.updateMe).not.toHaveBeenCalled()
    })

    it('saves the edited fields and confirms with a toast', async () => {
      vi.mocked(api.updateMe).mockResolvedValue(me)
      const wrapper = await mountHome()
      await wrapper.get('#city').setValue('Osaka')

      await submitForm(wrapper, 'Contact details')

      expect(api.updateMe).toHaveBeenCalledWith(expect.any(String), {
        email: 'a@b.co',
        addressLine1: '1 Main St',
        addressLine2: '',
        postalCode: '',
        city: 'Osaka',
        country: '',
      })
      expect(toastAdd).toHaveBeenCalledWith(expect.objectContaining({ severity: 'success', summary: 'Profile saved' }))
    })

    it('shows an error message when saving fails', async () => {
      vi.mocked(api.updateMe).mockRejectedValue(new ApiError('email taken', 409))
      const wrapper = await mountHome()

      await submitForm(wrapper, 'Contact details')

      expect(wrapper.text()).toContain('Email taken.')
    })
  })

  describe('nickname', () => {
    it('refuses a blank nickname', async () => {
      const wrapper = await mountHome()
      await wrapper.get('#nickname').setValue('   ')

      await submitForm(wrapper, 'Nickname')

      expect(wrapper.text()).toContain('Choose a nickname.')
      expect(api.updateMyNickname).not.toHaveBeenCalled()
    })

    it('saves the new nickname and updates the session', async () => {
      vi.mocked(api.updateMyNickname).mockResolvedValue(me)
      const wrapper = await mountHome()
      await wrapper.get('#nickname').setValue('ramen')

      await submitForm(wrapper, 'Nickname')

      expect(api.updateMyNickname).toHaveBeenCalledWith(expect.any(String), 'ramen')
      expect(useAuthStore().nickname).toBe('ramen')
      expect(wrapper.get('h1').text()).toBe('Welcome, ramen')
    })

    it('shows the server error when the nickname is rejected', async () => {
      vi.mocked(api.updateMyNickname).mockRejectedValue(new ApiError('nickname taken', 409))
      const wrapper = await mountHome()

      await submitForm(wrapper, 'Nickname')

      expect(wrapper.text()).toContain('Nickname taken.')
      expect(useAuthStore().nickname).toBe('sushi')
    })
  })

  describe('change password', () => {
    const fillPasswords = async (wrapper: Awaited<ReturnType<typeof mountHome>>, cur: string, next: string, confirm: string) => {
      await wrapper.get('#currentPassword').setValue(cur)
      await wrapper.get('#newPassword').setValue(next)
      await wrapper.get('#confirmPassword').setValue(confirm)
    }

    it('requires current and new password', async () => {
      const wrapper = await mountHome()

      await submitForm(wrapper, 'Change password')

      expect(wrapper.text()).toContain('Enter your current password.')
      expect(wrapper.text()).toContain('Choose a new password.')
      expect(api.changeMyPassword).not.toHaveBeenCalled()
    })

    it('rejects a mismatching confirmation', async () => {
      const wrapper = await mountHome()
      await fillPasswords(wrapper, 'old', 'new', 'different')

      await submitForm(wrapper, 'Change password')

      expect(wrapper.text()).toContain('Passwords do not match.')
      expect(api.changeMyPassword).not.toHaveBeenCalled()
    })

    it('changes the password and clears the inputs', async () => {
      vi.mocked(api.changeMyPassword).mockResolvedValue()
      const wrapper = await mountHome()
      await fillPasswords(wrapper, 'old', 'new', 'new')

      await submitForm(wrapper, 'Change password')

      expect(api.changeMyPassword).toHaveBeenCalledWith(expect.any(String), 'old', 'new')
      expect(toastAdd).toHaveBeenCalledWith(expect.objectContaining({ summary: 'Password changed' }))
      expect((wrapper.get('#currentPassword').element as HTMLInputElement).value).toBe('')
    })

    it('says the current password is wrong on 401', async () => {
      vi.mocked(api.changeMyPassword).mockRejectedValue(new ApiError('unauthorized', 401))
      const wrapper = await mountHome()
      await fillPasswords(wrapper, 'old', 'new', 'new')

      await submitForm(wrapper, 'Change password')

      expect(wrapper.text()).toContain('Current password is incorrect.')
    })

    it('shows a generic message for other failures', async () => {
      vi.mocked(api.changeMyPassword).mockRejectedValue(new ApiError('bad', 500))
      const wrapper = await mountHome()
      await fillPasswords(wrapper, 'old', 'new', 'new')

      await submitForm(wrapper, 'Change password')

      expect(wrapper.text()).toContain('Something went wrong on our side.')
    })
  })

  describe('account deletion', () => {
    it('asks for confirmation and requests deletion on accept', async () => {
      vi.mocked(api.requestDeletion).mockResolvedValue({ ...me, deletionRequestedAt: '2026-03-01T00:00:00Z' })
      const wrapper = await mountHome()

      await buttonByText(wrapper, 'Request account deletion').trigger('click')
      expect(api.requestDeletion).not.toHaveBeenCalled()
      await confirmRequire.mock.calls[0][0].accept()
      await flushPromises()

      expect(api.requestDeletion).toHaveBeenCalledOnce()
      expect(toastAdd).toHaveBeenCalledWith(expect.objectContaining({ summary: 'Deletion requested' }))
      expect(wrapper.text()).toContain('You requested deletion on')
    })

    it('can cancel a pending request', async () => {
      vi.mocked(api.getMe).mockResolvedValue({ ...me, deletionRequestedAt: '2026-03-01T00:00:00Z' })
      vi.mocked(api.cancelDeletionRequest).mockResolvedValue(me)
      const wrapper = await mountHome()

      await buttonByText(wrapper, 'Cancel request').trigger('click')
      await flushPromises()

      expect(api.cancelDeletionRequest).toHaveBeenCalledOnce()
      expect(wrapper.text()).toContain('Request account deletion')
    })

    it('reports a failed deletion request in an error toast', async () => {
      vi.mocked(api.requestDeletion).mockRejectedValue(new ApiError('x', 500))
      const wrapper = await mountHome()

      await buttonByText(wrapper, 'Request account deletion').trigger('click')
      await confirmRequire.mock.calls[0][0].accept()

      expect(toastAdd).toHaveBeenCalledWith(
        expect.objectContaining({ severity: 'error', summary: 'Could not request deletion' }),
      )
    })
  })
})
