import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import PrimeVue from 'primevue/config'
import Select from 'primevue/select'
import AdminView from './AdminView.vue'
import UserActions from '../components/UserActions.vue'
import { ApiError, type UserSummary } from '../lib/api'

const confirmRequire = vi.fn()
const toastAdd = vi.fn()
vi.mock('primevue/useconfirm', () => ({ useConfirm: () => ({ require: confirmRequire }) }))
vi.mock('primevue/usetoast', () => ({ useToast: () => ({ add: toastAdd }) }))
vi.mock('../lib/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../lib/api')>()),
  listUsers: vi.fn(),
  createUser: vi.fn(),
  updateUserRole: vi.fn(),
  updateUserStatus: vi.fn(),
  deleteUser: vi.fn(),
  adminUpdateUser: vi.fn(),
  adminSetPassword: vi.fn(),
}))

import * as api from '../lib/api'

const DialogStub = { props: ['visible', 'header'], template: '<section v-if="visible"><h2>{{ header }}</h2><slot /></section>' }

const admin: UserSummary = {
  id: 'self',
  nickname: 'boss',
  role: 'ADMIN',
  status: 'ACTIVE',
  activated: true,
  createdAt: '2026-01-01T00:00:00Z',
  deletionRequestedAt: null,
}
const alice: UserSummary = { ...admin, id: 'u2', nickname: 'alice', role: 'USER' }
const pending: UserSummary = { ...alice, id: 'u3', nickname: null, activated: false }
const frozen: UserSummary = { ...alice, id: 'u4', nickname: 'frozen', status: 'FROZEN' }
const leaving: UserSummary = { ...alice, id: 'u5', nickname: 'leaving', deletionRequestedAt: '2026-02-01T00:00:00Z' }

async function mountAdmin(users: UserSummary[] = [admin, alice, pending, frozen, leaving], loadFailure?: Error) {
  const claims = { sub: 'self', nickname: 'boss', role: 'ADMIN', exp: Math.floor(Date.now() / 1000) + 3600 }
  localStorage.setItem('meishi.token', `h.${btoa(JSON.stringify(claims))}.s`)
  setActivePinia(createPinia())
  if (loadFailure) vi.mocked(api.listUsers).mockRejectedValue(loadFailure)
  else vi.mocked(api.listUsers).mockResolvedValue(users)
  const wrapper = mount(AdminView, { global: { plugins: [PrimeVue], stubs: { Dialog: DialogStub } } })
  await flushPromises()
  return wrapper
}

type Wrapper = Awaited<ReturnType<typeof mountAdmin>>

const actionsFor = (wrapper: Wrapper, id: string) =>
  wrapper.findAllComponents(UserActions).find((a) => a.props('user').id === id)!

const button = (wrapper: Wrapper, text: string) => wrapper.findAll('button').find((b) => b.text().includes(text))!

const lastConfirm = () => confirmRequire.mock.calls.at(-1)![0]

beforeEach(() => {
  localStorage.clear()
  confirmRequire.mockReset()
  toastAdd.mockReset()
  for (const fn of [api.listUsers, api.createUser, api.updateUserRole, api.updateUserStatus, api.deleteUser, api.adminUpdateUser, api.adminSetPassword]) {
    vi.mocked(fn).mockReset()
  }
  vi.mocked(api.updateUserRole).mockResolvedValue()
  vi.mocked(api.updateUserStatus).mockResolvedValue()
  vi.mocked(api.deleteUser).mockResolvedValue()
  vi.mocked(api.adminSetPassword).mockResolvedValue()
})

describe('AdminView listing', () => {
  it('lists every user in the table, with a placeholder for pending nicknames', async () => {
    const wrapper = await mountAdmin()

    const table = wrapper.get('.users-table').text()
    for (const name of ['boss', 'alice', 'frozen', 'leaving', '(pending activation)']) expect(table).toContain(name)
    expect(table).toContain('Frozen')
    expect(table).toContain('requested')
  })

  it('shows the card list with status badges for narrow screens', async () => {
    const wrapper = await mountAdmin()

    const cards = wrapper.get('ul.users-cards')
    expect(cards.findAll('li')).toHaveLength(5)
    expect(cards.text()).toContain('not activated')
    expect(cards.text()).toContain('deletion requested')
    expect(cards.findAll('li.row-frozen')).toHaveLength(1)
  })

  it('shows an empty state when there are no users', async () => {
    const wrapper = await mountAdmin([])

    expect(wrapper.text()).toContain('No users')
    expect(wrapper.find('ul.users-cards').exists()).toBe(false)
  })

  it('shows an error with a working retry when loading fails', async () => {
    const wrapper = await mountAdmin([], new ApiError('x', 500))
    expect(wrapper.text()).toContain('Something went wrong on our side.')

    vi.mocked(api.listUsers).mockResolvedValue([alice])
    await button(wrapper, 'Retry').trigger('click')
    await flushPromises()

    expect(wrapper.text()).not.toContain('Something went wrong')
    expect(wrapper.text()).toContain('alice')
  })

  it('disables role, freeze and delete controls for the signed-in admin only', async () => {
    const wrapper = await mountAdmin()

    expect(actionsFor(wrapper, 'self').props('isSelf')).toBe(true)
    expect(actionsFor(wrapper, 'u2').props('isSelf')).toBe(false)
    const selects = wrapper.findAllComponents(Select)
    expect(selects.filter((s) => s.props('disabled'))).toHaveLength(2)
  })
})

describe('AdminView row actions', () => {
  it('confirms then changes a role and reloads the list', async () => {
    const wrapper = await mountAdmin()
    const select = wrapper.findAllComponents(Select).find((s) => !s.props('disabled'))!

    select.vm.$emit('update:model-value', 'ADMIN')
    expect(lastConfirm().message).toContain('to ADMIN')
    expect(api.updateUserRole).not.toHaveBeenCalled()
    await lastConfirm().accept()

    expect(api.updateUserRole).toHaveBeenCalledWith(expect.any(String), 'u2', 'ADMIN')
    expect(api.listUsers).toHaveBeenCalledTimes(2)
  })

  it('confirms then freezes and unfreezes', async () => {
    const wrapper = await mountAdmin()

    actionsFor(wrapper, 'u2').vm.$emit('freeze')
    expect(lastConfirm().message).toContain('Freeze alice?')
    await lastConfirm().accept()
    expect(api.updateUserStatus).toHaveBeenLastCalledWith(expect.any(String), 'u2', 'FROZEN')
    expect(toastAdd).toHaveBeenLastCalledWith(expect.objectContaining({ summary: 'Account frozen' }))

    actionsFor(wrapper, 'u4').vm.$emit('unfreeze')
    await flushPromises()
    expect(api.updateUserStatus).toHaveBeenLastCalledWith(expect.any(String), 'u4', 'ACTIVE')
    expect(toastAdd).toHaveBeenLastCalledWith(expect.objectContaining({ summary: 'Account unfrozen' }))
  })

  it('names pending users as such in confirmations', async () => {
    const wrapper = await mountAdmin()

    actionsFor(wrapper, 'u3').vm.$emit('remove')

    expect(lastConfirm().message).toContain('(pending activation)')
  })

  it('confirms then deletes a user', async () => {
    const wrapper = await mountAdmin()

    actionsFor(wrapper, 'u2').vm.$emit('remove')
    expect(lastConfirm().message).toContain("Delete alice? This can't be undone.")
    await lastConfirm().accept()

    expect(api.deleteUser).toHaveBeenCalledWith(expect.any(String), 'u2')
    expect(toastAdd).toHaveBeenLastCalledWith(expect.objectContaining({ summary: 'User deleted' }))
  })

  it('uses the deletion-request wording for users who asked to leave', async () => {
    const wrapper = await mountAdmin()

    actionsFor(wrapper, 'u5').vm.$emit('remove')

    expect(lastConfirm().message).toContain('requested account deletion')
    expect(lastConfirm().rejectLabel).toBe('Not yet')
    await lastConfirm().accept()
    expect(api.deleteUser).toHaveBeenCalledWith(expect.any(String), 'u5')
  })

  it('reports a failed action in an error toast and does not reload', async () => {
    vi.mocked(api.deleteUser).mockRejectedValue(new ApiError('nope', 500))
    const wrapper = await mountAdmin()

    actionsFor(wrapper, 'u2').vm.$emit('remove')
    await lastConfirm().accept()

    expect(toastAdd).toHaveBeenLastCalledWith(expect.objectContaining({ severity: 'error', summary: 'Failed to delete user' }))
    expect(api.listUsers).toHaveBeenCalledTimes(1)
  })
})

describe('AdminView create user', () => {
  it('creates a user and shows a one-time registration link', async () => {
    vi.mocked(api.createUser).mockResolvedValue({ id: 'new', activationKey: 'a b&c' })
    const wrapper = await mountAdmin()

    await button(wrapper, 'Create user').trigger('click')
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(api.createUser).toHaveBeenCalledWith(expect.any(String), 'USER')
    expect(wrapper.get('code').text()).toBe(`${window.location.origin}/register?key=a%20b%26c`)
    expect(api.listUsers).toHaveBeenCalledTimes(2)
  })

  it('shows the error when creation fails', async () => {
    vi.mocked(api.createUser).mockRejectedValue(new ApiError('x', 500))
    const wrapper = await mountAdmin()

    await button(wrapper, 'Create user').trigger('click')
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(wrapper.text()).toContain('Something went wrong on our side.')
    expect(wrapper.find('code').exists()).toBe(false)
  })

  it('copies the link to the clipboard', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText } })
    vi.mocked(api.createUser).mockResolvedValue({ id: 'new', activationKey: 'k1' })
    const wrapper = await mountAdmin()
    await button(wrapper, 'Create user').trigger('click')
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    await button(wrapper, 'Copy link').trigger('click')
    await flushPromises()

    expect(writeText).toHaveBeenCalledWith(`${window.location.origin}/register?key=k1`)
    expect(toastAdd).toHaveBeenLastCalledWith(expect.objectContaining({ summary: 'Copied to clipboard' }))
    expect(wrapper.text()).toContain('Copied')
    vi.unstubAllGlobals()
  })

  it('tells the user to copy manually when the clipboard is unavailable', async () => {
    vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText: vi.fn().mockRejectedValue(new Error('denied')) } })
    vi.mocked(api.createUser).mockResolvedValue({ id: 'new', activationKey: 'k1' })
    const wrapper = await mountAdmin()
    await button(wrapper, 'Create user').trigger('click')
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    await button(wrapper, 'Copy link').trigger('click')
    await flushPromises()

    expect(toastAdd).toHaveBeenLastCalledWith(expect.objectContaining({ severity: 'error', summary: 'Could not copy' }))
    vi.unstubAllGlobals()
  })
})

describe('AdminView edit user', () => {
  async function openEdit(wrapper: Wrapper, id = 'u2') {
    actionsFor(wrapper, id).vm.$emit('edit')
    await flushPromises()
  }

  it('prefills the nickname and sends only the non-empty fields', async () => {
    vi.mocked(api.adminUpdateUser).mockResolvedValue({} as never)
    const wrapper = await mountAdmin()
    await openEdit(wrapper)
    expect((wrapper.get('#editNickname').element as HTMLInputElement).value).toBe('alice')
    await wrapper.get('#editCity').setValue('Kyoto')

    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(api.adminUpdateUser).toHaveBeenCalledWith(expect.any(String), 'u2', { nickname: 'alice', city: 'Kyoto' })
    expect(toastAdd).toHaveBeenLastCalledWith(expect.objectContaining({ summary: 'User updated' }))
    expect(wrapper.find('#editNickname').exists()).toBe(false)
  })

  it('leaves the nickname blank for a pending user', async () => {
    const wrapper = await mountAdmin()
    await openEdit(wrapper, 'u3')

    expect((wrapper.get('#editNickname').element as HTMLInputElement).value).toBe('')
  })

  it('keeps the dialog open and shows the error on failure', async () => {
    vi.mocked(api.adminUpdateUser).mockRejectedValue(new ApiError('nickname taken', 409))
    const wrapper = await mountAdmin()
    await openEdit(wrapper)

    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(wrapper.text()).toContain('Nickname taken.')
    expect(wrapper.find('#editNickname').exists()).toBe(true)
  })
})

describe('AdminView set password', () => {
  async function openPassword(wrapper: Wrapper) {
    actionsFor(wrapper, 'u2').vm.$emit('set-password')
    await flushPromises()
  }

  it('sets the password and closes the dialog', async () => {
    const wrapper = await mountAdmin()
    await openPassword(wrapper)
    await wrapper.get('#newUserPassword').setValue('s3cret')

    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(api.adminSetPassword).toHaveBeenCalledWith(expect.any(String), 'u2', 's3cret')
    expect(toastAdd).toHaveBeenLastCalledWith(expect.objectContaining({ summary: 'Password set' }))
    expect(wrapper.find('#newUserPassword').exists()).toBe(false)
  })

  it('shows the error when setting the password fails', async () => {
    vi.mocked(api.adminSetPassword).mockRejectedValue(new ApiError('too short', 400))
    const wrapper = await mountAdmin()
    await openPassword(wrapper)

    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(wrapper.text()).toContain('Too short.')
  })
})
