<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import InputText from 'primevue/inputtext'
import Button from 'primevue/button'
import Password from 'primevue/password'
import Message from 'primevue/message'
import { useConfirm } from 'primevue/useconfirm'
import { useToast } from 'primevue/usetoast'
import * as api from '../lib/api'
import { ApiError } from '../lib/api'
import type { MeUser } from '../lib/api'
import { errorMessage } from '../lib/messages'
import AppIcon from '../components/AppIcon.vue'
import { useAuthStore } from '../stores/auth'

const auth = useAuthStore()
const confirm = useConfirm()
const toast = useToast()

const me = ref<MeUser | null>(null)
const error = ref<string | null>(null)
const saving = ref(false)
const deletionPending = ref(false)

const email = ref('')
const addressLine1 = ref('')
const addressLine2 = ref('')
const postalCode = ref('')
const city = ref('')
const country = ref('')
const emailError = ref<string | null>(null)

const editingNickname = ref(false)
const nicknameInput = ref('')
const nicknameError = ref<string | null>(null)
const savingNickname = ref(false)

const currentPassword = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const passwordError = ref<string | null>(null)
const passwordSubmitted = ref(false)
const confirmPasswordError = computed(() =>
  (passwordSubmitted.value || confirmPassword.value) && newPassword.value !== confirmPassword.value
    ? 'Passwords do not match.'
    : null,
)
const currentPasswordError = ref<string | null>(null)
const newPasswordError = ref<string | null>(null)
const changingPassword = ref(false)

watch(email, () => (emailError.value = null))
watch(currentPassword, () => (currentPasswordError.value = null))
watch(newPassword, () => (newPasswordError.value = null))

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
    error.value = errorMessage(e, 'Could not load your profile.')
  }
}

async function save() {
  if (!auth.token) return
  error.value = null
  emailError.value = email.value && !/^\S+@\S+\.\S+$/.test(email.value) ? 'Enter a valid email address.' : null
  if (emailError.value) return
  saving.value = true
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
    error.value = errorMessage(e, 'Could not save your profile.')
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
  nicknameError.value = null
  if (!nicknameInput.value.trim()) {
    nicknameError.value = 'Choose a nickname.'
    return
  }
  savingNickname.value = true
  try {
    await api.updateMyNickname(auth.token, nicknameInput.value)
    auth.setNickname(nicknameInput.value)
    editingNickname.value = false
    toast.add({ severity: 'success', summary: 'Nickname updated', life: 3000 })
  } catch (e) {
    nicknameError.value = errorMessage(e, 'Could not update your nickname.')
  } finally {
    savingNickname.value = false
  }
}

async function changePassword() {
  if (!auth.token) return
  passwordError.value = null
  passwordSubmitted.value = true
  currentPasswordError.value = currentPassword.value ? null : 'Enter your current password.'
  newPasswordError.value = newPassword.value ? null : 'Choose a new password.'
  if (currentPasswordError.value || newPasswordError.value || confirmPasswordError.value) return
  changingPassword.value = true
  try {
    await api.changeMyPassword(auth.token, currentPassword.value, newPassword.value)
    currentPassword.value = ''
    newPassword.value = ''
    confirmPassword.value = ''
    passwordSubmitted.value = false
    toast.add({ severity: 'success', summary: 'Password changed', life: 3000 })
  } catch (e) {
    passwordError.value =
      e instanceof ApiError && e.status === 401
        ? 'Current password is incorrect.'
        : errorMessage(e, 'Could not change your password.')
  } finally {
    changingPassword.value = false
  }
}

async function runDeletionAction(action: (token: string) => Promise<MeUser>, successSummary: string, failureSummary: string) {
  if (!auth.token || deletionPending.value) return
  deletionPending.value = true
  try {
    me.value = await action(auth.token)
    toast.add({ severity: 'info', summary: successSummary, life: 3000 })
  } catch (e) {
    toast.add({
      severity: 'error',
      summary: failureSummary,
      detail: errorMessage(e, failureSummary),
      life: 5000,
    })
  } finally {
    deletionPending.value = false
  }
}

function confirmRequestDeletion() {
  confirm.require({
    header: 'Request account deletion',
    message: "This flags your account for an admin to review and delete. You can cancel the request any time before then.",
    acceptLabel: 'Request deletion',
    acceptProps: { severity: 'danger' },
    rejectLabel: 'Cancel',
    accept: () => runDeletionAction(api.requestDeletion, 'Deletion requested', 'Could not request deletion'),
  })
}

function cancelRequest() {
  return runDeletionAction(api.cancelDeletionRequest, 'Deletion request cancelled', 'Could not cancel request')
}

onMounted(load)
</script>

<template>
  <div class="page stack">
    <header class="page-head">
      <template v-if="editingNickname">
        <InputText
          v-model="nicknameInput"
          placeholder="Nickname"
          aria-label="Nickname"
          autocomplete="off"
          autocapitalize="off"
          autocorrect="off"
          spellcheck="false"
          :invalid="!!nicknameError"
          :aria-invalid="!!nicknameError"
          :aria-describedby="nicknameError ? 'nickname-error' : undefined"
          @keyup.enter="saveNickname"
        />
        <Button class="icon-btn" size="small" aria-label="Save nickname" :loading="savingNickname" @click="saveNickname">
          <AppIcon name="check" :size="14" />
        </Button>
        <Button class="icon-btn" size="small" severity="secondary" outlined aria-label="Cancel" @click="cancelEditNickname">
          <AppIcon name="x" :size="14" />
        </Button>
      </template>
      <template v-else>
        <h1>Welcome, {{ auth.nickname }}</h1>
        <Button class="icon-btn" size="small" severity="secondary" text aria-label="Edit nickname" @click="startEditNickname">
          <AppIcon name="pencil" :size="14" />
        </Button>
      </template>
      <span class="pill">{{ auth.isAdmin ? 'Admin' : 'Member' }}</span>
    </header>
    <Message v-if="nicknameError" id="nickname-error" severity="error">{{ nicknameError }}</Message>

    <div class="card shop-cta">
      <div>
        <h2>Ready to shop?</h2>
        <p class="muted">Omiyage is where you browse and request souvenirs to bring back.</p>
      </div>
      <Button as="a" class="icon-btn" href="https://omiyage.gacnikhome.duckdns.org" target="_blank" rel="noopener">
        Shop at Omiyage
        <span class="sr-only">(opens in new tab)</span>
        <AppIcon name="arrow-up-right" :size="15" />
      </Button>
    </div>

    <Message v-if="error" severity="error">{{ error }}</Message>

    <form class="card" novalidate @submit.prevent="save">
      <h2>Contact details</h2>
      <p class="field-hint">Optional — add these if you'd like them on file.</p>

      <div class="field">
        <label for="email">Email address</label>
        <InputText
          id="email"
          v-model="email"
          type="email"
          placeholder="you@example.com"
          autocomplete="email"
          autocapitalize="off"
          spellcheck="false"
          :invalid="!!emailError"
          :aria-invalid="!!emailError"
          :aria-describedby="emailError ? 'email-error' : undefined"
        />
        <Message v-if="emailError" id="email-error" severity="error" size="small" variant="simple">
          {{ emailError }}
        </Message>
      </div>
      <div class="field">
        <label for="addressLine1">Address line 1</label>
        <InputText id="addressLine1" v-model="addressLine1" autocomplete="address-line1" />
      </div>
      <div class="field">
        <label for="addressLine2">Address line 2</label>
        <InputText id="addressLine2" v-model="addressLine2" autocomplete="address-line2" />
      </div>
      <div class="row">
        <div class="field" style="flex: 1; min-width: 8rem">
          <label for="postalCode">Postal code</label>
          <InputText id="postalCode" v-model="postalCode" autocomplete="postal-code" />
        </div>
        <div class="field" style="flex: 2; min-width: 10rem">
          <label for="city">City</label>
          <InputText id="city" v-model="city" autocomplete="address-level2" />
        </div>
      </div>
      <div class="field">
        <label for="country">Country</label>
        <InputText id="country" v-model="country" autocomplete="country-name" />
      </div>

      <Button type="submit" label="Save changes" :loading="saving" />
    </form>

    <form class="card" novalidate @submit.prevent="changePassword">
      <h2>Change password</h2>
      <Message v-if="passwordError" severity="error">{{ passwordError }}</Message>

      <div class="field">
        <label for="currentPassword">Current password</label>
        <Password
          v-model="currentPassword"
          input-id="currentPassword"
          :feedback="false"
          toggle-mask
          fluid
          :invalid="!!currentPasswordError"
          :input-props="{
            required: true,
            autocomplete: 'current-password',
            'aria-invalid': !!currentPasswordError,
            'aria-describedby': currentPasswordError ? 'currentPassword-error' : undefined,
          }"
        />
        <Message v-if="currentPasswordError" id="currentPassword-error" severity="error" size="small" variant="simple">
          {{ currentPasswordError }}
        </Message>
      </div>
      <div class="field">
        <label for="newPassword">New password</label>
        <Password
          v-model="newPassword"
          input-id="newPassword"
          :feedback="false"
          toggle-mask
          fluid
          :invalid="!!newPasswordError"
          :input-props="{
            required: true,
            autocomplete: 'new-password',
            'aria-invalid': !!newPasswordError,
            'aria-describedby': newPasswordError ? 'newPassword-error' : undefined,
          }"
        />
        <Message v-if="newPasswordError" id="newPassword-error" severity="error" size="small" variant="simple">
          {{ newPasswordError }}
        </Message>
      </div>
      <div class="field">
        <label for="confirmPassword">Confirm new password</label>
        <Password
          v-model="confirmPassword"
          input-id="confirmPassword"
          :feedback="false"
          toggle-mask
          fluid
          :invalid="!!confirmPasswordError"
          :input-props="{
            required: true,
            autocomplete: 'new-password',
            'aria-invalid': !!confirmPasswordError,
            'aria-describedby': confirmPasswordError ? 'confirmPassword-error' : undefined,
          }"
        />
        <Message v-if="confirmPasswordError" id="confirmPassword-error" severity="error" size="small" variant="simple">
          {{ confirmPasswordError }}
        </Message>
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
        <Button class="icon-btn" severity="secondary" :loading="deletionPending" @click="cancelRequest">
          <AppIcon name="undo" :size="15" />
          Cancel request
        </Button>
      </template>
      <template v-else>
        <p class="field-hint">This flags your account for an admin to review and delete — it isn't instant.</p>
        <Button class="icon-btn" severity="danger" outlined :disabled="deletionPending" @click="confirmRequestDeletion">
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
