import { getSession } from 'next-auth/react';

export async function fetchWithAuth(endpoint: string, options: RequestInit = {}) {
  const session = await getSession();
  const token = (session as any)?.accessToken;

  // Automatically injects the JWT token into the headers for the backend
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
  };

  return fetch(`/api/finance${endpoint}`, {
    ...options,
    headers,
  });
}