import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AttractionPreference, NoteItem, UserLocation } from '../types/place';

export type AuthMode = 'guest' | 'google';

export type AuthUser = {
  mode: AuthMode;
  name: string;
  email?: string;
};

type AppState = {
  auth: AuthUser | null;
  loginAsGuest: () => void;
  loginWithGoogle: () => void;
  logout: () => void;
  preferences: AttractionPreference[];
  setPreferences: (v: AttractionPreference[]) => void;
  userLocation: UserLocation | null;
  setUserLocation: (v: UserLocation | null) => void;
  notes: NoteItem[];
  addNote: (placeId: string) => void;
  removeNote: (placeId: string) => void;
  hasNote: (placeId: string) => boolean;
  selectedPlaceId: string | null;
  setSelectedPlaceId: (id: string | null) => void;
  onboarded: boolean;
  setOnboarded: (v: boolean) => void;
  resetJourney: () => void;
};

const AppContext = createContext<AppState | null>(null);
const NOTES_KEY = 'asean_travel_notes';
const PREF_KEY = 'asean_travel_prefs';
const AUTH_KEY = 'asean_travel_auth';
const ONBOARD_KEY = 'asean_travel_onboarded';
const LOC_KEY = 'asean_travel_location';

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [auth, setAuth] = useState<AuthUser | null>(null);
  const [preferences, setPreferencesState] = useState<AttractionPreference[]>([]);
  const [userLocation, setUserLocationState] = useState<UserLocation | null>(null);
  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
  const [onboarded, setOnboardedState] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [n, p, a, o, l] = await Promise.all([
          AsyncStorage.getItem(NOTES_KEY),
          AsyncStorage.getItem(PREF_KEY),
          AsyncStorage.getItem(AUTH_KEY),
          AsyncStorage.getItem(ONBOARD_KEY),
          AsyncStorage.getItem(LOC_KEY),
        ]);
        if (n) setNotes(JSON.parse(n));
        if (p) setPreferencesState(JSON.parse(p));
        if (a) setAuth(JSON.parse(a));
        if (o === '1') setOnboardedState(true);
        if (l) setUserLocationState(JSON.parse(l));
      } catch {}
      setHydrated(true);
    })();
  }, []);

  const persistAuth = useCallback((user: AuthUser | null) => {
    setAuth(user);
    if (user) AsyncStorage.setItem(AUTH_KEY, JSON.stringify(user)).catch(() => {});
    else AsyncStorage.removeItem(AUTH_KEY).catch(() => {});
  }, []);

  const loginAsGuest = useCallback(() => {
    persistAuth({ mode: 'guest', name: 'guest traveller' });
  }, [persistAuth]);

  const loginWithGoogle = useCallback(() => {
    persistAuth({
      mode: 'google',
      name: 'google traveller',
      email: 'traveller@gmail.com',
    });
  }, [persistAuth]);

  const logout = useCallback(() => {
    persistAuth(null);
    setOnboardedState(false);
    setUserLocationState(null);
    setSelectedPlaceId(null);
    AsyncStorage.multiRemove([ONBOARD_KEY, LOC_KEY]).catch(() => {});
  }, [persistAuth]);

  const setPreferences = useCallback((v: AttractionPreference[]) => {
    setPreferencesState(v);
    AsyncStorage.setItem(PREF_KEY, JSON.stringify(v)).catch(() => {});
  }, []);

  const setUserLocation = useCallback((v: UserLocation | null) => {
    setUserLocationState(v);
    if (v) AsyncStorage.setItem(LOC_KEY, JSON.stringify(v)).catch(() => {});
    else AsyncStorage.removeItem(LOC_KEY).catch(() => {});
  }, []);

  const setOnboarded = useCallback((v: boolean) => {
    setOnboardedState(v);
    AsyncStorage.setItem(ONBOARD_KEY, v ? '1' : '0').catch(() => {});
  }, []);

  const addNote = useCallback((placeId: string) => {
    setNotes((prev) => {
      if (prev.some((n) => n.placeId === placeId)) return prev;
      const next = [...prev, { placeId, addedAt: new Date().toISOString() }];
      AsyncStorage.setItem(NOTES_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const removeNote = useCallback((placeId: string) => {
    setNotes((prev) => {
      const next = prev.filter((n) => n.placeId !== placeId);
      AsyncStorage.setItem(NOTES_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const hasNote = useCallback(
    (placeId: string) => notes.some((n) => n.placeId === placeId),
    [notes]
  );

  const resetJourney = useCallback(() => {
    setOnboarded(false);
    setUserLocation(null);
    setSelectedPlaceId(null);
  }, [setOnboarded, setUserLocation]);

  const value = useMemo(
    () => ({
      auth,
      loginAsGuest,
      loginWithGoogle,
      logout,
      preferences,
      setPreferences,
      userLocation,
      setUserLocation,
      notes,
      addNote,
      removeNote,
      hasNote,
      selectedPlaceId,
      setSelectedPlaceId,
      onboarded,
      setOnboarded,
      resetJourney,
    }),
    [
      auth,
      loginAsGuest,
      loginWithGoogle,
      logout,
      preferences,
      setPreferences,
      userLocation,
      setUserLocation,
      notes,
      addNote,
      removeNote,
      hasNote,
      selectedPlaceId,
      onboarded,
      setOnboarded,
      resetJourney,
    ]
  );

  return (
    <AppContext.Provider value={value}>
      {hydrated ? children : null}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
