/**
 * Module-level access token store.
 * Lives outside of React so Apollo links can read the latest token
 * without being recreated on each render.
 */

let _accessToken: string | null = null;
let _refreshPromise: Promise<string | null> | null = null;

export function getAccessToken(): string | null {
  return _accessToken;
}

export function setAccessToken(token: string | null): void {
  _accessToken = token;
}

/** Calls /api/auth/refresh and updates the stored token. Deduplicates concurrent calls. */
export function refreshAccessToken(): Promise<string | null> {
  if (_refreshPromise) return _refreshPromise;

  _refreshPromise = fetch("/api/auth/refresh", { method: "POST" })
    .then(async (res) => {
      if (!res.ok) {
        _accessToken = null;
        return null;
      }
      const data = await res.json();
      _accessToken = data.accessToken ?? null;
      return _accessToken;
    })
    .catch(() => {
      _accessToken = null;
      return null;
    })
    .finally(() => {
      _refreshPromise = null;
    });

  return _refreshPromise;
}
