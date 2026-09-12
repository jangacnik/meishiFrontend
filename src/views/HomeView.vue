<script setup lang="ts">
import { onMounted, ref } from 'vue'
import InputText from 'primevue/inputtext'
import Button from 'primevue/button'
import Message from 'primevue/message'
import { useConfirm } from 'primevue/useconfirm'
import { useToast } from 'primevue/usetoast'
import * as api from '../lib/api'
import type { MeUser } from '../lib/api'
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
    <h1>Welcome, {{ auth.nickname }}</h1>
    <p class="muted">Role: {{ auth.claims?.role }}</p>

    <div class="card shop-cta">
      <div>
        <h2>Ready to shop?</h2>
        <p class="muted">Omiyage is where you browse and request souvenirs to bring back.</p>
      </div>
      <a href="https://omiyage.gacnikhome.duckdns.org" target="_blank" rel="noopener">
        <Button label="Shop at Omiyage" icon="pi pi-arrow-up-right" icon-pos="right" />
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

    <div class="card">
      <h2>Delete account</h2>
      <template v-if="me?.deletionRequestedAt">
        <p class="muted">
          You requested deletion on {{ new Date(me.deletionRequestedAt).toLocaleDateString() }}. An admin will review
          it.
        </p>
        <Button label="Cancel request" severity="secondary" @click="cancelRequest" />
      </template>
      <template v-else>
        <p class="field-hint">This flags your account for an admin to review and delete — it isn't instant.</p>
        <Button label="Request account deletion" severity="danger" outlined @click="confirmRequestDeletion" />
      </template>
    </div>
  </div>
</template>

<style scoped>
.shop-cta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}
.shop-cta h2 {
  margin-bottom: 0.15rem;
}
</style>
