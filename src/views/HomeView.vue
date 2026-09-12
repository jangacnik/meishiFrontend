<script setup lang="ts">
import { onMounted, ref } from 'vue'
import InputText from 'primevue/inputtext'
import Button from 'primevue/button'
import Message from 'primevue/message'
import { useConfirm } from 'primevue/useconfirm'
import { useToast } from 'primevue/usetoast'
import * as api from '../lib/api'
import { ApiError } from '../lib/api'
import type { MeUser } from '../lib/api'
import AppIcon from '../components/AppIcon.vue'
import { useAuthStore } from '../stores/auth'

const auth = useAuthStore()
const confirm = useConfirm()
const toast = useToast()

const me = ref<MeUser | null>(null)
const error = ref<string | null>(null)
const saving = ref(false)

const email = ref('')
const addressLine1 = ref('')
const addressLine2 = ref('')
const postalCode = ref('')
const city = ref('')
const country = ref('')

const editingNickname = ref(false)
const nicknameInput = ref('')
const nicknameError = ref<string | null>(null)
const savingNickname = ref(false)

const currentPassword = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const passwordError = ref<string | null>(null)
const changingPassword = ref(false)

function applyToForm(user: MeUser) {
  email.value = user.email ?? ''
  addressLine1.value = user.addressLine1 ?? ''
  addressLine2.value = user.addressLine2 ?? ''
  postalCode.value = user.postalCode ?? ''
  city.value = user.city ?? ''
  country.value = user.country ?? ''
}

async function load() {
  if (!auth.token) return
  try {
    me.value = await api.getMe(auth.token)
    applyToForm(me.value)
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'failed to load profile'
  }
}

async function save() {
  if (!auth.token) return
  saving.value = true
  error.value = null
  try {
    me.value = await api.updateMe(auth.token, {
      email: email.value,
      addressLine1: addressLine1.value,
      addressLine2: addressLine2.value,
      postalCode: postalCode.value,
      city: city.value,
      country: country.value,
    })
    toast.add({ severity: 'success', summary: 'Profile saved', life: 3000 })
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'failed to save profile'
  } finally {
    saving.value = false
  }
}

function startEditNickname() {
  nicknameInput.value = auth.nickname ?? ''
  nicknameError.value = null
  editingNickname.value = true
}

function cancelEditNickname() {
  editingNickname.value = false
  nicknameError.value = null
}

async function saveNickname() {
  if (!auth.token) return
  savingNickname.value = true
  nicknameError.value = null
  try {
    await api.updateMyNickname(auth.token, nicknameInput.value)
    auth.setNickname(nicknameInput.value)
    editingNickname.value = false
    toast.add({ severity: 'success', summary: 'Nickname updated', life: 3000 })
  } catch (e) {
    nicknameError.value =
      e instanceof ApiError && e.status === 409
        ? 'that nickname is already taken'
        : e instanceof Error
          ? e.message
          : 'failed to update nickname'
  } finally {
    savingNickname.value = false
  }
}

async function changePassword() {
  if (!auth.token) return
  passwordError.value = null
  if (newPassword.value !== confirmPassword.value) {
    passwordError.value = 'new passwords do not match'
    return
  }
  changingPassword.value = true
  try {
    await api.changeMyPassword(auth.token, currentPassword.value, newPassword.value)
    currentPassword.value = ''
    newPassword.value = ''
    confirmPassword.value = ''
    toast.add({ severity: 'success', summary: 'Password changed', life: 3000 })
  } catch (e) {
    passwordError.value =
      e instanceof ApiError && e.status === 401
        ? 'current password is incorrect'
        : e instanceof Error
          ? e.message
          : 'failed to change password'
  } finally {
    changingPassword.value = false
  }
}

function confirmRequestDeletion() {
  confirm.require({
    header: 'Request account deletion',
    message: "This flags your account for an admin to review and delete. You can cancel the request any time before then.",
    acceptLabel: 'Request deletion',
    acceptProps: { severity: 'danger' },
    rejectLabel: 'Cancel',
    accept: async () => {
      if (!auth.token) return
      me.value = await api.requestDeletion(auth.token)
      toast.add({ severity: 'info', summary: 'Deletion requested', life: 3000 })
    },
  })
}

async function cancelRequest() {
  if (!auth.token) return
  me.value = await api.cancelDeletionRequest(auth.token)
  toast.add({ severity: 'info', summary: 'Deletion request cancelled', life: 3000 })
}

onMounted(load)
</script>

<template>
  <div class="page stack">
    <header class="page-head">
      <template v-if="editingNickname">
        <InputText v-model="nicknameInput" placeholder="Nickname" @keyup.enter="saveNickname" />
        <Button class="icon-btn" size="small" :loading="savingNickname" @click="saveNickname">
          <AppIcon name="check" :size="14" />
        </Button>
        <Button class="icon-btn" size="small" severity="secondary" outlined @click="cancelEditNickname">
          <AppIcon name="x" :size="14" />
        </Button>
      </template>
      <template v-else>
        <h1>Welcome, {{ auth.nickname }}</h1>
        <Button class="icon-btn" size="small" severity="secondary" text @click="startEditNickname">
          <AppIcon name="pencil" :size="14" />
        </Button>
      </template>
      <span class="pill">{{ auth.claims?.role }}</span>
    </header>
    <Message v-if="nicknameError" severity="error">{{ nicknameError }}</Message>

    <div class="card shop-cta">
      <div>
        <h2>Ready to shop?</h2>
        <p class="muted">Omiyage is where you browse and request souvenirs to bring back.</p>
      </div>
      <a href="https://omiyage.gacnikhome.duckdns.org" target="_blank" rel="noopener">
        <Button class="icon-btn">
          Shop at Omiyage
          <AppIcon name="arrow-up-right" :size="15" />
        </Button>
      </a>
    </div>

    <Message v-if="error" severity="error">{{ error }}</Message>

    <form class="card" @submit.prevent="save">
      <h2>Contact details</h2>
      <p class="field-hint">Optional — add these if you'd like them on file.</p>

      <div class="field">
        <label for="email">Email address</label>
        <InputText id="email" v-model="email" type="email" placeholder="you@example.com" />
      </div>
      <div class="field">
        <label for="addressLine1">Address line 1</label>
        <InputText id="addressLine1" v-model="addressLine1" />
      </div>
      <div class="field">
        <label for="addressLine2">Address line 2</label>
        <InputText id="addressLine2" v-model="addressLine2" />
      </div>
      <div class="row">
        <div class="field" style="flex: 1; min-width: 8rem">
          <label for="postalCode">Postal code</label>
          <InputText id="postalCode" v-model="postalCode" />
        </div>
        <div class="field" style="flex: 2; min-width: 10rem">
          <label for="city">City</label>
          <InputText id="city" v-model="city" />
        </div>
      </div>
      <div class="field">
        <label for="country">Country</label>
        <InputText id="country" v-model="country" />
      </div>

      <Button type="submit" label="Save changes" :loading="saving" />
    </form>

    <form class="card" @submit.prevent="changePassword">
      <h2>Change password</h2>
      <Message v-if="passwordError" severity="error">{{ passwordError }}</Message>

      <div class="field">
        <label for="currentPassword">Current password</label>
        <InputText id="currentPassword" v-model="currentPassword" type="password" />
      </div>
      <div class="field">
        <label for="newPassword">New password</label>
        <InputText id="newPassword" v-model="newPassword" type="password" />
      </div>
      <div class="field">
        <label for="confirmPassword">Confirm new password</label>
        <InputText id="confirmPassword" v-model="confirmPassword" type="password" />
      </div>

      <Button type="submit" label="Change password" :loading="changingPassword" />
    </form>

    <div class="card">
      <h2>Delete account</h2>
      <template v-if="me?.deletionRequestedAt">
        <p class="muted">
          You requested deletion on {{ new Date(me.deletionRequestedAt).toLocaleDateString() }}. An admin will review
          it.
        </p>
        <Button class="icon-btn" severity="secondary" @click="cancelRequest">
          <AppIcon name="undo" :size="15" />
          Cancel request
        </Button>
      </template>
      <template v-else>
        <p class="field-hint">This flags your account for an admin to review and delete — it isn't instant.</p>
        <Button class="icon-btn" severity="danger" outlined @click="confirmRequestDeletion">
          <AppIcon name="trash" :size="15" />
          Request account deletion
        </Button>
      </template>
    </div>
  </div>
</template>

<style scoped>
.page-head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.75rem;
}
.page-head h1 {
  margin: 0;
}
.shop-cta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  background: var(--forest);
  border-color: var(--forest-deep);
  color: var(--ice);
}
.shop-cta h2 {
  margin-bottom: 0.15rem;
  color: var(--mint);
}
.shop-cta .muted {
  color: rgba(232, 241, 242, 0.72);
}
.shop-cta :deep(.p-button) {
  background: var(--mint);
  border-color: var(--mint);
  color: var(--ink);
}
.shop-cta :deep(.p-button:hover) {
  background: #9fe79e;
  border-color: #9fe79e;
}
</style>
