<script setup lang="ts">
import Button from 'primevue/button'
import type { UserSummary } from '../lib/api'
import AppIcon from './AppIcon.vue'

defineProps<{ user: UserSummary; busy: boolean }>()
defineEmits<{
  edit: []
  setPassword: []
  freeze: []
  unfreeze: []
  remove: []
}>()
</script>

<template>
  <div class="user-actions">
    <div class="row">
      <Button class="icon-btn" severity="secondary" size="small" outlined :disabled="busy" @click="$emit('edit')">
        <AppIcon name="pencil" :size="13" />
        Edit
      </Button>
      <Button class="icon-btn" severity="secondary" size="small" outlined :disabled="busy" @click="$emit('setPassword')">
        <AppIcon name="key" :size="13" />
        Set password
      </Button>
      <Button
        v-if="user.status === 'FROZEN'"
        class="icon-btn"
        severity="info"
        size="small"
        outlined
        :disabled="busy"
        @click="$emit('unfreeze')"
      >
        <AppIcon name="sun" :size="13" />
        Unfreeze
      </Button>
      <Button v-else class="icon-btn" severity="info" size="small" :disabled="busy" @click="$emit('freeze')">
        <AppIcon name="snowflake" :size="13" />
        Freeze
      </Button>
    </div>
    <div class="row delete-row">
      <Button class="icon-btn" severity="danger" size="small" :disabled="busy" @click="$emit('remove')">
        <AppIcon name="trash" :size="13" />
        {{ user.deletionRequestedAt ? 'Confirm & delete' : 'Delete' }}
      </Button>
    </div>
  </div>
</template>

<style scoped>
.user-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.75rem 1.5rem;
}
</style>
