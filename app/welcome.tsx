import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
  type ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '../src/components/ui/button';
import { colors } from '../src/constants/colors';
import { useApp } from '../src/context/app-context';
import { useGoogleAuth } from '../src/services/use-google-auth';
import { homepagePhotos } from '../src/data/place-images';

const HERO_COUNT = 4;

function pickRandom<T>(arr: T[], n: number): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, Math.min(n, copy.length));
}

function formatrelative(iso: string, baseline: number): string {
  const diffms = baseline - new Date(iso).getTime();
  if (diffms < 60_000) return 'just now';
  if (diffms < 3_600_000) return Math.floor(diffms / 60_000) + 'm ago';
  if (diffms < 86_400_000) return Math.floor(diffms / 3_600_000) + 'h ago';
  if (diffms < 7 * 86_400_000) return Math.floor(diffms / 86_400_000) + 'd ago';
  return new Date(iso).toLocaleDateString();
}

export default function WelcomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const compact = width < 420;
  const wide = width >= 900;
  const {
    auth,
    loginAsGuest,
    loginWithGoogle,
    loginWithEmail,
    logout,
    onboarded,
    emailHistory,
    removeemailhistoryentry,
  } = useApp();
  const [emailInput, setEmailInput] = useState('');
  const [emailOpen, setEmailOpen] = useState(false);

  const [now, setnow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setnow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  const recentemails = useMemo(() => {
    const map = new Map<string, { email: string; lastsignedinat: string; opens: number }>();
    for (const e of emailHistory) {
      const existing = map.get(e.email);
      if (!existing) {
        map.set(e.email, { email: e.email, lastsignedinat: e.signedInAt, opens: 1 });
      } else {
        existing.opens++;
        if (new Date(e.signedInAt) > new Date(existing.lastsignedinat)) {
          existing.lastsignedinat = e.signedInAt;
        }
      }
    }
    return Array.from(map.values()).sort(
      (a, b) => new Date(b.lastsignedinat).getTime() - new Date(a.lastsignedinat).getTime()
    );
  }, [emailHistory]);
  const google = useGoogleAuth();

  useEffect(() => {
    if (google.profile) {
      loginWithGoogle(google.profile);
    }
  }, [google.profile]);

  const [heroImages, setHeroImages] = useState<number[]>(() =>
    pickRandom(homepagePhotos, HERO_COUNT)
  );
  const fades = useRef(heroImages.map(() => new Animated.Value(0))).current;
  const zoom = useRef(new Animated.Value(1)).current;
  const idxRef = useRef(0);

  useEffect(() => {
    fades[0].setValue(1);
    const id = setInterval(() => {
      const prev = idxRef.current;
      const next = (prev + 1) % heroImages.length;
      idxRef.current = next;
      if (next === 0) {
        setHeroImages(pickRandom(homepagePhotos, HERO_COUNT));
      }
      Animated.timing(fades[prev], { toValue: 0, duration: 900, useNativeDriver: true }).start();
      fades[next].setValue(0);
      Animated.timing(fades[next], { toValue: 1, duration: 1200, useNativeDriver: true }).start();
    }, 5000);
    return () => clearInterval(id);
  }, [fades, heroImages.length]);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(zoom, { toValue: 1.06, duration: 10000, useNativeDriver: true }),
        Animated.timing(zoom, { toValue: 1, duration: 10000, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [zoom]);

  const scrollRef = useRef<ScrollView>(null);
  const scrollY = useRef(new Animated.Value(0)).current;
  const onScroll = Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
    useNativeDriver: false,
  });
  const heroShift = scrollY.interpolate({ inputRange: [0, height * 0.9], outputRange: [0, 90], extrapolate: 'clamp' });
  const heroFade = scrollY.interpolate({ inputRange: [0, height * 0.55], outputRange: [1, 0.25], extrapolate: 'clamp' });

  const googleLabel = google.loading
    ? 'opening google…'
    : 'continue with google';

  const handlepickhistory = (emailraw: string) => {
    setEmailInput(emailraw);
    loginWithEmail(emailraw);
  };

  return (
    <Animated.ScrollView
      ref={scrollRef}
      onScroll={onScroll}
      scrollEventThrottle={16}
      decelerationRate="normal"
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}
      style={styles.screen}
    >
      <View style={[styles.hero, { height }]}>
        {heroImages.map((src, i) => (
          <Animated.Image
            key={i}
            source={src}
            style={[StyleSheet.absoluteFill, styles.heroImg, { opacity: fades[i], transform: [{ scale: zoom }] }]}
            resizeMode="cover"
          />
        ))}
        <LinearGradient
          colors={['rgba(6,37,14,0.55)', 'rgba(6,37,14,0.42)', 'rgba(6,37,14,0.82)']}
          style={StyleSheet.absoluteFill}
        />

        <Animated.View
          style={[
            styles.heroInner,
            {
              paddingTop: insets.top + 24,
              paddingBottom: insets.bottom + 28,
              paddingHorizontal: wide ? 64 : 24,
              transform: [{ translateY: heroShift }],
              opacity: heroFade,
            },
          ]}
        >
          <View style={styles.heroTop}>
            <Text style={[styles.wordmark, { fontSize: compact ? 44 : wide ? 92 : 64 }]}>
              ASEANfinder
            </Text>
            <Text style={[styles.tagline, { maxWidth: wide ? 720 : 380, fontSize: compact ? 13 : 17 }]}>
              YOUR SOUTHEAST ASIA TRAVEL DESK. PLAN YOUR TRIP ACROSS INDONESIA, CAMBODIA, AND
              VIETNAM WITH FLIGHTS, TRAVEL NOTES, MINIGAMES, AND AN AI GUIDE.
            </Text>
            {!auth ? (
              <Text style={styles.saveHint}>LOG IN TO SAVE PROGRESS</Text>
            ) : null}
          </View>

          <View style={styles.heroBottom}>
            {!auth ? (
              <>
                <View style={[styles.loginRow, wide && styles.loginRowWide]}>
                  <Button
                    variant="hero"
                    label={emailOpen ? 'hide email' : 'continue with email'}
                    onPress={() => setEmailOpen((o) => !o)}
                  />
                  <Button
                    variant="hero"
                    label={googleLabel}
                    onPress={() => {
                      void google.signIn();
                    }}
                    disabled={google.loading || !google.configured}
                  />
                  <Button variant="hero" label="continue as guest" onPress={loginAsGuest} />
                </View>

                {!google.configured && !google.loading ? (
                  <Text style={styles.googleHint}>
                    google sign-in is not configured. add EXPO_PUBLIC_GOOGLE_CLIENT_ID to your
                    .env to enable it.
                  </Text>
                ) : google.error ? (
                  <Text style={styles.googleErr}>{google.error}</Text>
                ) : null}

                {emailOpen ? (
                  <View style={[styles.emailPanel, { width: wide ? 560 : '100%' }]}>
                    {recentemails.length > 0 ? (
                      <View style={styles.historyBlock}>
                        <Text style={styles.historyLabel}>or pick a recent email</Text>
                        <View style={styles.historyRow}>
                          {recentemails.slice(0, 5).map((entry) => (
                            <View key={entry.email} style={styles.historyChip}>
                              <Pressable
                                onPress={() => handlepickhistory(entry.email)}
                                style={styles.historyChipBody}
                                accessibilityRole="button"
                                accessibilityLabel={`sign in as ${entry.email}`}
                              >
                                <Text style={styles.historyEmail}>{entry.email}</Text>
                                <Text style={styles.historyTime}>
                                  {formatrelative(entry.lastsignedinat, now)}
                                  {entry.opens > 1 ? ` · ${entry.opens}×` : ''}
                                </Text>
                              </Pressable>
                              <Pressable
                                onPress={() => {
                                  Alert.alert(
                                    'remove this email?',
                                    'this account will be removed from your recent emails. you can sign in again any time.',
                                    [
                                      { text: 'cancel', style: 'cancel' },
                                      {
                                        text: 'remove',
                                        style: 'destructive',
                                        onPress: () => removeemailhistoryentry(entry.email),
                                      },
                                    ],
                                    { cancelable: true }
                                  );
                                }}
                                style={styles.historyDelete}
                                hitSlop={12}
                                accessibilityRole="button"
                                accessibilityLabel={`switch accounts: remove ${entry.email}`}
                              >
                                <Text style={styles.historyDeleteX}>×</Text>
                              </Pressable>
                            </View>
                          ))}
                        </View>
                      </View>
                    ) : null}
                    <TextInput
                      value={emailInput}
                      onChangeText={setEmailInput}
                      placeholder={compact ? 'your email' : 'any email — pick one to try'}
                      placeholderTextColor={colors.muted}
                      style={styles.input}
                      autoCapitalize="none"
                      keyboardType="email-address"
                      autoCorrect={false}
                    />
                    <Button
                      label={compact ? 'enter' : 'continue with email'}
                      onPress={() => loginWithEmail(emailInput)}
                      disabled={!emailInput.includes('@') || !emailInput.split('@')[0]}
                    />
                  </View>
                ) : null}
              </>
            ) : (
              <View style={[styles.deskReady, { maxWidth: wide ? 640 : undefined }]}>
                <Text style={[styles.deskSub, { fontSize: wide ? 26 : compact ? 18 : 20 }]}>
                  your desk is ready –
                </Text>
                <Text style={[styles.deskTitle, { fontSize: wide ? 92 : compact ? 46 : 56 }]}>
                  Start Planning
                </Text>
                <Text style={[styles.deskBody, { fontSize: compact ? 13 : 15 }]}>
                  PICK THE KINDS OF PLACES YOU LOVE, SOFTEN YOUR CITY INTO A QUIET 5KM CIRCLE,
                  THEN EXPLORE A 3D EARTH OF SOUTHEAST ASIA.
                </Text>
                <Text style={styles.signedIn}>
                  {auth.mode === 'guest' ? 'signed in as guest' : `signed in as ${auth.email || auth.name}`}
                </Text>
                <Button
                  label={compact ? 'start' : 'start planning'}
                  onPress={() => router.push('/attractions')}
                  style={{ alignSelf: 'flex-start', marginTop: 6 }}
                />
                {onboarded ? (
                  <View style={styles.quickRow}>
                    <Button variant="hero" label="notes" onPress={() => router.push('/notes')} />
                    <Button variant="hero" label="ai desk" onPress={() => router.push('/chat')} />
                    <Button variant="hero" label="globe" onPress={() => router.push('/globe')} />
                    <Button variant="hero" label="log out" onPress={logout} />
                  </View>
                ) : null}
              </View>
            )}
          </View>
        </Animated.View>
      </View>

      <View style={styles.section}>
        <View style={[styles.aboutRow, wide && { flexDirection: 'row', alignItems: 'center', gap: 64 }]}>
          <Text style={[styles.sectionHeading, wide && { flex: 1 }]}>
            What is{'\n'}ASEANfinder?
          </Text>
          <View style={wide ? { flex: 1.1 } : undefined}>
            <Text style={styles.sectionBody}>
              ASEANFINDER IS AN ALL-IN-ONE TRAVEL COMPANION DESIGNED TO PROMOTE TOURISM ACROSS
              SOUTHEAST ASIA. THE PLATFORM HELPS TRAVELERS EXPLORE DESTINATIONS BASED ON THEIR
              INTERESTS, DISCOVER LOCAL CULTURE AND HIDDEN GEMS, PLAN THEIR JOURNEYS, AND EARN
              REWARDS THROUGH INTERACTIVE MINIGAMES.
            </Text>
            <Text style={[styles.sectionBody, { marginTop: 14 }]}>
              WITH AI-POWERED GUIDANCE AND ESSENTIAL TRAVEL INFORMATION, ASEANFINDER MAKES
              EXPLORING THE ASEAN REGION EASIER, SMARTER, AND MORE ENGAGING.
            </Text>
          </View>
        </View>
      </View>

      <View style={[styles.section, styles.sectionGreen]}>
        <Text style={[styles.sectionHeading, { fontSize: wide ? 58 : 34 }]}>
          Not Your Boring{'\n'}Travel Agent
        </Text>
        <Text style={[styles.sectionBody, { marginTop: 10, maxWidth: wide ? 720 : undefined }]}>
          WE PLAN CHILL AND CURATED TRIPS BASED ON EACH USER'S PREFERENCE
        </Text>
        <Button
          label="get started"
          onPress={() => {
            scrollRef.current?.scrollTo({ y: 0, animated: true });
          }}
          style={{ alignSelf: 'flex-start', marginTop: 18 }}
        />
        <View style={[styles.wordCardRow, wide && { flexDirection: 'row', gap: 20 }]}>
          <View style={styles.wordCard}>
            <Text style={styles.wordCardIcon}>🌏</Text>
            <Text style={styles.wordCardTitle}>Personalised</Text>
            <Text style={styles.wordCardBody}>trips tailored to your style — solo adventures or group getaways, we adapt every detail.</Text>
          </View>
          <View style={styles.wordCard}>
            <Text style={styles.wordCardIcon}>🗺️</Text>
            <Text style={styles.wordCardTitle}>Curated</Text>
            <Text style={styles.wordCardBody}>handpicked hidden gems, local food spots, and authentic experiences across three ASEAN nations.</Text>
          </View>
          <View style={styles.wordCard}>
            <Text style={styles.wordCardIcon}>🎮</Text>
            <Text style={styles.wordCardTitle}>Interactive</Text>
            <Text style={styles.wordCardBody}>minigames, real-time flights, and an AI travel desk that knows the region inside out.</Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionHeading, wide && styles.headingWide]}>Our Purpose & Aim</Text>
        <View style={[styles.purposeGrid, wide && { flexDirection: 'row', gap: 20 }]}>
          <View style={styles.purposeCard}>
            <Text style={styles.purposeNumber}>01</Text>
            <Text style={styles.purposeTitle}>Promote ASEAN Tourism</Text>
            <Text style={styles.purposeBody}>
              we showcase the rich cultural heritage, natural wonders, and diverse attractions across Indonesia, Cambodia, and Vietnam to a global audience.
            </Text>
          </View>
          <View style={styles.purposeCard}>
            <Text style={styles.purposeNumber}>02</Text>
            <Text style={styles.purposeTitle}>Smart Travel Planning</Text>
            <Text style={styles.purposeBody}>
              from personalised itineraries to real-time flight info and local insights, we make planning your ASEAN trip effortless and enjoyable.
            </Text>
          </View>
          <View style={styles.purposeCard}>
            <Text style={styles.purposeNumber}>03</Text>
            <Text style={styles.purposeTitle}>Reward Exploration</Text>
            <Text style={styles.purposeBody}>
              earn points by flying ASEAN airlines and playing minigames — redeem them for attraction tickets, food vouchers, and tour discounts.
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.disclaimer}>
          THIS IS A BETA SAMPLE WEBSITE, SO SOME INFORMATION MAY BE INCOMPLETE, INACCURATE, OR
          SUBJECT TO CHANGE.
        </Text>
      </View>
    </Animated.ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.forestGreen },
  scrollContent: { backgroundColor: colors.paper },
  hero: { width: '100%', backgroundColor: '#04140a' },
  heroImg: { width: '100%', height: '100%' },
  heroInner: { flex: 1, justifyContent: 'space-between' },
  heroTop: { gap: 14 },
  wordmark: {
    fontFamily: 'Fraunces_600SemiBold',
    color: colors.pureWhite,
    letterSpacing: -1,
    textShadowColor: 'rgba(0,0,0,0.35)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  tagline: {
    fontFamily: 'DMSans_500Medium',
    color: colors.pureWhite,
    letterSpacing: 1.6,
    lineHeight: 24,
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  saveHint: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 12,
    letterSpacing: 2,
    color: 'rgba(255,255,255,0.85)',
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  heroBottom: { gap: 12 },
  loginRow: { gap: 12 },
  loginRowWide: { flexDirection: 'row', gap: 16 },
  emailPanel: {
    backgroundColor: colors.paper,
    borderRadius: 18,
    padding: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  historyBlock: { gap: 6 },
  historyLabel: {
    color: colors.muted,
    fontSize: 12,
    fontFamily: 'DMSans_400Regular',
  },
  historyRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  historyChip: {
    flexDirection: 'row',
    borderRadius: 999,
    backgroundColor: colors.mist,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    overflow: 'hidden',
  },
  historyChipBody: {
    paddingVertical: 8,
    paddingLeft: 12,
    paddingRight: 8,
    alignItems: 'flex-start',
    alignSelf: 'center',
  },
  historyDelete: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderLeftColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyDeleteX: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 16,
    lineHeight: 16,
    color: colors.muted,
  },
  historyEmail: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 12,
    color: colors.forestGreen,
  },
  historyTime: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 10,
    color: colors.muted,
    marginTop: 2,
  },
  input: {
    backgroundColor: colors.pureWhite,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontFamily: 'DMSans_400Regular',
    fontSize: 15,
    color: colors.ink,
  },
  googleHint: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
  },
  googleErr: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 12,
    color: '#ffd9d9',
    textAlign: 'center',
  },
  deskReady: { gap: 10 },
  deskSub: {
    fontFamily: 'Fraunces_600SemiBold',
    color: colors.pureWhite,
    textShadowColor: 'rgba(0,0,0,0.35)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  deskTitle: {
    fontFamily: 'Fraunces_600SemiBold',
    color: colors.pureWhite,
    letterSpacing: -1,
    textShadowColor: 'rgba(0,0,0,0.35)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 10,
  },
  deskBody: {
    fontFamily: 'DMSans_500Medium',
    color: colors.pureWhite,
    letterSpacing: 1.4,
    lineHeight: 22,
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  signedIn: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    color: 'rgba(255,255,255,0.85)',
  },
  quickRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 10 },
  section: { paddingHorizontal: 24, paddingVertical: 48, backgroundColor: colors.paper },
  sectionGreen: { backgroundColor: '#E9F2EA' },
  aboutRow: { gap: 18 },
  sectionHeading: {
    fontFamily: 'Fraunces_600SemiBold',
    fontSize: 40,
    lineHeight: 46,
    color: colors.forestGreen,
    letterSpacing: -0.6,
  },
  sectionBody: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
    lineHeight: 23,
    letterSpacing: 0.6,
    color: colors.midnightNavy,
  },
  headingWide: { fontSize: 52, maxWidth: 560 },
  wordCardRow: { gap: 16, marginTop: 26 },
  wordCard: {
    flex: 1,
    backgroundColor: colors.paper,
    borderRadius: 20,
    padding: 22,
    borderWidth: 1,
    borderColor: colors.line,
    gap: 10,
  },
  wordCardIcon: { fontSize: 32 },
  wordCardTitle: {
    fontFamily: 'Fraunces_600SemiBold',
    fontSize: 20,
    color: colors.forestGreen,
  },
  wordCardBody: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    lineHeight: 20,
    color: colors.midnightNavy,
  },
  purposeGrid: { gap: 16, marginTop: 26 },
  purposeCard: {
    flex: 1,
    backgroundColor: colors.paper,
    borderRadius: 20,
    padding: 22,
    borderWidth: 1,
    borderColor: colors.line,
    gap: 8,
  },
  purposeNumber: {
    fontFamily: 'Fraunces_600SemiBold',
    fontSize: 40,
    color: colors.forestGreen,
    opacity: 0.25,
  },
  purposeTitle: {
    fontFamily: 'Fraunces_600SemiBold',
    fontSize: 18,
    color: colors.deepNavy,
  },
  purposeBody: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    lineHeight: 20,
    color: colors.midnightNavy,
  },
  footer: { paddingVertical: 28, paddingHorizontal: 24, backgroundColor: colors.paper },
  disclaimer: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 12,
    textAlign: 'center',
    color: colors.muted,
    lineHeight: 18,
  },
});
