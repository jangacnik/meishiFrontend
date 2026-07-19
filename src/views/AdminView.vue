<script setup lang="ts">
import { onMounted, ref } from 'vue'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import Select from 'primevue/select'
import Tag from 'primevue/tag'
import Message from 'primevue/message'
import * as api from '../lib/api'
import type { Role, UserSummary } from '../lib/api'
import { useAuthStore } from '../stores/auth'

const auth = useAuthStore()
const users = ref<UserSummary[]>([])
const error = ref<string | null>(null)

const roleOptions: Role[] = ['USER', 'ADMIN']

const createDialogOpen = ref(false)
const createRole = ref<Role>('USER')
const createdActivationKey = ref<string | null>(null)

async function refresh() {
  if (!auth.token) return
  error.value = null
  try {
    users.value = await api.listUsers(auth.token)
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'failed to load users'
  }
}

async function submitCreate() {
  if (!auth.token) return
  try {
    const created = await api.createUser(auth.token, createRole.value)
    createdActivationKey.value = created.activationKey
    await refresh()
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'failed to create user'
  }
}

async function changeRole(user: UserSummary, role: Role) {
  if (!auth.token) return
  try {
    await api.updateUserRole(auth.token, user.id, role)
    await refresh()
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'failed to update role'
  }
}

async function remove(user: UserSummary) {
  if (!auth.token) return
  try {
    await api.deleteUser(auth.token, user.id)
    await refresh()
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'failed to delete user'
  }
}

function openCreateDialog() {
  createRole.value = 'USER'
  createdActivationKey.value = null
  createDialogOpen.value = true
}

onMounted(refresh)
</script>

<template>
  <div class="admin">
    <h1>Users</h1>
    <Message v-if="error" severity="error">{{ error }}</Message>

    <Button label="Create user" @click="openCreateDialog" />

    <DataTable :value="users" data-key="id" class="users-table">
      <Column field="nickname" header="Nickname">
        <template #body="{ data }">{{ data.nickname ?? '(pending activation)' }}</template>
      </Column>
      <Column field="role" header="Role">
        <template #body="{ data }">
          <Select
            :model-value="data.role"
            :options="roleOptions"
            @update:model-value="(role: Role) => changeRole(data, role)"
          />
        </template>
      </Column>
      <Column field="activated" header="Activated">
        <template #body="{ data }">
          <Tag :severity="data.activated ? 'success' : 'warn'" :value="data.activated ? 'yes' : 'no'" />
        </template>
      </Column>
      <Column field="createdAt" header="Created" />
      <Column header="">
        <template #body="{ data }">
          <Button label="Delete" severity="danger" size="small" @click="remove(data)" />
        </template>
      </Column>
    </DataTable>

    <Dialog v-model:visible="createDialogOpen" header="Create user" modal>
      <div v-if="!createdActivationKey">
        <div class="field">
          <label for="role">Role</label>
          <Select id="role" v-model="createRole" :options="roleOptions" />
        </div>
        <Button label="Create" @click="submitCreate" />
      </div>
      <div v-else>
        <p>User created. Share this activation key so they can register:</p>
        <code>{{ createdActivationKey }}</code>
      </div>
    </Dialog>
  </div>
</template>

<style scoped>
.admin {
  max-width: 60rem;
  margin: 2rem auto;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
.users-table {
  margin-top: 1rem;
}
.field {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  margin-bottom: 1rem;
}
</style>
