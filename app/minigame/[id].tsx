import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getPlaceById } from '../../data';
import { MinigameBoard } from '../../src/components/minigames/minigame-board';
import { BackButton } from '../../src/components/ui/back-button';
import { Button } from '../../src/components/ui/button';
import { colors } from '../../src/constants/colors';
import { getMinigameById, findMinigameForPlace } from '../../src/utils/minigame';
import type { Place } from '../../src/types/place';

export default function MinigameScreen() {
  const { id, placeId } = useLocalSearchParams<{ id: string; placeId?: string }>();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [finished, setFinished] = useState<number | null>(null);

  const place = placeId ? (getPlaceById(placeId) as Place | undefined) : undefined;

  const game = useMemo(() => {
    const n = Number(id);
    const found = getMinigameById(n, place || null);
    if (found) return found;
    if (place) return findMinigameForPlace(place);
    return null;
  }, [id, place]);

  if (!game) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top + 12 }]}>
        <BackButton />
        <Text style={styles.missing}>minigame not found</Text>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 16 }]}>
      <View style={styles.header}>
        <BackButton />
      </View>
      <View style={styles.body}>
        {finished === null ? (
          <MinigameBoard game={game} onDone={(score: number) => setFinished(score)} />
        ) : (
          <View style={styles.done}>
            <Text style={styles.doneTitle}>nicely done</Text>
            <Text style={styles.doneScore}>score {finished}</Text>
            <Text style={styles.doneFacts}>{game.facts.join('\n\n')}</Text>
            <Button label="back to place" onPress={() => router.back()} style={{ marginTop: 18 }} />
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.mist, paddingHorizontal: 20 },
  header: { marginBottom: 12 },
  body: { flex: 1 },
  missing: {
    marginTop: 24,
    fontFamily: 'DMSans_400Regular',
    color: colors.muted,
  },
  done: { flex: 1, justifyContent: 'center' },
  doneTitle: {
    fontFamily: 'Fraunces_600SemiBold',
    fontSize: 30,
    color: colors.deepNavy,
  },
  doneScore: {
    marginTop: 8,
    fontFamily: 'DMSans_500Medium',
    fontSize: 16,
    color: colors.aseanBlue,
  },
  doneFacts: {
    marginTop: 18,
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
    lineHeight: 22,
    color: colors.ink,
  },
});
