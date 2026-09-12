<script setup lang="ts">
withDefaults(defineProps<{ size?: number }>(), { size: 24 })
</script>

<template>
  <svg viewBox="0 0 64 64" :width="size" :height="size" aria-hidden="true">
    <rect width="64" height="64" rx="14" fill="var(--ink)" />
    <rect x="10" y="18" width="44" height="28" rx="4" fill="var(--ice)" />
    <rect x="16" y="26" width="18" height="3" rx="1.5" fill="var(--forest)" />
    <rect x="16" y="33" width="13" height="3" rx="1.5" fill="var(--sage)" />
    <circle cx="44" cy="34" r="7.5" fill="var(--forest)" />
    <circle cx="44" cy="34" r="3" fill="var(--mint)" />
  </svg>
</template>
