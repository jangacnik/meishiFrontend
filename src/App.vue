<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useAuthStore } from './stores/auth'

const router = useRouter()
const auth = useAuthStore()

function logout() {
  auth.logout()
  router.push('/login')
}
</script>

<template>
  <nav class="nav">
    <RouterLink to="/">Meishi</RouterLink>
    <span class="spacer" />
    <template v-if="auth.isAuthenticated">
      <RouterLink v-if="auth.isAdmin" to="/admin">Admin</RouterLink>
      <a href="#" @click.prevent="logout">Log out</a>
    </template>
    <template v-else>
      <RouterLink to="/login">Log in</RouterLink>
      <RouterLink to="/register">Register</RouterLink>
    </template>
  </nav>
  <RouterView />
</template>

<style scoped>
.nav {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem 2rem;
  border-bottom: 1px solid var(--p-content-border-color, #ddd);
}
.spacer {
  flex: 1;
}
</style>
