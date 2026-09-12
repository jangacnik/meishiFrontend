<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import InputText from 'primevue/inputtext'
import Password from 'primevue/password'
import Button from 'primevue/button'
import Message from 'primevue/message'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()

const activationKey = ref(typeof route.query.key === 'string' ? route.query.key : '')
const nickname = ref('')
const password = ref('')
const error = ref<string | null>(null)
const loading = ref(false)

async function submit() {
  error.value = null
  loading.value = true
  try {
    await auth.register(activationKey.value, nickname.value, password.value)
    router.push('/')
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'registration failed'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="page auth-page">
    <div class="card stack">
      <h1>Register</h1>
      <form class="stack" @submit.prevent="submit">
        <div class="field">
          <label for="activationKey">Activation key</label>
          <InputText id="activationKey" v-model="activationKey" />
        </div>
        <div class="field">
          <label for="nickname">Nickname</label>
          <InputText id="nickname" v-model="nickname" />
        </div>
        <div class="field">
          <label for="password">Password</label>
          <Password id="password" v-model="password" toggle-mask fluid />
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
  max-width: 26rem;
  padding-top: 4rem;
}
</style>
