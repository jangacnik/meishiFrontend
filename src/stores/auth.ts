import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import * as api from '../lib/api'
import { decodeJwt, isExpired, type JwtClaims } from '../lib/jwt'

const STORAGE_KEY = 'meishi.token'

function loadStoredClaims(): { token: string; claims: JwtClaims } | null {
  const token = localStorage.getItem(STORAGE_KEY)
  if (!token) return null
  try {
    const claims = decodeJwt(token)
    if (isExpired(claims)) {
      localStorage.removeItem(STORAGE_KEY)
      return null
    }
    return { token, claims }
  } catch {
    localStorage.removeItem(STORAGE_KEY)
    return null
  }
}

export const useAuthStore = defineStore('auth', () => {
  const stored = loadStoredClaims()
  const token = ref<string | null>(stored?.token ?? null)
  const claims = ref<JwtClaims | null>(stored?.claims ?? null)

  const isAuthenticated = computed(() => token.value !== null)
  const isAdmin = computed(() => claims.value?.role === 'ADMIN')
  const nickname = computed(() => claims.value?.nickname ?? null)

  function setToken(newToken: string) {
    token.value = newToken
    claims.value = decodeJwt(newToken)
    localStorage.setItem(STORAGE_KEY, newToken)
  }

  async function login(loginNickname: string, password: string) {
    const { token: newToken } = await api.login(loginNickname, password)
    setToken(newToken)
  }

  async function register(activationKey: string, newNickname: string, password: string) {
    const { token: newToken } = await api.register(activationKey, newNickname, password)
    setToken(newToken)
  }

  function logout() {
    token.value = null
    claims.value = null
    localStorage.removeItem(STORAGE_KEY)
  }

  function logoutIfExpired() {
    if (claims.value && isExpired(claims.value)) logout()
  }

  function setNickname(newNickname: string) {
    if (claims.value) claims.value = { ...claims.value, nickname: newNickname }
  }

  return { token, claims, isAuthenticated, isAdmin, nickname, login, register, logout, logoutIfExpired, setNickname }
})
