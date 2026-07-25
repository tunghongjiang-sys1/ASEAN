import { useCallback, useEffect, useRef, useState } from 'react';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { GOOGLE_CLIENT_ID, GoogleProfile } from './google-auth';

WebBrowser.maybeCompleteAuthSession();

const unconfiguredhint =
  'Google sign-in is not configured yet. Add EXPO_PUBLIC_GOOGLE_CLIENT_ID to your .env (see .env.example).';

export type GoogleAuthState = {
  configured: boolean;
  ready: boolean;
  loading: boolean;
  profile: GoogleProfile | null;
  error: string | null;
  signIn: () => Promise<void>;
  reset: () => void;
};

async function fetchgoogleprofile(accesstoken: string): Promise<GoogleProfile | null> {
  try {
    const r = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${accesstoken}` },
    });
    if (!r.ok) return null;
    const data = (await r.json()) as {
      sub?: string;
      email?: string;
      name?: string;
      given_name?: string;
      family_name?: string;
      picture?: string;
    };
    if (!data.sub) return null;
    return {
      sub: data.sub,
      email: data.email || '',
      name:
        data.name ||
        [data.given_name, data.family_name].filter(Boolean).join(' ').trim() ||
        data.email ||
        'traveler',
      picture: data.picture,
    };
  } catch {
    return null;
  }
}

export function useGoogleAuth(): GoogleAuthState {
  const [request, response, promptasync] = Google.useAuthRequest({
    clientId: GOOGLE_CLIENT_ID || undefined,
    webClientId: GOOGLE_CLIENT_ID || undefined,
    iosClientId: GOOGLE_CLIENT_ID || undefined,
    androidClientId: GOOGLE_CLIENT_ID || undefined,
    scopes: ['openid', 'profile', 'email'],
    selectAccount: true,
  });

  const [profile, setprofile] = useState<GoogleProfile | null>(null);
  const [error, seterror] = useState<string | null>(null);
  const [loading, setloading] = useState(false);
  const promptinflight = useRef(false);

  useEffect(() => {
    if (!response) return;
    if (response.type === 'success') {
      const accesstoken = response.authentication?.accessToken;
      if (!accesstoken) {
        seterror('Google did not return an access token');
        promptinflight.current = false;
        setloading(false);
        return;
      }
      fetchgoogleprofile(accesstoken).then((p) => {
        if (p) {
          setprofile(p);
          seterror(null);
        } else {
          seterror('Could not read your Google profile');
        }
        promptinflight.current = false;
        setloading(false);
      });
      return;
    }
    if (response.type === 'error') {
      seterror(response.error?.message || 'Google sign-in failed');
    }
    promptinflight.current = false;
    setloading(false);
  }, [response]);

  const signin = useCallback(async () => {
    seterror(null);
    setprofile(null);
    if (!GOOGLE_CLIENT_ID) {
      seterror(unconfiguredhint);
      return;
    }
    if (!request) {
      seterror('Google sign-in is still warming up — try again in a moment.');
      return;
    }
    promptinflight.current = true;
    setloading(true);
    try {
      await promptasync();
    } catch (e: any) {
      seterror(e?.message || 'Google sign-in failed');
      promptinflight.current = false;
      setloading(false);
    }
  }, [promptasync, request]);

  const reset = useCallback(() => {
    setprofile(null);
    seterror(null);
    setloading(false);
    promptinflight.current = false;
  }, []);

  return {
    configured: GOOGLE_CLIENT_ID.length > 0,
    ready: !!request,
    loading: loading || promptinflight.current,
    profile,
    error,
    signIn: signin,
    reset,
  };
}
