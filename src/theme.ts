import { definePreset } from '@primeuix/themes'
import Aura from '@primeuix/themes/aura'

// Hanko-seal palette: washi paper background, ink text, vermillion seal accent.
export const MeishiPreset = definePreset(Aura, {
  semantic: {
    primary: {
      50: '#fdf1ef',
      100: '#f9dad4',
      200: '#f2b5a9',
      300: '#e8907d',
      400: '#d96652',
      500: '#b5342a',
      600: '#932c24',
      700: '#78241d',
      800: '#611d18',
      900: '#4f1814',
      950: '#2c0c0a',
    },
    colorScheme: {
      light: {
        surface: {
          0: '#ffffff',
          50: '#fbf8f2',
          100: '#f3ede0',
          200: '#e6dcc7',
          300: '#d6c8a8',
          400: '#bfa87d',
          500: '#a68c5f',
          600: '#8a7550',
          700: '#6b5a3f',
          800: '#4a3e2c',
          900: '#2b2622',
          950: '#1a1613',
        },
      },
    },
  },
})
