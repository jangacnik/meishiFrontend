<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import InputText from 'primevue/inputtext'
import Password from 'primevue/password'
import Button from 'primevue/button'
import Message from 'primevue/message'
import { errorMessage } from '../lib/messages'
import { ApiError } from '../lib/api'
import BrandMark from '../components/BrandMark.vue'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()

const nickname = ref('')
const password = ref('')
const nicknameError = ref<string | null>(null)
const passwordError = ref<string | null>(null)
const error = ref<string | null>(null)
const loading = ref(false)

watch(nickname, () => (nicknameError.value = null))
watch(password, () => (passwordError.value = null))

const sessionExpired = route.query.expired === '1'

function redirectTarget(): string {
  const redirect = route.query.redirect
  return typeof redirect === 'string' && redirect.startsWith('/') && !redirect.startsWith('//') ? redirect : '/'
}

async function submit() {
  error.value = null
  nicknameError.value = nickname.value.trim() ? null : 'Enter your nickname.'
  passwordError.value = password.value ? null : 'Enter your password.'
  if (nicknameError.value || passwordError.value) return
  loading.value = true
  try {
    await auth.login(nickname.value, password.value)
    router.push(redirectTarget())
  } catch (e) {
    error.value =
      e instanceof ApiError && e.status === 401
        ? 'Login failed. Check your nickname and password.'
        : errorMessage(e, 'Login failed. Try again.')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="page auth-page">
    <div class="auth-head">
      <BrandMark :size="40" />
      <h1>Log in</h1>
      <p class="muted">Your Meishi account also signs you in to Omiyage, the souvenir shop.</p>
    </div>
    <div class="card stack">
      <form class="stack" novalidate @submit.prevent="submit">
        <div class="field">
          <label for="nickname">Nickname</label>
          <InputText
            id="nickname"
            v-model="nickname"
            autofocus
            autocomplete="username"
            autocapitalize="off"
            autocorrect="off"
            spellcheck="false"
            required
            :invalid="!!nicknameError"
            :aria-invalid="!!nicknameError"
            :aria-describedby="nicknameError ? 'nickname-error' : undefined"
          />
          <Message v-if="nicknameError" id="nickname-error" severity="error" size="small" variant="simple">
            {{ nicknameError }}
          </Message>
        </div>
        <div class="field">
          <label for="password">Password</label>
          <Password
            v-model="password"
            input-id="password"
            :feedback="false"
            toggle-mask
            fluid
            :invalid="!!passwordError"
            :input-props="{
              required: true,
              autocomplete: 'current-password',
              'aria-invalid': !!passwordError,
              'aria-describedby': passwordError ? 'password-error' : undefined,
            }"
          />
          <Message v-if="passwordError" id="password-error" severity="error" size="small" variant="simple">
            {{ passwordError }}
          </Message>
        </div>
        <Message v-if="sessionExpired && !error" severity="info">Session expired. Log in again.</Message>
        <Message v-if="error" severity="error">{{ error }}</Message>
        <Button type="submit" label="Log in" :loading="loading" fluid />
      </form>
      <p class="muted">Have an activation key? <RouterLink to="/register">Register</RouterLink></p>
    </div>
  </div>
</template>

<style scoped>
.auth-page {
  max-width: 24rem;
  padding-top: 3.5rem;
}
.auth-head {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.35rem;
  text-align: center;
  margin-bottom: 1.25rem;
}
.auth-head h1 {
  margin: 0;
}
.auth-head .muted {
  font-size: 0.875rem;
}
</style>
