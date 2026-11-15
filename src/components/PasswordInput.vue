<script setup lang="ts">
import { nextTick, ref } from 'vue'
import Password from 'primevue/password'
import AppIcon from './AppIcon.vue'

const password = ref<{ $el: HTMLElement } | null>(null)

// PrimeVue swaps the show/hide slot for the other one, which replaces the button element and
// drops keyboard focus; put it back on the new button.
async function toggle(toggleCallback: () => void) {
  toggleCallback()
  await nextTick()
  const button = password.value?.$el.querySelector<HTMLButtonElement>('.password-toggle')
  button?.focus()
}
</script>

<template>
  <Password ref="password" toggle-mask>
    <template #unmaskicon="{ toggleCallback }">
      <button type="button" class="password-toggle" aria-label="Show password" :aria-pressed="false" @click="toggle(toggleCallback)">
        <AppIcon name="eye" :size="18" />
      </button>
    </template>
    <template #maskicon="{ toggleCallback }">
      <button type="button" class="password-toggle" aria-label="Show password" :aria-pressed="true" @click="toggle(toggleCallback)">
        <AppIcon name="eye-off" :size="18" />
      </button>
    </template>
  </Password>
</template>
