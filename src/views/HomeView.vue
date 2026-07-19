<script setup lang="ts">
import { useAuthStore } from '../stores/auth'

const auth = useAuthStore()
</script>

<template>
  <div class="profile">
    <h1>Welcome, {{ auth.nickname }}</h1>
    <p>Role: {{ auth.claims?.role }}</p>
  </div>
</template>

<style scoped>
.profile {
  max-width: 24rem;
  margin: 4rem auto;
}
</style>
