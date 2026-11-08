/// <reference types="node" />
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'

const read = (file: string) => readFileSync(new URL(file, import.meta.url), 'utf8')
const styles = read('./style.css')
const app = read('./App.vue')

/** jsdom/happy-dom do no layout, so the 44px tap-target rules are pinned in the source and
 *  were measured in a real browser (see the PR). */
describe('tap targets', () => {
  it('gives every text input a 44px minimum height', () => {
    expect(styles).toMatch(/\.p-inputtext\s*\{[^}]*min-height:\s*2\.75rem/)
  })

  it('gives the inline switch links under the auth forms a 44px minimum height', () => {
    expect(styles).toMatch(/\.auth-switch a\s*\{[^}]*min-height:\s*2\.75rem/)
  })

  it('gives the brand and header links a 44px minimum height', () => {
    expect(app).toMatch(/\.brand\s*\{[^}]*min-height:\s*2\.75rem/)
    expect(app).toMatch(/\.links a\s*\{[^}]*min-height:\s*2\.75rem/)
  })
})

describe('heading focus', () => {
  it('draws no focus outline on a heading that only receives focus from the router', () => {
    expect(styles).toMatch(/h1\[tabindex='-1'\]:focus(-visible)?[^{]*\{[^}]*outline:\s*none/)
  })
})
