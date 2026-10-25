<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import InputText from 'primevue/inputtext'
import Password from 'primevue/password'
import Button from 'primevue/button'
import Message from 'primevue/message'
import BrandMark from '../components/BrandMark.vue'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()

const nickname = ref('')
const password = ref('')
const error = ref<string | null>(null)
const loading = ref(false)

const sessionExpired = route.query.expired === '1'

function redirectTarget(): string {
  const redirect = route.query.redirect
  return typeof redirect === 'string' && redirect.startsWith('/') && !redirect.startsWith('//') ? redirect : '/'
}

async function submit() {
  error.value = null
  loading.value = true
  try {
    await auth.login(nickname.value, password.value)
    router.push(redirectTarget())
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'login failed'
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
      <p class="muted">Your Meishi account signs you in to Omiyage too.</p>
    </div>
    <div class="card stack">
      <form class="stack" @submit.prevent="submit">
        <div class="field">
          <label for="nickname">Nickname</label>
          <InputText id="nickname" v-model="nickname" autofocus />
        </div>
        <div class="field">
          <label for="password">Password</label>
          <Password id="password" v-model="password" :feedback="false" toggle-mask fluid />
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
