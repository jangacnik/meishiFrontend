<script setup lang="ts">
import { onMounted, ref } from 'vue'
import * as api from '../lib/api'
import { authorizeTarget, cancelUrl } from '../lib/oauthCancel'

const props = defineProps<{ redirect: unknown }>()

const href = ref<string | null>(null)
const appName = ref('')

// The link only appears once Meishi has confirmed the client and that exact redirect URI are registered.
onMounted(async () => {
  const target = authorizeTarget(props.redirect)
  if (!target) return
  try {
    const client = await api.getOAuthClient({ client_id: target.clientId, redirect_uri: target.redirectUri })
    href.value = cancelUrl(target.redirectUri, target.state)
    appName.value = client.name
  } catch {
    href.value = null
  }
})
</script>

<template>
  <p v-if="href" class="muted oauth-cancel">
    <a :href="href">Cancel and go back to {{ appName }}</a>
  </p>
</template>
