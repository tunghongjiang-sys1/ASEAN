import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Logo } from '../src/components/logo';
import { Button } from '../src/components/ui/button';
import { Body, Title } from '../src/components/ui/text';
import { colors } from '../src/constants/colors';
import { useApp } from '../src/context/app-context';

export default function WelcomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const compact = width < 420;
  const wide = width >= 900;
  const { auth, loginAsGuest, loginWithGoogle, onboarded } = useApp();

  const title = !auth
    ? compact
      ? 'sign in to begin'
      : 'sign in to plan southeast asia'
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
              signed in as {auth.mode === 'google' ? auth.email || auth.name : 'guest'}
            </Body>
          )}
        </View>

        <View style={styles.actions}>
          {!auth ? (
            <>
              <Button label={compact ? 'google' : 'continue with google'} onPress={loginWithGoogle} />
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
                onPress={() => router.push('/attractionsions')}
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
  actions: { marginTop: 24 },
});
