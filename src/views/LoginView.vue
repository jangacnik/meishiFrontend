<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import InputText from 'primevue/inputtext'
import Password from 'primevue/password'
import Button from 'primevue/button'
import Message from 'primevue/message'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const auth = useAuthStore()

const nickname = ref('')
const password = ref('')
const error = ref<string | null>(null)
const loading = ref(false)

async function submit() {
  error.value = null
  loading.value = true
  try {
    await auth.login(nickname.value, password.value)
    router.push('/')
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'login failed'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="page auth-page">
    <div class="card stack">
      <h1>Log in</h1>
      <form class="stack" @submit.prevent="submit">
        <div class="field">
          <label for="nickname">Nickname</label>
          <InputText id="nickname" v-model="nickname" autofocus />
        </div>
        <div class="field">
          <label for="password">Password</label>
          <Password id="password" v-model="password" :feedback="false" toggle-mask fluid />
        </div>
        <Message v-if="error" severity="error">{{ error }}</Message>
        <Button type="submit" label="Log in" :loading="loading" fluid />
      </form>
      <p class="muted">Have an activation key? <RouterLink to="/register">Register</RouterLink></p>
    </div>
  </div>
</template>

<style scoped>
.auth-page {
  max-width: 26rem;
  padding-top: 4rem;
}
</style>
