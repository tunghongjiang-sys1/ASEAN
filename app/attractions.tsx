import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { Redirect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { categories } from '../data';
import { CategoryChip } from '../src/components/category-chip';
import { Logo } from '../src/components/logo';
import { BackButton } from '../src/components/ui/back-button';
import { Button } from '../src/components/ui/button';
import { Body, Title } from '../src/components/ui/text';
import { colors } from '../src/constants/colors';
import { useApp } from '../src/context/app-context';

export default function AttractionsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const compact = width < 420;
  const { auth, preferences, setPreferences } = useApp();
  const [selected, setSelected] = useState<string[]>(preferences);
  const list = useMemo(() => (categories as string[]).slice().sort(), []);

  if (!auth) return <Redirect href="/welcome" />;

  const toggle = (c: string) => {
    setSelected((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 12 }]}>
      <View style={styles.header}>
        <BackButton />
        <Logo size={40} showWordmark={false} />
      </View>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Title style={{ fontSize: compact ? 24 : 28 }}>
          {compact ? 'what do you love?' : 'what draws you out?'}
        </Title>
        <Body style={styles.sub}>
          {compact
            ? 'pick types — markers glow to match.'
            : 'choose attraction types. markers on the globe will glow in matching colours.'}
        </Body>
        <View style={styles.chips}>
          {list.map((c) => (
            <CategoryChip
              key={c}
              label={c}
              selected={selected.includes(c)}
              onPress={() => toggle(c)}
            />
          ))}
        </View>
      </ScrollView>
      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <Button
          label={selected.length ? `continue · ${selected.length} selected` : 'continue with all'}
          onPress={() => {
            setPreferences(selected);
            router.push('/location');
          }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.mist },
  header: {
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  content: { padding: 20, paddingBottom: 40, gap: 12 },
  sub: { color: colors.midnightNavy, marginBottom: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  footer: { paddingHorizontal: 20, paddingTop: 8 },
});
