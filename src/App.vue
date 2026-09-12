<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import ConfirmDialog from 'primevue/confirmdialog'
import Toast from 'primevue/toast'
import BrandMark from './components/BrandMark.vue'
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
        <BrandMark />
        Meishi
      </RouterLink>

      <nav class="links links-desktop">
        <template v-if="auth.isAuthenticated">
          <RouterLink v-if="auth.isAdmin" to="/admin">Admin</RouterLink>
          <span class="nickname">{{ auth.nickname }}</span>
          <a href="#" class="ghost" @click.prevent="logout">Log out</a>
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
          <path d="M4 7 H20" :class="['bar', 'bar-top', { open: menuOpen }]" />
          <path d="M4 12 H20" :class="['bar', 'bar-mid', { open: menuOpen }]" />
          <path d="M4 17 H20" :class="['bar', 'bar-bottom', { open: menuOpen }]" />
        </svg>
      </button>
    </div>

    <nav v-if="menuOpen" class="links links-mobile sheet-in">
      <template v-if="auth.isAuthenticated">
        <RouterLink v-if="auth.isAdmin" to="/admin" @click="menuOpen = false">Admin</RouterLink>
        <span class="nickname">{{ auth.nickname }}</span>
        <a href="#" class="ghost" @click.prevent="logout">Log out</a>
      </template>
      <template v-else>
        <RouterLink to="/login" @click="menuOpen = false">Log in</RouterLink>
        <RouterLink to="/register" @click="menuOpen = false">Register</RouterLink>
      </template>
    </nav>
  </header>
  <main class="main">
    <RouterView v-slot="{ Component, route }">
      <component :is="Component" :key="route.path" class="rise" />
    </RouterView>
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
  transition: transform 0.2s var(--ease-out-soft);
}
.brand:hover {
  transform: rotate(-2deg);
}
.links {
  display: flex;
  align-items: center;
  gap: 1.25rem;
}
.links a {
  position: relative;
  text-decoration: none;
  color: rgba(232, 241, 242, 0.65);
  font-weight: 500;
  padding: 0.2rem 0;
  transition: color 0.15s ease;
}
.links a::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  bottom: -0.15rem;
  height: 2px;
  border-radius: 2px;
  background: var(--mint);
  transform: scaleX(0);
  transform-origin: left;
  transition: transform 0.2s var(--ease-out-soft);
}
.links a:hover,
.links a.router-link-active {
  color: var(--ice);
}
.links a:hover::after,
.links a.router-link-active::after {
  transform: scaleX(1);
}
/* Log out is an action, not a destination — no underline, a quiet outline instead. */
.links a.ghost {
  padding: 0.3rem 0.7rem;
  border: 1px solid rgba(232, 241, 242, 0.25);
  border-radius: 0.5rem;
  font-size: 0.9rem;
}
.links a.ghost:hover {
  background: rgba(232, 241, 242, 0.1);
}
.links a.ghost::after {
  display: none;
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
  border-radius: 0.5rem;
  cursor: pointer;
  transition: background-color 0.15s ease;
}
.menu-btn:hover {
  background: rgba(232, 241, 242, 0.1);
}
.bar {
  transform-origin: center;
  transition:
    transform 0.3s var(--ease-out-soft),
    opacity 0.2s ease;
}
.bar-top.open {
  transform: translateY(5px) rotate(45deg);
}
.bar-mid.open {
  opacity: 0;
}
.bar-bottom.open {
  transform: translateY(-5px) rotate(-45deg);
}
.links-mobile {
  flex-direction: column;
  align-items: flex-start;
  gap: 0.85rem;
  padding: 0.25rem 1.25rem 1.1rem;
  border-top: 1px solid rgba(232, 241, 242, 0.15);
  margin-top: 0.25rem;
  padding-top: 0.9rem;
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
