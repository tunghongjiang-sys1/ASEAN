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
              ASEANFINDER IS AN ALL-IN-ONE TRAVEL COMPANION DESIGNED TO PROMOTE TOURISM ACROSS
              SOUTHEAST ASIA. THE PLATFORM HELPS TRAVELERS EXPLORE DESTINATIONS BASED ON THEIR
              INTERESTS, DISCOVER LOCAL CULTURE AND HIDDEN GEMS, PLAN THEIR JOURNEYS, AND EARN
              REWARDS THROUGH INTERACTIVE MINIGAMES.
            </Text>
            <Text style={[styles.bodyText, { marginTop: 16 }]}>
              WITH AI-POWERED GUIDANCE AND ESSENTIAL TRAVEL INFORMATION, ASEANFINDER MAKES
              EXPLORING THE ASEAN REGION EASIER, SMARTER, AND MORE ENGAGING.
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
