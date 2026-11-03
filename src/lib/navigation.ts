/** Leaves the SPA for an absolute URL. A module of its own so tests can replace it. */
export function leaveTo(url: string) {
  window.location.assign(url)
}

/** An in-app path from a query value, or `/`. Never a URL to another site. */
export function localPath(value: unknown): string {
  return typeof value === 'string' && value.startsWith('/') && !value.startsWith('//') ? value : '/'
}
