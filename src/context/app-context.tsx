import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AttractionPreference, NoteItem, RedeemedVoucher, ShopVoucher, TravellerProfile, UserLocation } from '../types/place';

export type AuthMode = 'guest' | 'google' | 'email';

export type AuthUser = {
  mode: AuthMode;
  name: string;
  email?: string;
  picture?: string;
};

export type GoogleProfileInput = {
  name?: string;
  email?: string;
  picture?: string;
  sub?: string;
};

export type EmailHistoryEntry = {
  email: string;
  name: string;
  signedInAt: string;
  signedOutAt: string | null;
};

type AppState = {
  auth: AuthUser | null;
  loginAsGuest: () => void;
  loginWithGoogle: (profile?: GoogleProfileInput) => void;
  loginWithEmail: (email: string, name?: string) => void;
  logout: () => void;
  preferences: AttractionPreference[];
  setPreferences: (v: AttractionPreference[]) => void;
  userLocation: UserLocation | null;
  setUserLocation: (v: UserLocation | null) => void;
  notes: NoteItem[];
  addNote: (placeId: string, body?: string) => void;
  removeNote: (placeId: string) => void;
  updatenotebody: (placeId: string, body: string) => void;
  hasNote: (placeId: string) => boolean;
  selectedPlaceId: string | null;
  setSelectedPlaceId: (id: string | null) => void;
  onboarded: boolean;
  setOnboarded: (v: boolean) => void;
  resetJourney: () => void;
  emailHistory: EmailHistoryEntry[];
  removeemailhistoryentry: (email: string) => void;
  travellerProfile: TravellerProfile | null;
  setTravellerProfile: (v: TravellerProfile | null) => void;
  shopPoints: number;
  addShopPoints: (pts: number) => void;
  redeemedVoucherIds: string[];
  redeemVoucher: (voucherId: string, points: number, title: string, category: ShopVoucher['category']) => RedeemedVoucher | null;
  isVoucherRedeemed: (voucherId: string) => boolean;
};

const AppContext = createContext<AppState | null>(null);
const NOTES_KEY = 'asean_travel_notes';
const PREF_KEY = 'asean_travel_prefs';
const AUTH_KEY = 'asean_travel_auth';
const ONBOARD_KEY = 'asean_travel_onboarded';
const LOC_KEY = 'asean_travel_location';
const emailhistorykey = 'asean_travel_email_history';
const PROFILE_KEY = 'asean_travel_profile';
const POINTS_KEY = 'asean_travel_points';
const REDEEMED_KEY = 'asean_travel_redeemed';

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [auth, setAuth] = useState<AuthUser | null>(null);
  const [preferences, setPreferencesState] = useState<AttractionPreference[]>([]);
  const [userLocation, setUserLocationState] = useState<UserLocation | null>(null);
  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
  const [onboarded, setOnboardedState] = useState(false);
  const [emailhistory, setemailhistory] = useState<EmailHistoryEntry[]>([]);
  const [travellerProfile, setTravellerProfileState] = useState<TravellerProfile | null>(null);
  const [shopPoints, setShopPointsState] = useState(0);
  const [redeemedVoucherIds, setRedeemedVoucherIds] = useState<string[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [n, p, a, o, l, eh, pr, sp, rd] = await Promise.all([
          AsyncStorage.getItem(NOTES_KEY),
          AsyncStorage.getItem(PREF_KEY),
          AsyncStorage.getItem(AUTH_KEY),
          AsyncStorage.getItem(ONBOARD_KEY),
          AsyncStorage.getItem(LOC_KEY),
          AsyncStorage.getItem(emailhistorykey),
          AsyncStorage.getItem(PROFILE_KEY),
          AsyncStorage.getItem(POINTS_KEY),
          AsyncStorage.getItem(REDEEMED_KEY),
        ]);
        if (n) {
          const parsed = JSON.parse(n);
          if (Array.isArray(parsed)) {
            setNotes(
              parsed.map((x: any) => ({
                placeId: String(x?.placeId ?? ''),
                addedAt: String(x?.addedAt ?? new Date().toISOString()),
                body: typeof x?.body === 'string' ? x.body : undefined,
                updatedAt: typeof x?.updatedAt === 'string' ? x.updatedAt : undefined,
              }))
            );
          }
        }
        if (p) setPreferencesState(JSON.parse(p));
        if (a) setAuth(JSON.parse(a));
        if (o === '1') setOnboardedState(true);
        if (l) setUserLocationState(JSON.parse(l));
        if (eh) setemailhistory(JSON.parse(eh));
        if (pr) setTravellerProfileState(JSON.parse(pr));
        if (sp) setShopPointsState(Number(sp) || 0);
        if (rd) {
          const parsed = JSON.parse(rd);
          if (Array.isArray(parsed)) setRedeemedVoucherIds(parsed.map(String));
        }
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

  const recordemaillogin = useCallback((emailraw: string, nameraw: string) => {
    const now = new Date().toISOString();
    setemailhistory((prev) => {
      const closed = prev.map((e) =>
        e.email === emailraw && e.signedOutAt === null
          ? { ...e, signedOutAt: now }
          : e
      );
      const next = [
        ...closed,
        { email: emailraw, name: nameraw, signedInAt: now, signedOutAt: null },
      ];
      AsyncStorage.setItem(emailhistorykey, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const recordemaillogout = useCallback((emailraw: string) => {
    if (!emailraw) return;
    const now = new Date().toISOString();
    setemailhistory((prev) => {
      const next = prev.map((e) =>
        e.email === emailraw && e.signedOutAt === null
          ? { ...e, signedOutAt: now }
          : e
      );
      AsyncStorage.setItem(emailhistorykey, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const removeemailhistoryentry = useCallback((emailraw: string) => {
    const target = emailraw.trim().toLowerCase();
    if (!target) return;
    setemailhistory((prev) => {
      const next = prev.filter((e) => e.email.toLowerCase() !== target);
      AsyncStorage.setItem(emailhistorykey, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const loginWithGoogle = useCallback(
    (profile?: GoogleProfileInput) => {
      if (profile?.email && profile?.name) {
        persistAuth({
          mode: 'google',
          name: profile.name,
          email: profile.email,
          picture: profile.picture,
        });
      } else {
        persistAuth({
          mode: 'google',
          name: 'google traveller',
          email: 'traveller@gmail.com',
        });
      }
    },
    [persistAuth]
  );

  const loginWithEmail = useCallback(
    (emailraw: string, nameraw?: string) => {
      const cleanemail = emailraw.trim();
      if (!cleanemail) return;
      const localpart = cleanemail.split('@')[0] || '';
      const safename = localpart.replace(/[^a-z0-9._-]/gi, '');
      const displayname =
        nameraw?.trim() || safename || cleanemail || 'traveler';
      persistAuth({
        mode: 'email',
        name: displayname,
        email: cleanemail,
      });
      recordemaillogin(cleanemail, displayname);
    },
    [persistAuth, recordemaillogin]
  );

  const logout = useCallback(() => {
    if (auth?.mode === 'email' && auth.email) {
      recordemaillogout(auth.email);
    }
    persistAuth(null);
    setOnboardedState(false);
    setUserLocationState(null);
    setSelectedPlaceId(null);
    AsyncStorage.multiRemove([ONBOARD_KEY, LOC_KEY]).catch(() => {});
  }, [auth, persistAuth, recordemaillogout]);

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

  const addNote = useCallback((placeId: string, bodyraw?: string) => {
    const body = bodyraw?.trim() || undefined;
    const now = new Date().toISOString();
    setNotes((prev) => {
      if (prev.some((n) => n.placeId === placeId)) {
        const next = prev.map((n) =>
          n.placeId === placeId ? { ...n, body: body ?? n.body, updatedAt: now } : n
        );
        AsyncStorage.setItem(NOTES_KEY, JSON.stringify(next)).catch(() => {});
        return next;
      }
      const next = [...prev, { placeId, addedAt: now, body, updatedAt: body ? now : undefined }];
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

  const updatenotebody = useCallback((placeId: string, bodyraw: string) => {
    const body = bodyraw.trim() || undefined;
    const now = new Date().toISOString();
    setNotes((prev) => {
      const next = prev.map((n) => (n.placeId === placeId ? { ...n, body, updatedAt: now } : n));
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

  const setTravellerProfile = useCallback((v: TravellerProfile | null) => {
    setTravellerProfileState(v);
    if (v) AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(v)).catch(() => {});
    else AsyncStorage.removeItem(PROFILE_KEY).catch(() => {});
  }, []);

  const addShopPoints = useCallback((pts: number) => {
    setShopPointsState((prev) => {
      const next = prev + pts;
      AsyncStorage.setItem(POINTS_KEY, String(next)).catch(() => {});
      return next;
    });
  }, []);

  const redeemVoucher = useCallback(
    (voucherId: string, points: number, title: string, category: ShopVoucher['category']): RedeemedVoucher | null => {
      // already redeemed?
      if (redeemedVoucherIds.includes(voucherId)) return null;

      let redeemed: RedeemedVoucher | null = null;
      setShopPointsState((prev) => {
        if (prev < points) return prev; // not enough points
        const next = prev - points;
        AsyncStorage.setItem(POINTS_KEY, String(next)).catch(() => {});
        redeemed = {
          voucherId,
          title,
          category: category as RedeemedVoucher['category'],
          pointsSpent: points,
          redeemedAt: new Date().toISOString(),
          code: `ASEAN-${voucherId.slice(2).toUpperCase()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
        };
        return next;
      });

      if (!redeemed) return null;

      setRedeemedVoucherIds((prev) => {
        const next = [...prev, voucherId];
        AsyncStorage.setItem(REDEEMED_KEY, JSON.stringify(next)).catch(() => {});
        return next;
      });

      return redeemed;
    },
    [redeemedVoucherIds]
  );

  const isVoucherRedeemed = useCallback(
    (voucherId: string) => redeemedVoucherIds.includes(voucherId),
    [redeemedVoucherIds]
  );

  const value = useMemo(
    () => ({
      auth,
      loginAsGuest,
      loginWithGoogle,
      loginWithEmail,
      logout,
      preferences,
      setPreferences,
      userLocation,
      setUserLocation,
      notes,
      addNote,
      removeNote,
      hasNote,
      updatenotebody,
      selectedPlaceId,
      setSelectedPlaceId,
      onboarded,
      setOnboarded,
      resetJourney,
      emailHistory: emailhistory,
      removeemailhistoryentry,
      travellerProfile,
      setTravellerProfile,
      shopPoints,
      addShopPoints,
      redeemedVoucherIds,
      redeemVoucher,
      isVoucherRedeemed,
    }),
    [
      auth,
      loginAsGuest,
      loginWithGoogle,
      loginWithEmail,
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
      emailhistory,
      removeemailhistoryentry,
      updatenotebody,
      travellerProfile,
      setTravellerProfile,
      shopPoints,
      addShopPoints,
      redeemedVoucherIds,
      redeemVoucher,
      isVoucherRedeemed,
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
