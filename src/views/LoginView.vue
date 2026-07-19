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
  <div class="auth-form">
    <h1>Log in</h1>
    <form @submit.prevent="submit">
      <div class="field">
        <label for="nickname">Nickname</label>
        <InputText id="nickname" v-model="nickname" autofocus />
      </div>
      <div class="field">
        <label for="password">Password</label>
        <Password id="password" v-model="password" :feedback="false" toggle-mask />
      </div>
      <Message v-if="error" severity="error">{{ error }}</Message>
      <Button type="submit" label="Log in" :loading="loading" />
    </form>
    <p>
      Have an activation key? <RouterLink to="/register">Register</RouterLink>
    </p>
  </div>
</template>

<style scoped>
.auth-form {
  max-width: 24rem;
  margin: 4rem auto;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
.field {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  margin-bottom: 1rem;
}
form {
  display: flex;
  flex-direction: column;
}
</style>
