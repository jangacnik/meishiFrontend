<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import InputText from 'primevue/inputtext'
import Password from 'primevue/password'
import Button from 'primevue/button'
import Message from 'primevue/message'
import { errorMessage } from '../lib/messages'
import BrandMark from '../components/BrandMark.vue'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()

const activationKey = ref(typeof route.query.key === 'string' ? route.query.key : '')
const nickname = ref('')
const password = ref('')
const confirmPassword = ref('')
const errors = ref<Record<string, string>>({})
const error = ref<string | null>(null)
const loading = ref(false)

watch(activationKey, () => delete errors.value.activationKey)
watch(nickname, () => delete errors.value.nickname)
watch(password, () => delete errors.value.password)
watch(confirmPassword, () => delete errors.value.confirmPassword)

async function submit() {
  error.value = null
  errors.value = {}
  if (!activationKey.value.trim()) errors.value.activationKey = 'Enter your activation key.'
  if (!nickname.value.trim()) errors.value.nickname = 'Choose a nickname.'
  if (!password.value) errors.value.password = 'Choose a password.'
  else if (password.value !== confirmPassword.value) errors.value.confirmPassword = 'Passwords do not match.'
  if (Object.keys(errors.value).length > 0) return
  loading.value = true
  try {
    await auth.register(activationKey.value, nickname.value, password.value)
    router.push('/')
  } catch (e) {
    error.value = errorMessage(e, 'Registration failed. Check your activation key and try again.')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="page auth-page">
    <div class="auth-head">
      <BrandMark :size="40" />
      <h1>Register</h1>
      <p class="muted">Activation keys come from an admin.</p>
    </div>
    <div class="card stack">
      <form class="stack" novalidate @submit.prevent="submit">
        <div class="field">
          <label for="activationKey">Activation key</label>
          <InputText
            id="activationKey"
            v-model="activationKey"
            autocomplete="off"
            autocapitalize="off"
            autocorrect="off"
            spellcheck="false"
            required
            :invalid="!!errors.activationKey"
            :aria-invalid="!!errors.activationKey"
            :aria-describedby="errors.activationKey ? 'activationKey-error' : undefined"
          />
          <Message v-if="errors.activationKey" id="activationKey-error" severity="error" size="small" variant="simple">
            {{ errors.activationKey }}
          </Message>
        </div>
        <div class="field">
          <label for="nickname">Nickname</label>
          <InputText
            id="nickname"
            v-model="nickname"
            autocomplete="username"
            autocapitalize="off"
            autocorrect="off"
            spellcheck="false"
            required
            :invalid="!!errors.nickname"
            :aria-invalid="!!errors.nickname"
            :aria-describedby="errors.nickname ? 'nickname-error' : undefined"
          />
          <Message v-if="errors.nickname" id="nickname-error" severity="error" size="small" variant="simple">
            {{ errors.nickname }}
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
            :invalid="!!errors.password"
            :input-props="{
              required: true,
              autocomplete: 'new-password',
              'aria-invalid': !!errors.password,
              'aria-describedby': errors.password ? 'password-error' : undefined,
            }"
          />
          <Message v-if="errors.password" id="password-error" severity="error" size="small" variant="simple">
            {{ errors.password }}
          </Message>
        </div>
        <div class="field">
          <label for="confirmPassword">Confirm password</label>
          <Password
            v-model="confirmPassword"
            input-id="confirmPassword"
            :feedback="false"
            toggle-mask
            fluid
            :invalid="!!errors.confirmPassword"
            :input-props="{
              required: true,
              autocomplete: 'new-password',
              'aria-invalid': !!errors.confirmPassword,
              'aria-describedby': errors.confirmPassword ? 'confirmPassword-error' : undefined,
            }"
          />
          <Message
            v-if="errors.confirmPassword"
            id="confirmPassword-error"
            severity="error"
            size="small"
            variant="simple"
          >
            {{ errors.confirmPassword }}
          </Message>
        </div>
        <Message v-if="error" severity="error">{{ error }}</Message>
        <Button type="submit" label="Register" :loading="loading" fluid />
      </form>
      <p class="muted">Already registered? <RouterLink to="/login">Log in</RouterLink></p>
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
