import { getToken } from '../auth/auth';

const API_URL =
  import.meta.env.VITE_API_URL ?? (import.meta.env.DEV ? 'http://localhost:3333' : '');

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
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error(data?.error?.message ?? `${method} ${path} failed: ${res.status}`);
  }
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
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error(data?.error?.message ?? `POST ${path} failed: ${res.status}`);
  }
  return res.blob();
}

export async function apiGetFile(path: string): Promise<Blob> {
  const res = await fetch(`${API_URL}${path}`);
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error(data?.error?.message ?? `GET ${path} failed: ${res.status}`);
  }
  return res.blob();
}
