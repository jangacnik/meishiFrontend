<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import * as api from '../lib/api'
import AppIcon from './AppIcon.vue'

const route = useRoute()
const link = ref<{ href: string; name: string } | null>(null)

onMounted(async () => {
  const clientId = route.query.client_id
  const returnUri = route.query.return_uri
  if (typeof clientId !== 'string' || typeof returnUri !== 'string') return
  try {
    const client = await api.getOAuthClient({ client_id: clientId, return_uri: returnUri })
    link.value = { href: returnUri, name: client.name }
  } catch {
    link.value = null
  }
})
</script>

<template>
  <a v-if="link" :href="link.href" class="return-link">
    <AppIcon name="undo" />
    Back to {{ link.name }}
  </a>
</template>

<style scoped>
.return-link {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-weight: 600;
}
</style>
