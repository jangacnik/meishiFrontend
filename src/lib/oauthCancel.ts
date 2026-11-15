export interface AuthorizeTarget {
  clientId: string
  redirectUri: string
  state: string | null
}

/** The client, redirect URI and state of an in-app `/oauth/authorize?...` path, or null for anything else. */
export function authorizeTarget(redirect: unknown): AuthorizeTarget | null {
  if (typeof redirect !== 'string' || !redirect.startsWith('/') || redirect.startsWith('//')) return null
  const url = new URL(redirect, 'https://meishi.invalid')
  const clientId = url.searchParams.get('client_id')
  const redirectUri = url.searchParams.get('redirect_uri')
  if (url.pathname !== '/oauth/authorize' || !clientId || !redirectUri) return null
  return { clientId, redirectUri, state: url.searchParams.get('state') }
}

/** Where to send the user who declines: the client's redirect URI with error=access_denied and the state. */
export function cancelUrl(redirectUri: string, state: string | null): string | null {
  let url: URL
  try {
    url = new URL(redirectUri)
  } catch {
    return null
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null
  url.searchParams.set('error', 'access_denied')
  if (state) url.searchParams.set('state', state)
  return url.toString()
}
