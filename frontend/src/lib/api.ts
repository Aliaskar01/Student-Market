const RAW_API_BASE = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');

const REFRESH_TOKEN_KEY = 'sm_refresh_token';
const STORAGE_MODE_KEY = 'sm_storage_mode';

let inMemoryAccessToken: string | null = null;
let refreshPromise: Promise<string | null> | null = null;

export function getApiUrl(path: string): string {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${RAW_API_BASE}${normalized}`;
}

export function resolveMediaUrl(ref?: string | null): string | null {
  if (!ref) return null;
  if (ref.startsWith('http://') || ref.startsWith('https://') || ref.startsWith('data:')) {
    return ref;
  }
  return getApiUrl(ref);
}

export function getInitials(fullName?: string | null): string {
  if (!fullName) return '?';
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export function getAccessToken(): string | null {
  return inMemoryAccessToken;
}

export function getStoredRefreshToken(): string | null {
  return (
    localStorage.getItem(REFRESH_TOKEN_KEY) ||
    sessionStorage.getItem(REFRESH_TOKEN_KEY)
  );
}

export function saveTokens(
  accessToken: string,
  refreshToken: string,
  rememberMe?: boolean
): void {
  inMemoryAccessToken = accessToken;
  const existingMode = localStorage.getItem(STORAGE_MODE_KEY);
  const useLocal =
    rememberMe !== undefined ? rememberMe : existingMode !== 'session';

  localStorage.removeItem(REFRESH_TOKEN_KEY);
  sessionStorage.removeItem(REFRESH_TOKEN_KEY);

  if (useLocal) {
    localStorage.setItem(STORAGE_MODE_KEY, 'local');
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  } else {
    localStorage.setItem(STORAGE_MODE_KEY, 'session');
    sessionStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  }
}

export function clearTokens(): void {
  inMemoryAccessToken = null;
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  sessionStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(STORAGE_MODE_KEY);
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function parseErrorMessage(response: Response): Promise<string> {
  try {
    const data = await response.json();
    if (typeof data?.detail === 'string') return data.detail;
    if (Array.isArray(data?.detail) && data.detail.length > 0) {
      return data.detail.map((d: { msg?: string }) => d.msg || 'Validation error').join(', ');
    }
    if (typeof data?.message === 'string') return data.message;
  } catch {
    // Fallback to HTTP status text
  }
  return `Request failed (${response.status})`;
}

export async function refreshAccessToken(): Promise<string | null> {
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    const refreshToken = getStoredRefreshToken();
    if (!refreshToken) {
      clearTokens();
      return null;
    }

    try {
      const res = await fetch(getApiUrl('/api/auth/refresh'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });
      if (!res.ok) {
        clearTokens();
        return null;
      }
      const data = await res.json();
      saveTokens(data.access_token, data.refresh_token);
      return data.access_token as string;
    } catch {
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

export async function apiFetch<T = unknown>(
  path: string,
  options: RequestInit & { skipAuth?: boolean; retryOn401?: boolean } = {}
): Promise<T> {
  const { skipAuth = false, retryOn401 = true, headers, ...rest } = options;

  const requestHeaders = new Headers(headers || {});
  if (!skipAuth) {
    let token = getAccessToken();
    if (!token && getStoredRefreshToken()) {
      token = await refreshAccessToken();
    }
    if (token) {
      requestHeaders.set('Authorization', `Bearer ${token}`);
    }
  }

  if (
    rest.body &&
    !(rest.body instanceof FormData) &&
    !requestHeaders.has('Content-Type')
  ) {
    requestHeaders.set('Content-Type', 'application/json');
  }

  let response = await fetch(getApiUrl(path), {
    ...rest,
    headers: requestHeaders,
  });

  if (response.status === 401 && !skipAuth && retryOn401 && getStoredRefreshToken()) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      requestHeaders.set('Authorization', `Bearer ${newToken}`);
      response = await fetch(getApiUrl(path), {
        ...rest,
        headers: requestHeaders,
      });
    }
  }

  if (!response.ok) {
    const msg = await parseErrorMessage(response);
    throw new ApiError(response.status, msg);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}
