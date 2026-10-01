import { clearToken, getToken } from '../auth/auth';

const API_URL =
  import.meta.env.VITE_API_URL ?? (import.meta.env.DEV ? 'http://localhost:3333' : '');

// Outside /api/auth/, only our own auth middleware returns 401, so it means the session expired.
async function failure(res: Response, method: string, path: string, token: string | null): Promise<Error> {
  if (res.status === 401 && token && !path.startsWith('/api/auth/')) {
    clearToken();
    window.location.assign('/');
  }
  const data = await res.json().catch(() => null);
  return new Error(data?.error?.message ?? `${method} ${path} failed: ${res.status}`);
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw await failure(res, method, path, token);
  return res.json();
}

export const apiGet = <T>(path: string) => request<T>('GET', path);
export const apiPost = <T>(path: string, body?: unknown) =>
  request<T>('POST', path, body);
export const apiPut = <T>(path: string, body?: unknown) =>
  request<T>('PUT', path, body);
export const apiPatch = <T>(path: string, body?: unknown) =>
  request<T>('PATCH', path, body);
export const apiDelete = <T>(path: string) => request<T>('DELETE', path);

export async function apiPostFile(path: string): Promise<Blob> {
  const token = getToken();
  const res = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  if (!res.ok) throw await failure(res, 'POST', path, token);
  return res.blob();
}

export async function apiGetFile(path: string): Promise<Blob> {
  const res = await fetch(`${API_URL}${path}`);
  if (!res.ok) throw await failure(res, 'GET', path, null);
  return res.blob();
}
