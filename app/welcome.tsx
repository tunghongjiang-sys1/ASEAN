import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Logo } from '../src/components/logo';
import { Button } from '../src/components/ui/button';
import { Body, Title } from '../src/components/ui/text';
import { colors } from '../src/constants/colors';
import { useApp } from '../src/context/app-context';
import { useGoogleAuth } from '../src/services/use-google-auth';

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
  const { width } = useWindowDimensions();
  const compact = width < 420;
  const wide = width >= 900;
  const { auth, loginAsGuest, loginWithGoogle, loginWithEmail, logout, onboarded, emailHistory, removeemailhistoryentry } = useApp();
  const [emailInput, setEmailInput] = useState('');

  const handlepickhistory = (emailraw: string) => {
    setEmailInput(emailraw);
    loginWithEmail(emailraw);
  };

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

  const title = !auth
    ? compact
      ? 'sign in to begin'
      : 'sign in to start planning your southeast asia trip'
    : compact
      ? 'ready to plan?'
      : 'your desk is ready — start planning';

  const body = !auth
    ? compact
      ? 'google or guest. progress saves when you sign in.'
      : 'choose google or continue as guest. a quiet desk for indonesia, cambodia, and vietnam — flights, notes, minigames, and an ai guide.'
    : compact
      ? 'pick places you love, then open the globe.'
      : 'pick the kinds of places you love, soften your city into a quiet 5km circle, then explore a 3d earth of southeast asia.';

  const googleLabel = google.loading
    ? compact
      ? 'opening…'
      : 'opening google…'
    : compact
      ? 'google'
      : 'continue with google';

  return (
    <LinearGradient colors={[colors.mist, colors.subtleBlue, colors.warmCream]} style={styles.flex}>
      <View
        style={[
          styles.wrap,
          {
            paddingTop: insets.top + (compact ? 20 : 28),
            paddingBottom: insets.bottom + 24,
            paddingHorizontal: wide ? 48 : 24,
            maxWidth: wide ? 720 : undefined,
            alignSelf: wide ? 'center' : undefined,
            width: '100%',
          },
        ]}
      >
        <Logo size={compact ? 52 : 64} />
        <View style={[styles.hero, { marginTop: compact ? 28 : 48 }]}>
          <Title style={[styles.title, { fontSize: compact ? 26 : wide ? 38 : 34, lineHeight: compact ? 32 : 40 }]}>
            {title}
          </Title>
          <Body style={[styles.body, { maxWidth: wide ? 480 : 340 }]}>{body}</Body>
          {!auth ? (
            <Body style={styles.saveHint}>login to save progress</Body>
          ) : (
            <Body style={styles.signedIn}>
              {auth.mode === 'guest' ? 'signed in as guest' : `signed in as ${auth.email || auth.name}`}
            </Body>
          )}
          {google.error ? (
            <Body style={styles.errHint}>{google.error}</Body>
          ) : !auth && !google.configured ? (
            <Body style={styles.hint}>
              google sign-in is not configured. add EXPO_PUBLIC_GOOGLE_CLIENT_ID to your .env to enable it.
            </Body>
          ) : null}
        </View>

        <View style={styles.actions}>
          {!auth ? (
            <>
              {emailHistory.length > 0 ? (
                <View style={styles.historyBlock}>
                  <Body style={styles.historyLabel}>or pick a recent email</Body>
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
              <Button
                label={googleLabel}
                
                
                
                onPress={() => {
                  void google.signIn();
                }}
                disabled={google.loading || !google.configured}
              />
              <Button
                label={compact ? 'guest' : 'continue as guest'}
                variant="secondary"
                onPress={loginAsGuest}
                style={{ marginTop: 10 }}
              />
            </>
          ) : (
            <>
              <Button
                label={compact ? 'start' : 'start planning'}
                onPress={() => router.push('/attractions')}
              />
              {onboarded ? (
                <>
                  <Button
                    label={compact ? 'notes' : 'open notes'}
                    variant="ghost"
                    onPress={() => router.push('/notes')}
                    style={{ marginTop: 10 }}
                  />
                  <Button
                    label={compact ? 'ai' : 'ai travel desk'}
                    variant="ghost"
                    onPress={() => router.push('/chat')}
                    style={{ marginTop: 10 }}
                  />
                  <Button
                    label={compact ? 'globe' : 'back to globe'}
                    variant="asean"
                    onPress={() => router.push('/globe')}
                    style={{ marginTop: 10 }}
                  />
                  <Button
                    label={compact ? 'logout' : 'log out'}
                    variant="ghost"
                    onPress={logout}
                    style={{ marginTop: 10 }}
                  />
                </>
              ) : null}
            </>
          )}
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  wrap: {
    flex: 1,
    justifyContent: 'space-between',
  },
  hero: { gap: 14 },
  title: { maxWidth: 420 },
  body: { color: colors.midnightNavy },
  saveHint: {
    marginTop: 4,
    color: colors.aseanBlue,
    fontFamily: 'DMSans_500Medium',
    fontSize: 13,
  },
  signedIn: {
    marginTop: 4,
    color: colors.muted,
    fontSize: 13,
  },
  errHint: {
    marginTop: 6,
    color: '#a83232',
    fontFamily: 'DMSans_500Medium',
    fontSize: 12,
  },
  hint: {
    marginTop: 4,
    color: colors.muted,
    fontSize: 12,
  },
  actions: { marginTop: 24 },
  input: {
    backgroundColor: colors.pureWhite,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 8,
    fontFamily: 'DMSans_400Regular',
    fontSize: 15,
    color: colors.ink,
  },
  historyBlock: { gap: 6, marginBottom: 4 },
  historyLabel: { color: colors.muted, fontSize: 12 },
  historyRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  historyChip: {
    flexDirection: 'row',
    borderRadius: 999,
    backgroundColor: colors.subtleBlue,
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
  historyEmail: { fontFamily: 'DMSans_500Medium', fontSize: 12, color: colors.deepNavy },
  historyTime: { fontFamily: 'DMSans_400Regular', fontSize: 10, color: colors.muted, marginTop: 2 },
});
