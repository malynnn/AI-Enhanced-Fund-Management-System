import { getSession } from 'next-auth/react';

const GATEWAY_URL = process.env.NEXT_PUBLIC_GATEWAY_URL || 'http://localhost:3000';

export async function fetchWithAuth(endpoint: string, options: RequestInit = {}) {
  const session = await getSession();
  const token = (session as any)?.accessToken;

  // Automatically injects the JWT token into the headers for the backend
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
  };

  return fetch(`${GATEWAY_URL}/api/finance${endpoint}`, {
    ...options,
    headers,
  });
}