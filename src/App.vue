<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import ConfirmDialog from 'primevue/confirmdialog'
import Toast from 'primevue/toast'
import { useAuthStore } from './stores/auth'

const router = useRouter()
const auth = useAuthStore()
const menuOpen = ref(false)

function logout() {
  auth.logout()
  menuOpen.value = false
  router.push('/login')
}
</script>

<template>
  <ConfirmDialog />
  <Toast />
  <header class="nav">
    <div class="nav-bar">
      <RouterLink to="/" class="brand" @click="menuOpen = false">
        <svg viewBox="0 0 48 48" width="24" height="24" aria-hidden="true">
          <rect x="4" y="4" width="40" height="40" rx="6" fill="none" stroke="currentColor" stroke-width="3" />
          <circle cx="24" cy="24" r="12" fill="var(--hanko)" />
        </svg>
        Meishi
      </RouterLink>

      <nav class="links links-desktop">
        <template v-if="auth.isAuthenticated">
          <RouterLink v-if="auth.isAdmin" to="/admin">Admin</RouterLink>
          <span class="nickname">{{ auth.nickname }}</span>
          <a href="#" @click.prevent="logout">Log out</a>
        </template>
        <template v-else>
          <RouterLink to="/login">Log in</RouterLink>
          <RouterLink to="/register">Register</RouterLink>
        </template>
      </nav>

      <button type="button" class="menu-btn" :aria-expanded="menuOpen" aria-label="Toggle menu" @click="menuOpen = !menuOpen">
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
          <path v-if="menuOpen" d="M6 6 L18 18 M18 6 L6 18" />
          <path v-else d="M4 7 H20 M4 12 H20 M4 17 H20" />
        </svg>
      </button>
    </div>

    <nav v-if="menuOpen" class="links links-mobile">
      <template v-if="auth.isAuthenticated">
        <RouterLink v-if="auth.isAdmin" to="/admin" @click="menuOpen = false">Admin</RouterLink>
        <span class="nickname">{{ auth.nickname }}</span>
        <a href="#" @click.prevent="logout">Log out</a>
      </template>
      <template v-else>
        <RouterLink to="/login" @click="menuOpen = false">Log in</RouterLink>
        <RouterLink to="/register" @click="menuOpen = false">Register</RouterLink>
      </template>
    </nav>
  </header>
  <main class="main">
    <RouterView />
  </main>
</template>

<style scoped>
.nav {
  border-bottom: 1px solid var(--line);
  background: var(--surface);
  position: sticky;
  top: 0;
  z-index: 10;
}
.nav-bar {
  max-width: 48rem;
  margin: 0 auto;
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.85rem 1.25rem;
}
.brand {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 1.05rem;
  color: var(--ink);
  text-decoration: none;
}
.links {
  display: flex;
  align-items: center;
  gap: 1.25rem;
}
.links a {
  text-decoration: none;
  color: var(--ink-soft);
  font-weight: 500;
}
.links a:hover,
.links a.router-link-active {
  color: var(--hanko);
}
.nickname {
  color: var(--ink-soft);
  font-size: 0.9rem;
}
.links-desktop {
  margin-left: auto;
}
.menu-btn {
  display: none;
  margin-left: auto;
  background: none;
  border: none;
  color: var(--ink);
  padding: 0.4rem;
  cursor: pointer;
}
.links-mobile {
  flex-direction: column;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 0 1.25rem 1rem;
}

.main {
  flex: 1;
}

@media (max-width: 640px) {
  .links-desktop {
    display: none;
  }
  .menu-btn {
    display: block;
  }
}
</style>
