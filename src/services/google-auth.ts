export type GoogleProfile = {
  name: string;
  email: string;
  picture?: string;
  sub: string;
};

type jwtclaims = {
  sub?: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
  given_name?: string;
  family_name?: string;
  picture?: string;
  aud?: string | string[];
  iss?: string;
  exp?: number;
  iat?: number;
};

export function decodeJwt<T = Record<string, unknown>>(token: string): T | null {
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = payload + '='.repeat((4 - (payload.length % 4)) % 4);
    const json =
      typeof globalThis.atob === 'function'
        ? globalThis.atob(padded)
        : Buffer.from(padded, 'base64').toString('binary');
    return JSON.parse(json) as T;
  } catch {
    return null;
  }
}

export function profileFromIdToken(idToken: string): GoogleProfile | null {
  const claims = decodeJwt<jwtclaims>(idToken);
  if (!claims || (!claims.sub && !claims.email)) return null;
  return {
    sub: claims.sub || claims.email || '',
    email: claims.email || '',
    name:
      claims.name ||
      [claims.given_name, claims.family_name].filter(Boolean).join(' ').trim() ||
      claims.email ||
      'traveler',
    picture: claims.picture,
  };
}

export const GOOGLE_CLIENT_ID =
  process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID?.trim() || '';

export function isGoogleConfigured(): boolean {
  return GOOGLE_CLIENT_ID.length > 0;
}
