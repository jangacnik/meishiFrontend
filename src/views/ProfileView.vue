<script setup lang="ts">
import HomeView from './HomeView.vue'
import ReturnToApp from '../components/ReturnToApp.vue'
</script>

<template>
  <div class="return-bar">
    <ReturnToApp />
  </div>
  <HomeView />
</template>

<style scoped>
.return-bar {
  max-width: 40rem;
  margin: 1.5rem auto -1rem;
  padding: 0 1.25rem;
}
.return-bar:empty {
  display: none;
}
</style>
