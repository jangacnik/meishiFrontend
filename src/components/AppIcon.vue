<script setup lang="ts">
export type IconName =
  | 'trash'
  | 'snowflake'
  | 'sun'
  | 'user-plus'
  | 'undo'
  | 'copy'
  | 'check'
  | 'arrow-up-right'
  | 'pencil'
  | 'x'
  | 'key'

withDefaults(defineProps<{ name: IconName; size?: number }>(), { size: 14 })

const PATHS: Record<IconName, string[]> = {
  trash: ['M4 7 H20 M10 7 V5 a1 1 0 0 1 1-1 h2 a1 1 0 0 1 1 1 v2', 'M6 7 L7 19 a1 1 0 0 0 1 1 h8 a1 1 0 0 0 1-1 L18 7', 'M10 11 V16 M14 11 V16'],
  snowflake: ['M12 3 V21 M4.2 7.5 L19.8 16.5 M19.8 7.5 L4.2 16.5', 'M12 6.5 L9.5 4.5 M12 6.5 L14.5 4.5 M12 17.5 L9.5 19.5 M12 17.5 L14.5 19.5'],
  sun: ['M12 8 a4 4 0 1 0 0 8 a4 4 0 0 0 0-8', 'M12 2 V4 M12 20 V22 M4.9 4.9 L6.3 6.3 M17.7 17.7 L19.1 19.1 M2 12 H4 M20 12 H22 M4.9 19.1 L6.3 17.7 M17.7 6.3 L19.1 4.9'],
  'user-plus': ['M13 20 v-1 a4 4 0 0 0-4-4 H6 a4 4 0 0 0-4 4 v1', 'M7.5 7 a3.5 3.5 0 1 0 0 7 a3.5 3.5 0 0 0 0-7', 'M18 8 V14 M15 11 H21'],
  undo: ['M4 9 H14 a5 5 0 0 1 0 10 H9', 'M8 5 L4 9 L8 13'],
  copy: ['M9 9 h9 a2 2 0 0 1 2 2 v9 a2 2 0 0 1-2 2 h-9 a2 2 0 0 1-2-2 v-9 a2 2 0 0 1 2-2', 'M5 15 V5 a2 2 0 0 1 2-2 h8'],
  check: ['M5 13 L9 17 L19 7'],
  'arrow-up-right': ['M8 16 L16 8 M9 8 H16 V15'],
  pencil: ['M4 20 L4 17 L15 6 a2.121 2.121 0 0 1 3 3 L7 20 H4', 'M13 8 L16 11'],
  x: ['M6 6 L18 18', 'M18 6 L6 18'],
  key: ['M15 9 a3 3 0 1 1-6 0 a3 3 0 0 1 6 0', 'M12.5 11.5 L4 20 V17 H7 V14 H10'],
}
</script>

<template>
  <svg
    :viewBox="'0 0 24 24'"
    :width="size"
    :height="size"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <path v-for="(d, i) in PATHS[name]" :key="i" :d="d" />
  </svg>
</template>
