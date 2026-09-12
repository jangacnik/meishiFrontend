<script setup lang="ts">
import { onMounted, ref } from 'vue'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import Select from 'primevue/select'
import Tag from 'primevue/tag'
import Message from 'primevue/message'
import { useConfirm } from 'primevue/useconfirm'
import { useToast } from 'primevue/usetoast'
import * as api from '../lib/api'
import type { Role, UserSummary } from '../lib/api'
import { useAuthStore } from '../stores/auth'

const auth = useAuthStore()
const confirm = useConfirm()
const toast = useToast()
const users = ref<UserSummary[]>([])
const error = ref<string | null>(null)

const roleOptions: Role[] = ['USER', 'ADMIN']

const createDialogOpen = ref(false)
const createRole = ref<Role>('USER')
const createdActivationKey = ref<string | null>(null)
const copied = ref(false)

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
    copied.value = false
    await refresh()
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'failed to create user'
  }
}

async function copyActivationKey() {
  if (!createdActivationKey.value) return
  try {
    await navigator.clipboard.writeText(createdActivationKey.value)
    copied.value = true
    toast.add({ severity: 'success', summary: 'Copied to clipboard', life: 2000 })
  } catch {
    error.value = 'could not copy — select and copy manually'
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

async function freeze(user: UserSummary) {
  if (!auth.token) return
  try {
    await api.updateUserStatus(auth.token, user.id, 'FROZEN')
    toast.add({ severity: 'success', summary: 'Account frozen', life: 2500 })
    await refresh()
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'failed to freeze account'
  }
}

async function unfreeze(user: UserSummary) {
  if (!auth.token) return
  try {
    await api.updateUserStatus(auth.token, user.id, 'ACTIVE')
    toast.add({ severity: 'success', summary: 'Account unfrozen', life: 2500 })
    await refresh()
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'failed to unfreeze account'
  }
}

function confirmFreeze(user: UserSummary) {
  const label = user.nickname ?? '(pending activation)'
  confirm.require({
    header: 'Freeze account',
    message: `Freeze ${label}? They won't be able to log in to Meishi or Omiyage until unfrozen.`,
    acceptLabel: 'Freeze',
    acceptProps: { severity: 'danger' },
    rejectLabel: 'Cancel',
    accept: () => freeze(user),
  })
}

async function remove(user: UserSummary) {
  if (!auth.token) return
  try {
    await api.deleteUser(auth.token, user.id)
    toast.add({ severity: 'success', summary: 'User deleted', life: 2500 })
    await refresh()
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'failed to delete user'
  }
}

function confirmRemove(user: UserSummary) {
  const label = user.nickname ?? '(pending activation)'
  confirm.require({
    header: 'Delete user',
    message: `Delete ${label}? This can't be undone.`,
    acceptLabel: 'Delete',
    acceptProps: { severity: 'danger' },
    rejectLabel: 'Cancel',
    accept: () => remove(user),
  })
}

function confirmRemoveRequested(user: UserSummary) {
  const label = user.nickname ?? '(pending activation)'
  confirm.require({
    header: 'Confirm account deletion',
    message: `${label} requested account deletion. Delete their account now?`,
    acceptLabel: 'Delete account',
    acceptProps: { severity: 'danger' },
    rejectLabel: 'Not yet',
    accept: () => remove(user),
  })
}

function openCreateDialog() {
  createRole.value = 'USER'
  createdActivationKey.value = null
  copied.value = false
  createDialogOpen.value = true
}

onMounted(refresh)
</script>

<template>
  <div class="page-wide stack">
    <h1>Users</h1>
    <Message v-if="error" severity="error">{{ error }}</Message>

    <Button label="Create user" class="create-user-btn" @click="openCreateDialog" />

    <div class="table-scroll">
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
        <Column field="status" header="Status">
          <template #body="{ data }: { data: UserSummary }">
            <Tag :severity="data.status === 'FROZEN' ? 'danger' : 'success'" :value="data.status" />
          </template>
        </Column>
        <Column field="activated" header="Activated">
          <template #body="{ data }">
            <Tag :severity="data.activated ? 'success' : 'warn'" :value="data.activated ? 'yes' : 'no'" />
          </template>
        </Column>
        <Column header="Deletion">
          <template #body="{ data }: { data: UserSummary }">
            <Tag v-if="data.deletionRequestedAt" severity="danger" value="requested" />
            <span v-else class="muted">—</span>
          </template>
        </Column>
        <Column field="createdAt" header="Created" />
        <Column header="">
          <template #body="{ data }: { data: UserSummary }">
            <div class="row">
              <Button
                v-if="data.status === 'FROZEN'"
                label="Unfreeze"
                severity="secondary"
                size="small"
                @click="unfreeze(data)"
              />
              <Button v-else label="Freeze" severity="warn" size="small" @click="confirmFreeze(data)" />
              <Button
                v-if="data.deletionRequestedAt"
                label="Confirm & delete"
                severity="danger"
                size="small"
                @click="confirmRemoveRequested(data)"
              />
              <Button v-else label="Delete" severity="danger" size="small" @click="confirmRemove(data)" />
            </div>
          </template>
        </Column>
      </DataTable>
    </div>

    <Dialog v-model:visible="createDialogOpen" header="Create user" modal>
      <div v-if="!createdActivationKey">
        <div class="field">
          <label for="role">Role</label>
          <Select id="role" v-model="createRole" :options="roleOptions" />
        </div>
        <Button label="Create" @click="submitCreate" />
      </div>
      <div v-else class="stack">
        <p>User created. Share this activation key so they can register:</p>
        <div class="row">
          <code>{{ createdActivationKey }}</code>
          <Button
            :label="copied ? 'Copied' : 'Copy'"
            :icon="copied ? 'pi pi-check' : 'pi pi-copy'"
            size="small"
            severity="secondary"
            @click="copyActivationKey"
          />
        </div>
      </div>
    </Dialog>
  </div>
</template>

<style scoped>
.page-wide {
  width: 100%;
  max-width: 60rem;
  margin: 0 auto;
  padding: 2rem 1.25rem;
}
.table-scroll {
  overflow-x: auto;
}
.create-user-btn {
  align-self: flex-start;
}
</style>
