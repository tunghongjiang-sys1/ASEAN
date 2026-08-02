import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import * as Location from 'expo-location';
import { Redirect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BackButton } from '../src/components/ui/back-button';
import { Button } from '../src/components/ui/button';
import { colors } from '../src/constants/colors';
import { useApp } from '../src/context/app-context';
import { searchLocalCities, searchWorldCities, type WorldCity } from '../src/data/world-cities';
import { cleanCityLabel, getAirportCodeForCity } from '../src/utils/place-details';

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
  const wide = width >= 900;
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

  const finish = (lat: number, lng: number, name: string, country?: string, city?: string) => {
    const soft = soften(lat, lng);
    const cleanCity = cleanCityLabel(city || name);
    const airport = getAirportCodeForCity(cleanCity) || undefined;
    setUserLocation({ ...soft, label: name, country, city: cleanCity || undefined, airport });
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
      // try to reverse-geocode a city name so flights start from the real airport
      let cityName: string | undefined;
      let countryName: string | undefined;
      try {
        const r = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${pos.coords.latitude}&lon=${pos.coords.longitude}`,
          { headers: { Accept: 'application/json', 'User-Agent': 'asean-travel-app/1.0' } }
        );
        if (r.ok) {
          const g = await r.json();
          const ad = g?.address || {};
          cityName = ad?.city || ad?.town || ad?.village || ad?.municipality || undefined;
          countryName = ad?.country || undefined;
        }
      } catch {}
      finish(
        pos.coords.latitude,
        pos.coords.longitude,
        compact ? 'near you' : 'near you · 5km soft circle',
        countryName,
        cityName
      );
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
    finish(city.lat, city.lng, compact ? display : `${display} · 5km soft circle`, city.country, city.name);
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 16 }]}>
      <View style={styles.header}>
        <BackButton />
      </View>
      <View style={[styles.body, { maxWidth: wide ? 760 : undefined, width: '100%', alignSelf: wide ? 'center' : undefined }]}>
        <Text style={[styles.title, { fontSize: compact ? 32 : wide ? 56 : 44 }]}>
          Where are you starting?
        </Text>
        <Text style={styles.sub}>
          WE KEEP A SOFT 5KM CIRCLE — NEVER YOUR EXACT PIN — SO RECOMMENDATIONS STAY PERSONAL
          WITHOUT BEING PRECISE.
        </Text>

        <Button
          label={compact ? 'use soft device location' : 'use soft device location'}
          onPress={useDevice}
          disabled={loading}
        />
        {loading ? <ActivityIndicator color={colors.forestGreen} style={{ marginTop: 12 }} /> : null}

        <Text style={styles.or}>OR TYPE ANY CITY ANYWHERE IN THE WORLD</Text>
        <TextInput
          value={label}
          onChangeText={setLabel}
          placeholder={compact ? 'new york, bali…' : 'type a city — e.g. new, bali, paris'}
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

        {error ? <Text style={styles.error}>{error}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper, paddingHorizontal: 20 },
  header: { marginBottom: 18 },
  body: { flex: 1, gap: 12 },
  title: {
    fontFamily: 'Fraunces_600SemiBold',
    color: colors.forestGreen,
    letterSpacing: -0.6,
  },
  sub: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 13,
    letterSpacing: 1.4,
    lineHeight: 20,
    color: colors.forestGreen,
    marginBottom: 10,
  },
  or: { marginTop: 24, marginBottom: 4, fontFamily: 'DMSans_500Medium', fontSize: 12, letterSpacing: 1.4, color: colors.forestGreen },
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
    color: colors.forestGreen,
  },
  suggestCountry: {
    marginTop: 2,
    fontFamily: 'DMSans_400Regular',
    fontSize: 12,
    color: colors.muted,
  },
  error: { marginTop: 12, color: colors.aseanRed },
});
