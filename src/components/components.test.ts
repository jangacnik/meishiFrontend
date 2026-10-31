import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import PrimeVue from 'primevue/config'
import AppIcon, { type IconName } from './AppIcon.vue'
import BrandMark from './BrandMark.vue'
import UserActions from './UserActions.vue'
import type { UserSummary } from '../lib/api'

const user: UserSummary = {
  id: 'u1',
  nickname: 'sushi',
  role: 'USER',
  status: 'ACTIVE',
  activated: true,
  createdAt: '2026-01-01T00:00:00Z',
  deletionRequestedAt: null,
}

function mountActions(overrides: Partial<UserSummary> = {}, props: { busy?: boolean; isSelf?: boolean } = {}) {
  return mount(UserActions, {
    props: { user: { ...user, ...overrides }, busy: false, isSelf: false, ...props },
    global: { plugins: [PrimeVue] },
  })
}

const button = (wrapper: ReturnType<typeof mountActions>, text: string) =>
  wrapper.findAll('button').find((b) => b.text().includes(text))!

describe('AppIcon', () => {
  it.each<[IconName, number]>([
    ['trash', 3],
    ['snowflake', 2],
    ['check', 1],
    ['x', 2],
  ])('draws %s with %i paths', (name, paths) => {
    const wrapper = mount(AppIcon, { props: { name } })
    expect(wrapper.findAll('path')).toHaveLength(paths)
  })

  it('defaults to 14px and honours a custom size', () => {
    expect(mount(AppIcon, { props: { name: 'key' } }).attributes('width')).toBe('14')
    expect(mount(AppIcon, { props: { name: 'key', size: 30 } }).attributes('height')).toBe('30')
  })
})

describe('BrandMark', () => {
  it('renders an svg', () => {
    expect(mount(BrandMark).element.tagName.toLowerCase()).toBe('svg')
  })
})

describe('UserActions', () => {
  it('emits edit, setPassword, freeze and remove from the matching buttons', async () => {
    const wrapper = mountActions()

    await button(wrapper, 'Edit').trigger('click')
    await button(wrapper, 'Set password').trigger('click')
    await button(wrapper, 'Freeze').trigger('click')
    await button(wrapper, 'Delete user').trigger('click')

    expect(Object.keys(wrapper.emitted())).toEqual(expect.arrayContaining(['edit', 'setPassword', 'freeze', 'remove']))
  })

  it('shows Unfreeze instead of Freeze for a frozen account and emits unfreeze', async () => {
    const wrapper = mountActions({ status: 'FROZEN' })

    expect(wrapper.text()).not.toMatch(/\bFreeze\b/)
    await button(wrapper, 'Unfreeze').trigger('click')

    expect(wrapper.emitted('unfreeze')).toHaveLength(1)
  })

  it('labels the delete button differently when deletion was requested', () => {
    expect(mountActions({ deletionRequestedAt: '2026-02-01T00:00:00Z' }).text()).toContain('Confirm & delete user')
  })

  it('disables freeze and delete for the current user but not edit', () => {
    const wrapper = mountActions({}, { isSelf: true })

    expect(button(wrapper, 'Freeze').attributes('disabled')).toBeDefined()
    expect(button(wrapper, 'Delete user').attributes('disabled')).toBeDefined()
    expect(button(wrapper, 'Edit').attributes('disabled')).toBeUndefined()
  })

  it('disables every action while busy', () => {
    const wrapper = mountActions({}, { busy: true })

    expect(wrapper.findAll('button').every((b) => b.attributes('disabled') !== undefined)).toBe(true)
  })
})
