import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import * as Location from 'expo-location';
import { Redirect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BackButton } from '../src/components/ui/back-button';
import { Button } from '../src/components/ui/button';
import { Body, Title } from '../src/components/ui/text';
import { colors } from '../src/constants/colors';
import { useApp } from '../src/context/app-context';
import { searchLocalCities, searchWorldCities, type WorldCity } from '../src/data/world-cities';

function soften(lat: number, lng: number) {
  const jitter = 0.02;
  return {
    lat: lat + (Math.random() - 0.5) * jitter,
    lng: lng + (Math.random() - 0.5) * jitter,
  };
}

export default function LocationScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const compact = width < 420;
  const { auth, setUserLocation, setOnboarded } = useApp();
  const [label, setLabel] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [suggestions, setSuggestions] = useState<WorldCity[]>([]);
  const [searching, setSearching] = useState(false);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current);
    const q = label.trim();
    if (q.length < 2) {
      setSuggestions([]);
      setSearching(false);
      return;
    }
    setSuggestions(searchLocalCities(q, 8));
    setSearching(true);
    debounce.current = setTimeout(() => {
      searchWorldCities(q, 8).then((list) => {
        setSuggestions(list);
        setSearching(false);
      });
    }, 280);
    return () => {
      if (debounce.current) clearTimeout(debounce.current);
    };
  }, [label]);

  if (!auth) return <Redirect href="/welcome" />;

  const finish = (lat: number, lng: number, name: string) => {
    const soft = soften(lat, lng);
    setUserLocation({ ...soft, label: name });
    setOnboarded(true);
    router.replace('/globe');
  };

  const useDevice = async () => {
    setLoading(true);
    setError('');
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setError(
          compact
            ? 'permission denied — type a city below.'
            : 'permission denied — you can still pick a city name below.'
        );
        setLoading(false);
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      finish(pos.coords.latitude, pos.coords.longitude, compact ? 'near you' : 'near you · 5km soft circle');
    } catch {
      setError(compact ? 'could not read location.' : 'could not read location. try a city name instead.');
    } finally {
      setLoading(false);
    }
  };

  const pickCity = (city: WorldCity) => {
    const display = `${city.name}, ${city.country}`;
    setLabel(display);
    setSuggestions([]);
    finish(city.lat, city.lng, compact ? display : `${display} · 5km soft circle`);
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 16 }]}>
      <View style={styles.header}>
        <BackButton />
      </View>
      <View style={styles.body}>
        <Title style={{ fontSize: compact ? 24 : 28 }}>
          {compact ? 'starting city?' : 'where are you starting?'}
        </Title>
        <Body style={styles.sub}>
          {compact
            ? 'we keep a soft 5km circle — never your exact pin.'
            : 'we keep a soft 5km circle — never your exact pin — so recommendations stay personal without being precise.'}
        </Body>

        <Button
          label={compact ? 'use my location' : 'use soft device location'}
          onPress={useDevice}
          disabled={loading}
        />
        {loading ? <ActivityIndicator color={colors.deepNavy} style={{ marginTop: 12 }} /> : null}

        <Body style={styles.or}>{compact ? 'or type a city' : 'or type a city anywhere in the world'}</Body>
        <TextInput
          value={label}
          onChangeText={setLabel}
          placeholder={compact ? 'new york, bali…' : 'type a city — e.g. new, bali, paris…'}
          placeholderTextColor={colors.muted}
          autoCapitalize="none"
          autoCorrect={false}
          style={styles.input}
        />

        {suggestions.length > 0 || searching ? (
          <View style={styles.suggestBox}>
            {searching ? (
              <Text style={styles.suggestHint}>searching cities…</Text>
            ) : (
              <FlatList
                keyboardShouldPersistTaps="handled"
                data={suggestions}
                keyExtractor={(item, i) => `${item.name}-${item.country}-${i}`}
                renderItem={({ item }) => (
                  <Pressable onPress={() => pickCity(item)} style={styles.suggestRow}>
                    <Text style={styles.suggestName}>{item.name}</Text>
                    <Text style={styles.suggestCountry}>{item.country}</Text>
                  </Pressable>
                )}
              />
            )}
          </View>
        ) : null}

        {error ? <Body style={styles.error}>{error}</Body> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.mist, paddingHorizontal: 20 },
  header: { marginBottom: 18 },
  body: { flex: 1, gap: 10 },
  sub: { color: colors.midnightNavy, marginBottom: 12 },
  or: { marginTop: 22, marginBottom: 6, color: colors.muted },
  input: {
    backgroundColor: colors.pureWhite,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontFamily: 'DMSans_400Regular',
    fontSize: 15,
    color: colors.ink,
  },
  suggestBox: {
    maxHeight: 240,
    backgroundColor: colors.pureWhite,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 14,
    overflow: 'hidden',
  },
  suggestHint: {
    padding: 14,
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    color: colors.muted,
  },
  suggestRow: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  suggestName: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 15,
    color: colors.deepNavy,
  },
  suggestCountry: {
    marginTop: 2,
    fontFamily: 'DMSans_400Regular',
    fontSize: 12,
    color: colors.muted,
  },
  error: { marginTop: 12, color: colors.aseanRed },
});
