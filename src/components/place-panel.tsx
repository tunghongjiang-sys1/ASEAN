import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Image, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { places as allPlaces } from '../../data';
import { colors, getCategoryColor } from '../constants/colors';
import { useApp } from '../context/app-context';
import type { Place } from '../types/place';
import { getFlightsTo, formatFlightDate, formatFlightTime } from '../services/flights';
import type { FlightInfo } from '../types/place';
import { findMinigameForPlace } from '../utils/minigame';
import {
  expandPlace,
  getFlightSearchLinks,
  getPlaceLinks,
  parseTransports,
} from '../utils/place-details';
import { Button } from './ui/button';

type Props = {
  place: Place;
  onClose: () => void;
};

export function PlacePanel({ place, onClose }: Props) {
  const router = useRouter();
  const { addNote, removeNote, hasNote } = useApp();
  const [flights, setFlights] = useState<FlightInfo[]>([]);
  const [loadingFlights, setLoadingFlights] = useState(true);
  const saved = hasNote(place.id);

  const detailed = useMemo(
    () => expandPlace(place, allPlaces as Place[]),
    [place]
  );
  const game = findMinigameForPlace(detailed);
  const accent = getCategoryColor(detailed.category);
  const transports = useMemo(
    () => parseTransports(detailed.howToGetThere),
    [detailed.howToGetThere]
  );
  const infoLinks = useMemo(() => getPlaceLinks(detailed), [detailed]);
  const flightLinks = useMemo(
    () => getFlightSearchLinks(detailed.airport),
    [detailed.airport]
  );

  useEffect(() => {
    let alive = true;
    setLoadingFlights(true);
    getFlightsTo(detailed.airport).then((list) => {
      if (!alive) return;
      setFlights(list);
      setLoadingFlights(false);
    });
    return () => {
      alive = false;
    };
  }, [detailed.airport]);

  return (
    <View style={styles.panel}>
      <View style={[styles.accent, { backgroundColor: accent }]} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.topRow}>
          <Pressable onPress={onClose} style={styles.closeBtn}>
            <Text style={styles.closeText}>close</Text>
          </Pressable>
          <Pressable
            onPress={() => (saved ? removeNote(place.id) : addNote(place.id))}
            style={[styles.plus, saved && styles.plusOn]}
          >
            <Text style={[styles.plusText, saved && styles.plusTextOn]}>{saved ? '✓' : '+'}</Text>
          </Pressable>
        </View>

        <Image source={{ uri: detailed.image }} style={styles.image} />
        <Text style={styles.country}>{detailed.country.toLowerCase()}</Text>
        <Text style={styles.title}>{detailed.location}</Text>
        <Text style={styles.category}>{detailed.category.toLowerCase()}</Text>
        <Text style={styles.body}>{detailed.primaryActivities}</Text>

        <Text style={styles.section}>getting there — all transports</Text>
        {transports.map((leg, i) => (
          <View key={`${leg.mode}-${i}`} style={styles.transport}>
            <Text style={styles.transportMode}>{leg.label}</Text>
            <Text style={styles.body}>{leg.detail}</Text>
          </View>
        ))}

        <Section title="visa & entry" text={detailed.visaEntry} />
        <Section title="culture & etiquette" text={detailed.cultureEtiquette} />
        <Section title="dress code" text={detailed.dressCode} />
        <Section title="payment" text={detailed.paymentMethods} />
        <Section title="access" text={detailed.accessNeeded} />
        <Section title="navigation" text={detailed.navigationTips} />

        {detailed.funFacts?.length ? (
          <View style={{ marginTop: 14 }}>
            <Text style={styles.section}>fun facts</Text>
            {detailed.funFacts.map((f) => (
              <Text key={f} style={[styles.body, { marginBottom: 6 }]}>
                • {f}
              </Text>
            ))}
          </View>
        ) : null}

        <Text style={styles.section}>nearby amenities</Text>
        <View style={styles.tags}>
          {detailed.amenities.map((a) => (
            <View key={a} style={styles.tag}>
              <Text style={styles.tagText}>{a}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.section}>learn more</Text>
        <View style={styles.links}>
          {infoLinks.map((link) => (
            <Pressable key={link.url} onPress={() => Linking.openURL(link.url)} style={styles.linkChip}>
              <Text style={styles.linkChipText}>{link.label}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.section}>flights from singapore ({detailed.airport})</Text>
        <View style={styles.links}>
          {flightLinks.map((link) => (
            <Pressable key={link.url} onPress={() => Linking.openURL(link.url)} style={styles.linkChipFlight}>
              <Text style={styles.linkChipFlightText}>{link.label}</Text>
            </Pressable>
          ))}
        </View>
        {loadingFlights ? (
          <ActivityIndicator color={colors.deepNavy} />
        ) : (
          flights.map((f) => (
            <Pressable
              key={f.flightNumber + f.departure}
              style={styles.flight}
              onPress={() => Linking.openURL(flightLinks[0].url)}
            >
              <View style={styles.flightTop}>
                <Text style={styles.flightNo}>{f.flightNumber}</Text>
                <Text style={styles.flightStatus}>{f.status}</Text>
              </View>
              <Text style={styles.flightMeta}>
                {f.airline} · {formatFlightDate(f.departure)} · {formatFlightTime(f.departure)} →{' '}
                {formatFlightTime(f.arrival)}
                {f.terminal ? ` · ${f.terminal}` : ''}
              </Text>
              <Text style={styles.flightLink}>open flight search →</Text>
            </Pressable>
          ))
        )}

        {game ? (
          <View style={styles.gameBox}>
            <Text style={styles.section}>minigame</Text>
            <Text style={styles.gameTitle}>{game.title}</Text>
            <Text style={styles.body}>{game.description}</Text>
            {game.rules ? (
              <Text style={styles.rules}>rules: {game.rules}</Text>
            ) : null}
            <Button
              label="play minigame"
              variant="asean"
              onPress={() => router.push(`/minigame/${game.id}?placeId=${place.id}`)}
              style={{ marginTop: 12 }}
            />
          </View>
        ) : null}

        <Button
          label="ask ai about this place"
          variant="secondary"
          onPress={() =>
            router.push({
              pathname: '/chat',
              params: { seed: `tell me how to plan a visit to ${detailed.location}` },
            })
          }
          style={{ marginTop: 8, marginBottom: 24 }}
        />
      </ScrollView>
    </View>
  );
}

function Section({ title, text }: { title: string; text: string }) {
  return (
    <View style={{ marginTop: 14 }}>
      <Text style={styles.section}>{title}</Text>
      <Text style={styles.body}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    flex: 1,
    backgroundColor: colors.pureWhite,
    borderTopLeftRadius: 24,
    borderBottomLeftRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.line,
  },
  accent: { height: 4, width: '100%' },
  content: { padding: 18, paddingBottom: 40 },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  closeBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: colors.subtleBlue,
  },
  closeText: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 13,
    color: colors.deepNavy,
  },
  plus: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.warmCream,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  plusOn: { backgroundColor: colors.deepNavy, borderColor: colors.deepNavy },
  plusText: {
    fontSize: 22,
    color: colors.deepNavy,
    lineHeight: 24,
    fontFamily: 'DMSans_500Medium',
  },
  plusTextOn: { color: colors.aseanYellow },
  image: {
    width: '100%',
    height: 160,
    borderRadius: 16,
    backgroundColor: colors.silentBlue,
  },
  country: {
    marginTop: 14,
    fontFamily: 'DMSans_500Medium',
    fontSize: 12,
    color: colors.aseanBlue,
    letterSpacing: 0.4,
  },
  title: {
    fontFamily: 'Fraunces_600SemiBold',
    fontSize: 24,
    color: colors.deepNavy,
    marginTop: 2,
  },
  category: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    color: colors.muted,
    marginTop: 4,
    marginBottom: 8,
  },
  body: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
    lineHeight: 21,
    color: colors.ink,
  },
  section: {
    marginTop: 4,
    marginBottom: 6,
    fontFamily: 'DMSans_500Medium',
    fontSize: 12,
    color: colors.midnightNavy,
    letterSpacing: 0.4,
  },
  transport: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  transportMode: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 12,
    color: colors.aseanBlue,
    marginBottom: 4,
    textTransform: 'lowercase',
  },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  tag: {
    backgroundColor: colors.warmCream,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  tagText: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 12,
    color: colors.ink,
  },
  links: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  linkChip: {
    backgroundColor: colors.subtleBlue,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  linkChipText: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 12,
    color: colors.deepNavy,
  },
  linkChipFlight: {
    backgroundColor: colors.aseanBlue,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  linkChipFlightText: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 12,
    color: colors.pureWhite,
  },
  flight: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  flightTop: { flexDirection: 'row', justifyContent: 'space-between' },
  flightNo: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 14,
    color: colors.deepNavy,
  },
  flightStatus: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 12,
    color: colors.success,
  },
  flightMeta: {
    marginTop: 4,
    fontFamily: 'DMSans_400Regular',
    fontSize: 12,
    color: colors.muted,
  },
  flightLink: {
    marginTop: 4,
    fontFamily: 'DMSans_500Medium',
    fontSize: 12,
    color: colors.aseanBlue,
  },
  gameBox: {
    marginTop: 16,
    padding: 14,
    borderRadius: 16,
    backgroundColor: colors.mist,
    borderWidth: 1,
    borderColor: colors.line,
  },
  gameTitle: {
    fontFamily: 'Fraunces_600SemiBold',
    fontSize: 18,
    color: colors.deepNavy,
    marginBottom: 6,
  },
  rules: {
    marginTop: 8,
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    lineHeight: 19,
    color: colors.midnightNavy,
  },
});
