<script setup lang="ts">
import { onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import * as api from '../lib/api'
import { leaveTo } from '../lib/navigation'
import { useAuthStore } from '../stores/auth'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

/** Signs out first, then returns to the app only if the server confirms the return URI is registered for it. */
onMounted(async () => {
  auth.logout()
  const clientId = route.query.client_id
  const returnUri = route.query.return_uri
  if (typeof clientId === 'string' && typeof returnUri === 'string') {
    try {
      await api.getOAuthClient({ client_id: clientId, return_uri: returnUri })
      leaveTo(returnUri)
      return
    } catch {
      // An unregistered return URI falls through to the Meishi login page.
    }
  }
  await router.replace({ name: 'login' })
})
</script>

<template>
  <div class="page">
    <h1>Signing you out</h1>
    <p class="muted" role="status">One moment…</p>
  </div>
</template>
