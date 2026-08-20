import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Redirect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BackButton } from '../src/components/ui/back-button';
import { Button } from '../src/components/ui/button';
import { colors } from '../src/constants/colors';
import { useApp } from '../src/context/app-context';

export default function InfoScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const compact = width < 420;
  const wide = width >= 900;
  const { auth, logout } = useApp();

  if (!auth) return <Redirect href="/welcome" />;

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 16 }]}>
      <View style={styles.header}>
        <BackButton />
      </View>
      <View style={[styles.body, { maxWidth: wide ? 980 : undefined, width: '100%', alignSelf: wide ? 'center' : undefined }]}>
        <View style={[styles.aboutRow, wide && { flexDirection: 'row', alignItems: 'center', gap: 64 }]}>
          <Text style={[styles.title, { fontSize: compact ? 36 : wide ? 64 : 48 }, wide && { flex: 1 }]}>
            What is{'\n'}ASEANfinder?
          </Text>
          <View style={wide ? { flex: 1.2 } : undefined}>
            <Text style={styles.bodyText}>
              ASEANfinder Is An All-In-One Travel Companion Designed To Promote Tourism Across
              Southeast Asia. The Platform Helps Travelers Explore Destinations Based On Their
              Interests, Discover Local Culture And Hidden Gems, Plan Their Journeys, And Earn
              Rewards Through Interactive Minigames.
            </Text>
            <Text style={[styles.bodyText, { marginTop: 16 }]}>
              With AI-Powered Guidance And Essential Travel Information, ASEANfinder Makes
              Exploring The ASEAN Region Easier, Smarter, And More Engaging.
            </Text>
          </View>
        </View>

        <View style={[styles.actions, wide && { flexDirection: 'row', gap: 12, marginTop: 48 }]}>
          <Button label="back to globe" onPress={() => router.replace('/globe')} />
          <Button
            variant="secondary"
            label="log out"
            onPress={() => {
              logout();
              router.replace('/welcome');
            }}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper, paddingHorizontal: 20 },
  header: { marginBottom: 18 },
  body: { flex: 1 },
  aboutRow: { gap: 20 },
  title: {
    fontFamily: 'Fraunces_600SemiBold',
    color: colors.forestGreen,
    letterSpacing: -0.6,
    lineHeight: 1.1,
  },
  bodyText: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
    lineHeight: 24,
    letterSpacing: 0.6,
    color: colors.midnightNavy,
  },
  actions: { marginTop: 32, gap: 12 },
});
