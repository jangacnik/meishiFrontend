import { ApiError } from './api'

function sentenceCase(text: string): string {
  const trimmed = text.trim()
  if (!trimmed) return trimmed
  const [first] = Array.from(trimmed)
  const capitalized = first.toUpperCase() + trimmed.slice(first.length)
  return /[.!?]$/.test(capitalized) ? capitalized : `${capitalized}.`
}

export function errorMessage(e: unknown, fallback: string): string {
  if (e instanceof TypeError) return 'Could not reach the server. Check your connection and try again.'
  if (!(e instanceof ApiError)) return fallback
  if (e.status === 429) return 'Too many attempts. Wait a moment and try again.'
  if (e.status >= 500) return 'Something went wrong on our side. Try again later.'
  if ((e.status === 400 || e.status === 409) && e.message.trim() && !e.message.startsWith('request failed')) return sentenceCase(e.message)
  return fallback
}
