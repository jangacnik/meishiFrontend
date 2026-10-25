<script setup lang="ts">
import { onMounted, ref } from 'vue'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import Password from 'primevue/password'
import Select from 'primevue/select'
import Tag from 'primevue/tag'
import Message from 'primevue/message'
import { useConfirm } from 'primevue/useconfirm'
import { useToast } from 'primevue/usetoast'
import * as api from '../lib/api'
import type { AdminProfileUpdate, Role, UserSummary } from '../lib/api'
import { errorMessage } from '../lib/messages'
import AppIcon from '../components/AppIcon.vue'
import UserActions from '../components/UserActions.vue'
import { useAuthStore } from '../stores/auth'

const auth = useAuthStore()
const confirm = useConfirm()
const toast = useToast()
const users = ref<UserSummary[]>([])
const error = ref<string | null>(null)
const loading = ref(false)
const creating = ref(false)
const createError = ref<string | null>(null)
const busyUserId = ref<string | null>(null)

const roleOptions: Role[] = ['USER', 'ADMIN']

const createDialogOpen = ref(false)
const createRole = ref<Role>('USER')
const createdActivationKey = ref<string | null>(null)
const copied = ref(false)

const editDialogOpen = ref(false)
const editUserId = ref<string | null>(null)
const editError = ref<string | null>(null)
const editSaving = ref(false)
const editFields = ref({
  nickname: '',
  email: '',
  phone: '',
  firstName: '',
  lastName: '',
  addressLine1: '',
  addressLine2: '',
  postalCode: '',
  city: '',
  country: '',
})

const passwordDialogOpen = ref(false)
const passwordUserId = ref<string | null>(null)
const passwordError = ref<string | null>(null)
const passwordSaving = ref(false)
const newPassword = ref('')

async function refresh() {
  if (!auth.token) return
  error.value = null
  loading.value = true
  try {
    users.value = await api.listUsers(auth.token)
  } catch (e) {
    error.value = errorMessage(e, 'Could not load users.')
  } finally {
    loading.value = false
  }
}

async function submitCreate() {
  if (!auth.token || creating.value) return
  creating.value = true
  createError.value = null
  try {
    const created = await api.createUser(auth.token, createRole.value)
    createdActivationKey.value = created.activationKey
    copied.value = false
    await refresh()
  } catch (e) {
    createError.value = errorMessage(e, 'Could not create the user.')
  } finally {
    creating.value = false
  }
}

async function copyActivationKey() {
  if (!createdActivationKey.value) return
  try {
    await navigator.clipboard.writeText(createdActivationKey.value)
    copied.value = true
    toast.add({ severity: 'success', summary: 'Copied to clipboard', life: 2000 })
  } catch {
    toast.add({ severity: 'error', summary: 'Could not copy', detail: 'Select and copy the key manually.', life: 5000 })
  }
}

async function runRowAction(user: UserSummary, failureSummary: string, action: () => Promise<void>) {
  busyUserId.value = user.id
  try {
    await action()
    await refresh()
  } catch (e) {
    toast.add({
      severity: 'error',
      summary: failureSummary,
      detail: errorMessage(e, failureSummary),
      life: 5000,
    })
  } finally {
    busyUserId.value = null
  }
}

function changeRole(user: UserSummary, role: Role) {
  return runRowAction(user, 'Failed to update role', async () => {
    if (auth.token) await api.updateUserRole(auth.token, user.id, role)
  })
}

function freeze(user: UserSummary) {
  return runRowAction(user, 'Failed to freeze account', async () => {
    if (!auth.token) return
    await api.updateUserStatus(auth.token, user.id, 'FROZEN')
    toast.add({ severity: 'success', summary: 'Account frozen', life: 2500 })
  })
}

function unfreeze(user: UserSummary) {
  return runRowAction(user, 'Failed to unfreeze account', async () => {
    if (!auth.token) return
    await api.updateUserStatus(auth.token, user.id, 'ACTIVE')
    toast.add({ severity: 'success', summary: 'Account unfrozen', life: 2500 })
  })
}

function confirmFreeze(user: UserSummary) {
  const label = user.nickname ?? '(pending activation)'
  confirm.require({
    header: 'Freeze account',
    message: `Freeze ${label}? They won't be able to log in to Meishi or Omiyage until unfrozen.`,
    acceptLabel: 'Freeze',
    acceptProps: { severity: 'info' },
    rejectLabel: 'Cancel',
    accept: () => freeze(user),
  })
}

function remove(user: UserSummary) {
  return runRowAction(user, 'Failed to delete user', async () => {
    if (!auth.token) return
    await api.deleteUser(auth.token, user.id)
    toast.add({ severity: 'success', summary: 'User deleted', life: 2500 })
  })
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

// Frozen accounts get a frost-coloured edge so the state reads down the table, not
// just in the Status column.
function rowClass(data: UserSummary) {
  return data.status === 'FROZEN' ? 'row-frozen' : ''
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString()
}

function requestRemove(user: UserSummary) {
  return user.deletionRequestedAt ? confirmRemoveRequested(user) : confirmRemove(user)
}

function openCreateDialog() {
  createRole.value = 'USER'
  createdActivationKey.value = null
  createError.value = null
  copied.value = false
  createDialogOpen.value = true
}

function openEditDialog(user: UserSummary) {
  editUserId.value = user.id
  editError.value = null
  editFields.value = {
    nickname: user.nickname ?? '',
    email: '',
    phone: '',
    firstName: '',
    lastName: '',
    addressLine1: '',
    addressLine2: '',
    postalCode: '',
    city: '',
    country: '',
  }
  editDialogOpen.value = true
}

async function submitEdit() {
  if (!auth.token || !editUserId.value) return
  editSaving.value = true
  editError.value = null
  try {
    const fields: AdminProfileUpdate = {}
    for (const [key, value] of Object.entries(editFields.value)) {
      if (value) fields[key as keyof AdminProfileUpdate] = value
    }
    await api.adminUpdateUser(auth.token, editUserId.value, fields)
    toast.add({ severity: 'success', summary: 'User updated', life: 2500 })
    editDialogOpen.value = false
    await refresh()
  } catch (e) {
    editError.value = errorMessage(e, 'Could not update the user.')
  } finally {
    editSaving.value = false
  }
}

function openPasswordDialog(user: UserSummary) {
  passwordUserId.value = user.id
  passwordError.value = null
  newPassword.value = ''
  passwordDialogOpen.value = true
}

async function submitPassword() {
  if (!auth.token || !passwordUserId.value) return
  passwordSaving.value = true
  passwordError.value = null
  try {
    await api.adminSetPassword(auth.token, passwordUserId.value, newPassword.value)
    toast.add({ severity: 'success', summary: 'Password set', life: 2500 })
    passwordDialogOpen.value = false
  } catch (e) {
    passwordError.value = errorMessage(e, 'Could not set the password.')
  } finally {
    passwordSaving.value = false
  }
}

onMounted(refresh)
</script>

<template>
  <div class="page-wide stack">
    <h1>Users</h1>
    <Message v-if="error" severity="error">
      {{ error }}
      <Button label="Retry" size="small" severity="secondary" :loading="loading" @click="refresh" />
    </Message>

    <Button class="icon-btn create-user-btn" @click="openCreateDialog">
      <AppIcon name="user-plus" :size="15" />
      Create user
    </Button>

    <div class="table-scroll">
      <DataTable :value="users" data-key="id" class="users-table" :row-class="rowClass" :loading="loading">
        <template #empty>No users</template>
        <Column field="nickname" header="Nickname">
          <template #body="{ data }">{{ data.nickname ?? '(pending activation)' }}</template>
        </Column>
        <Column field="role" header="Role">
          <template #body="{ data }">
            <Select
              :model-value="data.role"
              :options="roleOptions"
              :disabled="busyUserId === data.id"
              @update:model-value="(role: Role) => changeRole(data, role)"
            />
          </template>
        </Column>
        <Column field="status" header="Status">
          <template #body="{ data }: { data: UserSummary }">
            <Tag :severity="data.status === 'FROZEN' ? 'info' : 'success'">
              <AppIcon v-if="data.status === 'FROZEN'" name="snowflake" :size="12" />
              {{ data.status }}
            </Tag>
          </template>
        </Column>
        <Column field="activated" header="Activated">
          <template #body="{ data }">
            <Tag :severity="data.activated ? 'success' : 'warn'" :value="data.activated ? 'yes' : 'no'" />
          </template>
        </Column>
        <Column header="Deletion">
          <template #body="{ data }: { data: UserSummary }">
            <Tag v-if="data.deletionRequestedAt" severity="danger">
              <AppIcon name="trash" :size="12" />
              requested
            </Tag>
            <span v-else class="muted">—</span>
          </template>
        </Column>
        <Column field="createdAt" header="Created">
          <template #body="{ data }: { data: UserSummary }">{{ formatDate(data.createdAt) }}</template>
        </Column>
        <Column header="">
          <template #body="{ data }: { data: UserSummary }">
            <UserActions
              :user="data"
              :busy="busyUserId === data.id"
              @edit="openEditDialog(data)"
              @set-password="openPasswordDialog(data)"
              @freeze="confirmFreeze(data)"
              @unfreeze="unfreeze(data)"
              @remove="requestRemove(data)"
            />
          </template>
        </Column>
      </DataTable>
    </div>

    <p v-if="loading" class="muted users-cards">Loading users...</p>
    <p v-else-if="users.length === 0" class="muted users-cards">No users</p>
    <ul v-else class="users-cards stack">
      <li v-for="user in users" :key="user.id" :class="['card', 'stack', rowClass(user)]">
        <div class="row">
          <strong>{{ user.nickname ?? '(pending activation)' }}</strong>
          <Tag :severity="user.status === 'FROZEN' ? 'info' : 'success'">
            <AppIcon v-if="user.status === 'FROZEN'" name="snowflake" :size="12" />
            {{ user.status }}
          </Tag>
          <Tag v-if="!user.activated" severity="warn" value="not activated" />
          <Tag v-if="user.deletionRequestedAt" severity="danger">
            <AppIcon name="trash" :size="12" />
            deletion requested
          </Tag>
        </div>
        <p class="muted">Created {{ formatDate(user.createdAt) }}</p>
        <Select
          :model-value="user.role"
          :options="roleOptions"
          :disabled="busyUserId === user.id"
          @update:model-value="(role: Role) => changeRole(user, role)"
        />
        <UserActions
          :user="user"
          :busy="busyUserId === user.id"
          @edit="openEditDialog(user)"
          @set-password="openPasswordDialog(user)"
          @freeze="confirmFreeze(user)"
          @unfreeze="unfreeze(user)"
          @remove="requestRemove(user)"
        />
      </li>
    </ul>

    <Dialog v-model:visible="createDialogOpen" header="Create user" modal>
      <div v-if="!createdActivationKey">
        <Message v-if="createError" severity="error">{{ createError }}</Message>
        <div class="field">
          <label for="role">Role</label>
          <Select id="role" v-model="createRole" :options="roleOptions" />
        </div>
        <Button class="icon-btn" :loading="creating" @click="submitCreate">
          <AppIcon name="user-plus" :size="15" />
          Create
        </Button>
      </div>
      <div v-else class="stack">
        <p>User created. Share this activation key so they can register:</p>
        <div class="row">
          <code>{{ createdActivationKey }}</code>
          <Button class="icon-btn" size="small" severity="secondary" @click="copyActivationKey">
            <AppIcon :name="copied ? 'check' : 'copy'" />
            {{ copied ? 'Copied' : 'Copy' }}
          </Button>
        </div>
      </div>
    </Dialog>

    <Dialog v-model:visible="editDialogOpen" header="Edit user" modal>
      <div class="stack">
        <Message v-if="editError" severity="error">{{ editError }}</Message>
        <p class="field-hint">Current values are not shown. Empty fields are left unchanged.</p>
        <div class="field">
          <label for="editNickname">Nickname</label>
          <InputText id="editNickname" v-model="editFields.nickname" autocapitalize="off" spellcheck="false" />
        </div>
        <div class="field">
          <label for="editEmail">Email</label>
          <InputText id="editEmail" v-model="editFields.email" type="email" autocapitalize="off" spellcheck="false" />
        </div>
        <div class="field">
          <label for="editPhone">Phone</label>
          <InputText id="editPhone" v-model="editFields.phone" />
        </div>
        <div class="row">
          <div class="field" style="flex: 1">
            <label for="editFirstName">First name</label>
            <InputText id="editFirstName" v-model="editFields.firstName" />
          </div>
          <div class="field" style="flex: 1">
            <label for="editLastName">Last name</label>
            <InputText id="editLastName" v-model="editFields.lastName" />
          </div>
        </div>
        <div class="field">
          <label for="editAddressLine1">Address line 1</label>
          <InputText id="editAddressLine1" v-model="editFields.addressLine1" />
        </div>
        <div class="field">
          <label for="editAddressLine2">Address line 2</label>
          <InputText id="editAddressLine2" v-model="editFields.addressLine2" />
        </div>
        <div class="row">
          <div class="field" style="flex: 1; min-width: 8rem">
            <label for="editPostalCode">Postal code</label>
            <InputText id="editPostalCode" v-model="editFields.postalCode" />
          </div>
          <div class="field" style="flex: 2; min-width: 10rem">
            <label for="editCity">City</label>
            <InputText id="editCity" v-model="editFields.city" />
          </div>
        </div>
        <div class="field">
          <label for="editCountry">Country</label>
          <InputText id="editCountry" v-model="editFields.country" />
        </div>
        <Button class="icon-btn" :loading="editSaving" @click="submitEdit">
          <AppIcon name="check" :size="15" />
          Save
        </Button>
      </div>
    </Dialog>

    <Dialog v-model:visible="passwordDialogOpen" header="Set password" modal>
      <div class="stack">
        <Message v-if="passwordError" severity="error">{{ passwordError }}</Message>
        <div class="field">
          <label for="newUserPassword">New password</label>
          <Password
            v-model="newPassword"
            input-id="newUserPassword"
            :feedback="false"
            toggle-mask
            fluid
            :input-props="{ autocomplete: 'new-password' }"
          />
        </div>
        <Button class="icon-btn" :loading="passwordSaving" @click="submitPassword">
          <AppIcon name="key" :size="15" />
          Set password
        </Button>
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
.users-table :deep(.row-frozen) > td {
  background: #e4eefa;
}
.users-cards {
  display: none;
  list-style: none;
  margin: 0;
  padding: 0;
}
.users-cards .row-frozen {
  border-left: 3px solid var(--frost);
}
@media (max-width: 640px) {
  .table-scroll {
    display: none;
  }
  .users-cards {
    display: flex;
  }
}
.users-table :deep(.row-frozen) > td:first-child {
  border-left: 3px solid var(--frost);
}
</style>
