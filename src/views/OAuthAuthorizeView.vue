<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Message from 'primevue/message'
import BrandMark from '../components/BrandMark.vue'
import * as api from '../lib/api'
import { errorMessage } from '../lib/messages'
import { leaveTo } from '../lib/navigation'
import { useAuthStore } from '../stores/auth'

const PARAMS = [
  'response_type',
  'client_id',
  'redirect_uri',
  'state',
  'code_challenge',
  'code_challenge_method',
] as const
const INVALID_LINK = 'This sign-in link is not valid. Go back to the app and try again.'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const appName = ref<string | null>(null)
const error = ref<string | null>(null)

function readRequest(): api.AuthorizeRequest | null {
  const request: Record<string, string> = {}
  for (const key of PARAMS) {
    const value = route.query[key]
    if (typeof value !== 'string' || value === '') return null
    request[key] = value
  }
  return request as unknown as api.AuthorizeRequest
}

onMounted(async () => {
  const authorizeRequest = readRequest()
  if (!authorizeRequest) {
    error.value = INVALID_LINK
    return
  }
  try {
    const client = await api.getOAuthClient({
      client_id: authorizeRequest.client_id,
      redirect_uri: authorizeRequest.redirect_uri,
    })
    appName.value = client.name
    if (!auth.token) {
      await router.replace({ name: 'login', query: { redirect: route.fullPath } })
      return
    }
    const { redirectUrl } = await api.authorize(auth.token, authorizeRequest)
    leaveTo(redirectUrl)
  } catch (e) {
    error.value =
      e instanceof api.ApiError && e.status === 400 ? INVALID_LINK : errorMessage(e, 'Sign-in failed. Try again.')
  }
})
</script>

<template>
  <div class="page auth-page">
    <div class="auth-head">
      <BrandMark :size="40" />
      <h1>{{ error ? 'Cannot sign you in' : appName ? `Signing you in to ${appName}` : 'Signing you in' }}</h1>
    </div>
    <Message v-if="error" severity="error">{{ error }}</Message>
    <p v-else class="muted" role="status">One moment…</p>
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
</style>
