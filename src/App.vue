<script setup lang="ts">
import { ref, useTemplateRef } from 'vue'
import { useRouter } from 'vue-router'
import ConfirmDialog from 'primevue/confirmdialog'
import Toast from 'primevue/toast'
import BrandMark from './components/BrandMark.vue'
import { useAuthStore } from './stores/auth'

const router = useRouter()
const auth = useAuthStore()
const menuOpen = ref(false)
const mainEl = useTemplateRef('main')

function logout() {
  auth.logout()
  menuOpen.value = false
  router.push('/login')
}
</script>

<template>
  <ConfirmDialog />
  <Toast />
  <a href="#main" class="skip-link" @click.prevent="mainEl?.focus()">Skip to content</a>
  <header class="nav">
    <div class="nav-bar">
      <RouterLink to="/" class="brand" @click="menuOpen = false">
        <BrandMark />
        Meishi
      </RouterLink>

      <nav class="links links-desktop" aria-label="Main">
        <template v-if="auth.isAuthenticated">
          <RouterLink v-if="auth.isAdmin" to="/admin">Admin</RouterLink>
          <span class="nickname">{{ auth.nickname }}</span>
          <button type="button" class="ghost" @click="logout">Log out</button>
        </template>
        <template v-else>
          <RouterLink to="/login">Log in</RouterLink>
          <RouterLink to="/register">Register</RouterLink>
        </template>
      </nav>

      <button
        type="button"
        class="menu-btn"
        :aria-expanded="menuOpen"
        :aria-label="menuOpen ? 'Close menu' : 'Open menu'"
        @click="menuOpen = !menuOpen"
      >
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
          <path v-if="menuOpen" d="M6 6 L18 18 M18 6 L6 18" />
          <path v-else d="M4 7 H20 M4 12 H20 M4 17 H20" />
        </svg>
      </button>
    </div>

    <nav v-if="menuOpen" class="links links-mobile" aria-label="Main">
      <template v-if="auth.isAuthenticated">
        <RouterLink v-if="auth.isAdmin" to="/admin" @click="menuOpen = false">Admin</RouterLink>
        <span class="nickname">{{ auth.nickname }}</span>
        <button type="button" class="ghost" @click="logout">Log out</button>
      </template>
      <template v-else>
        <RouterLink to="/login" @click="menuOpen = false">Log in</RouterLink>
        <RouterLink to="/register" @click="menuOpen = false">Register</RouterLink>
      </template>
    </nav>
  </header>
  <main id="main" ref="main" class="main" tabindex="-1">
    <RouterView />
  </main>
</template>

<style scoped>
.nav {
  background: var(--ink);
  color: var(--ice);
  position: sticky;
  top: 0;
  z-index: 10;
}
.nav-bar {
  max-width: 60rem;
  margin: 0 auto;
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.8rem 1.25rem;
}
.brand {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 1.05rem;
  color: var(--ice);
  text-decoration: none;
}
.links {
  display: flex;
  align-items: center;
  gap: 1.25rem;
}
.links a {
  text-decoration: none;
  color: rgba(232, 241, 242, 0.65);
  font-weight: 500;
  padding: 0.2rem 0;
}
.links a:hover,
.links a.router-link-active {
  color: var(--ice);
}
.links a.router-link-active {
  border-bottom: 2px solid var(--mint);
}
/* Log out is an action, not a destination — no underline, a quiet outline instead. */
.links .ghost {
  background: none;
  color: rgba(232, 241, 242, 0.65);
  font: inherit;
  font-weight: 500;
  cursor: pointer;
  min-height: 2.75rem;
  padding: 0.3rem 0.7rem;
  border: 1px solid rgba(232, 241, 242, 0.25);
  border-radius: 0.5rem;
  font-size: 0.9rem;
}
.links .ghost:hover {
  background: rgba(232, 241, 242, 0.1);
}

.nickname {
  color: rgba(232, 241, 242, 0.6);
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
  color: var(--ice);
  padding: 0.4rem;
  min-width: 2.75rem;
  min-height: 2.75rem;
  border-radius: 0.5rem;
  cursor: pointer;
}
.menu-btn:hover {
  background: rgba(232, 241, 242, 0.1);
}
.links-mobile a {
  display: flex;
  align-items: center;
  min-height: 2.75rem;
}
.links-mobile {
  flex-direction: column;
  align-items: flex-start;
  gap: 0.25rem;
  padding: 0.25rem 1.25rem 1.1rem;
  border-top: 1px solid rgba(232, 241, 242, 0.15);
  margin-top: 0.25rem;
  padding-top: 0.9rem;
}

.main {
  flex: 1;
}
.main:focus {
  outline: none;
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
