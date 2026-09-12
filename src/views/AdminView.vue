<script setup lang="ts">
import { onMounted, ref } from 'vue'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import Select from 'primevue/select'
import Tag from 'primevue/tag'
import Message from 'primevue/message'
import { useConfirm } from 'primevue/useconfirm'
import { useToast } from 'primevue/usetoast'
import * as api from '../lib/api'
import type { AdminProfileUpdate, Role, UserSummary } from '../lib/api'
import AppIcon from '../components/AppIcon.vue'
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
    acceptProps: { severity: 'info' },
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

// Frozen accounts get a frost-coloured edge so the state reads down the table, not
// just in the Status column.
function rowClass(data: UserSummary) {
  return data.status === 'FROZEN' ? 'row-frozen' : ''
}

function openCreateDialog() {
  createRole.value = 'USER'
  createdActivationKey.value = null
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
    editError.value =
      e instanceof api.ApiError && e.status === 409
        ? 'that nickname is already taken'
        : e instanceof Error
          ? e.message
          : 'failed to update user'
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
    passwordError.value = e instanceof Error ? e.message : 'failed to set password'
  } finally {
    passwordSaving.value = false
  }
}

onMounted(refresh)
</script>

<template>
  <div class="page-wide stack">
    <h1>Users</h1>
    <Message v-if="error" severity="error">{{ error }}</Message>

    <Button class="icon-btn create-user-btn" @click="openCreateDialog">
      <AppIcon name="user-plus" :size="15" />
      Create user
    </Button>

    <div class="table-scroll">
      <DataTable :value="users" data-key="id" class="users-table" :row-class="rowClass">
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
        <Column field="createdAt" header="Created" />
        <Column header="">
          <template #body="{ data }: { data: UserSummary }">
            <div class="row">
              <Button class="icon-btn" severity="secondary" size="small" outlined @click="openEditDialog(data)">
                <AppIcon name="pencil" :size="13" />
                Edit
              </Button>
              <Button class="icon-btn" severity="secondary" size="small" outlined @click="openPasswordDialog(data)">
                <AppIcon name="key" :size="13" />
                Set password
              </Button>
              <Button
                v-if="data.status === 'FROZEN'"
                class="icon-btn"
                severity="info"
                size="small"
                outlined
                @click="unfreeze(data)"
              >
                <AppIcon name="sun" :size="13" />
                Unfreeze
              </Button>
              <Button v-else class="icon-btn" severity="info" size="small" @click="confirmFreeze(data)">
                <AppIcon name="snowflake" :size="13" />
                Freeze
              </Button>
              <Button
                v-if="data.deletionRequestedAt"
                class="icon-btn"
                severity="danger"
                size="small"
                @click="confirmRemoveRequested(data)"
              >
                <AppIcon name="trash" :size="13" />
                Confirm &amp; delete
              </Button>
              <Button v-else class="icon-btn" severity="danger" size="small" @click="confirmRemove(data)">
                <AppIcon name="trash" :size="13" />
                Delete
              </Button>
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
        <Button class="icon-btn" @click="submitCreate">
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
        <div class="field">
          <label for="editNickname">Nickname</label>
          <InputText id="editNickname" v-model="editFields.nickname" />
        </div>
        <div class="field">
          <label for="editEmail">Email</label>
          <InputText id="editEmail" v-model="editFields.email" type="email" />
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
          <InputText id="newUserPassword" v-model="newPassword" type="password" />
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
  background: #f4f8fc;
}
.users-table :deep(.row-frozen) > td:first-child {
  box-shadow: inset 3px 0 0 0 var(--frost);
}
</style>
