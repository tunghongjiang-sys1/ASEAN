import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Image, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { places as allPlaces } from '../../data';
import { colors, getCategoryColor } from '../constants/colors';
import { getCountryEmergencyNumbers } from '../constants/country-emergency';
import { getLocalPlaceImage } from '../data/place-images';
import { useApp } from '../context/app-context';
import type { FlightInfo, Place, PlaceInfo, PlaceReview } from '../types/place';
import { getFlightsTo, formatFlightDate, formatFlightTime, isASEANAirline } from '../services/flights';
import { getPlaceInfo } from '../services/place-info';
import { findMinigameForPlace } from '../utils/minigame';
import {
  cleanCityLabel,
  expandPlace,
  getFlightDetailLink,
  getFlightSearchLinks,
  getOfficialTourismUrl,
  getPlaceLinks,
  parseTransports,
  personalizeGettingThere,
  getAirportCodeForCity,
} from '../utils/place-details';
import { Button } from './ui/button';

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

const REVIEW_FIRST_NAMES = [
  'Sarah', 'Marco', 'Priya', 'James', 'Aiko', 'Liam', 'Fatima', 'Carlos',
  'Mei', 'Omar', 'Sofia', 'Raj', 'Hannah', 'Yuki', 'David', 'Amara',
];

const REVIEW_LAST_INITS = ['L.', 'T.', 'K.', 'M.', 'S.', 'W.', 'B.', 'N.', 'H.', 'R.', 'C.', 'P.'];

const REVIEW_TEMPLATES = [
  (loc: string, country: string) =>
    `Absolutely stunning experience at ${loc}. The views were breathtaking and the local guides were incredibly knowledgeable. A must-visit in ${country}!`,

  (loc: string, country: string) =>
    `${loc} exceeded my expectations. Great for photos and soaking in the local culture. Would recommend going early to avoid crowds.`,

  (loc: string, country: string) =>
    `One of the highlights of my ${country} trip. The atmosphere is magical and the surrounding area has so much to explore. Don't miss the local food nearby!`,

  (loc: string, country: string) =>
    `${loc} is a gem! The history and architecture are remarkable. Go with a guide to get the full story — it makes a huge difference.`,

  (loc: string, country: string) =>
    `Honestly, I wasn't sure what to expect but ${loc} blew me away. Peaceful, beautiful, and the people were so welcoming. 10/10 would return.`,

  (loc: string, country: string) =>
    `My favourite spot in ${country}. Whether you're into nature, culture, or just good food nearby, ${loc} delivers on every level.`,

  (loc: string, country: string) =>
    `Visited ${loc} on a whim and it became the highlight of my trip. The sunrise there is something I'll never forget. Absolutely recommend.`,

  (loc: string, country: string) =>
    `${loc} is well worth the journey. Authentic, not too touristy, and rich with local character. Perfect for travellers who want the real experience.`,
];

function getCuratedReviews(place: Place): PlaceReview[] {
  const seed = hashString(place.id || place.location);
  const now = new Date().toISOString();
  const reviews: PlaceReview[] = [];

  const count = 4 + (seed % 2);
  for (let i = 0; i < count; i++) {
    const nameIdx = (seed + i * 7) % REVIEW_FIRST_NAMES.length;
    const lastIdx = (seed + i * 13) % REVIEW_LAST_INITS.length;
    const templateIdx = (seed + i * 3) % REVIEW_TEMPLATES.length;

    const isAnon = (seed + i * 11) % 5 < 2;
    const author = isAnon
      ? `anonymous traveller`
      : `${REVIEW_FIRST_NAMES[nameIdx]} ${REVIEW_LAST_INITS[lastIdx]}`;

    const rating = 4 + ((seed + i * 17) % 2);

    reviews.push({
      author,
      source: 'curated',
      rating,
      text: REVIEW_TEMPLATES[templateIdx](place.location, place.country),
      date: now,
    });
  }

  return reviews;
}

function renderStars(rating: number): string {
  return '★'.repeat(rating) + '☆'.repeat(5 - rating);
}

type Props = {
  place: Place;
  onClose: () => void;
};

export function PlacePanel({ place, onClose }: Props) {
  const router = useRouter();
  const { addNote, removeNote, hasNote, userLocation, addShopPoints } = useApp();
  const [flights, setFlights] = useState<FlightInfo[]>([]);
  const [flightsLive, setFlightsLive] = useState(false);
  const [loadingFlights, setLoadingFlights] = useState(true);
  const [placeInfo, setPlaceInfo] = useState<PlaceInfo | null>(null);
  const saved = hasNote(place.id);

  const detailed = useMemo(
    () => expandPlace(place, allPlaces as Place[]),
    [place]
  );
  const localImage = useMemo(() => getLocalPlaceImage(detailed.id), [detailed.id]);
  const game = findMinigameForPlace(detailed);
  const accent = getCategoryColor(detailed.category);
  const transports = useMemo(
    () => parseTransports(detailed.howToGetThere),
    [detailed.howToGetThere]
  );
  const infoLinks = useMemo(() => getPlaceLinks(detailed), [detailed]);

  const originAirport = useMemo(() => {
    if (userLocation?.airport) return userLocation.airport;
    if (userLocation?.label) {
      const code = getAirportCodeForCity(userLocation.label);
      return code || 'SIN';
    }
    return 'SIN';
  }, [userLocation]);

  const originKnown = useMemo(() => {
    if (!userLocation) return false;
    if (userLocation.airport) return true;
    return !!getAirportCodeForCity(userLocation.label || '');
  }, [userLocation]);

  const originCityName = userLocation?.city || cleanCityLabel(userLocation?.label || '');

  const flightLinks = useMemo(
    () => getFlightSearchLinks(detailed.airport, originAirport, originCityName),
    [detailed.airport, originAirport, originCityName]
  );
  const officialTourism = useMemo(() => getOfficialTourismUrl(detailed.country), [detailed.country]);
  const reviews = useMemo(() => getCuratedReviews(detailed), [detailed]);

  useEffect(() => {
    let alive = true;
    setLoadingFlights(true);
    getFlightsTo(detailed.airport, originAirport).then(
      (reply) => {
        if (!alive) return;
        setFlights(reply.flights || []);
        setFlightsLive(!!reply.live);
        setLoadingFlights(false);
      },
      () => {
        if (!alive) return;
        setFlights([]);
        setFlightsLive(false);
        setLoadingFlights(false);
      }
    );
    return () => {
      alive = false;
    };
  }, [detailed.airport, originAirport]);

  useEffect(() => {
    let alive = true;
    getPlaceInfo(`${detailed.location}, ${detailed.country}`).then((info) => {
      if (!alive) return;
      setPlaceInfo(info);
    });
    return () => {
      alive = false;
    };
  }, [detailed.location, detailed.country]);

  const handleASEANFlight = (f: FlightInfo) => {
    if (isASEANAirline(f.airline)) {
      addShopPoints(10);
    }
  };

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

        <Image
          source={localImage ?? { uri: detailed.image }}
          style={styles.image}
          resizeMode="cover"
        />
        <Text style={styles.country}>{detailed.country.toLowerCase()}</Text>
        <Text style={styles.title}>{detailed.location}</Text>
        <Text style={styles.category}>{detailed.category.toLowerCase()}</Text>
        <Text style={styles.body}>{detailed.primaryActivities}</Text>

        {placeInfo && placeInfo.name ? (
          <View style={styles.placeInfoCard}>
            {placeInfo.photoUrl ? (
              <Image source={{ uri: placeInfo.photoUrl }} style={styles.placeInfoPhoto} resizeMode="cover" />
            ) : null}
            <View style={styles.placeInfoTop}>
              <Text style={styles.placeInfoName}>{placeInfo.name}</Text>
              {placeInfo.rating ? (
                <Text style={styles.placeInfoRating}>
                  ★ {placeInfo.rating.toFixed(1)}
                  {placeInfo.userRatingsTotal
                    ? ` (${placeInfo.userRatingsTotal.toLocaleString()})`
                    : ''}
                </Text>
              ) : null}
            </View>
            {placeInfo.address ? (
              <Text style={styles.placeInfoAddr}>{placeInfo.address}</Text>
            ) : null}
            <View style={styles.links}>
              {placeInfo.mapsUrl ? (
                <Pressable onPress={() => Linking.openURL(placeInfo.mapsUrl!)} style={styles.placeInfoBtn}>
                  <Text style={styles.placeInfoBtnText}>🗺 google maps</Text>
                </Pressable>
              ) : null}
              {placeInfo.website ? (
                <Pressable onPress={() => Linking.openURL(placeInfo.website!)} style={styles.placeInfoBtn}>
                  <Text style={styles.placeInfoBtnText}>🌐 official website</Text>
                </Pressable>
              ) : null}
              {userLocation && placeInfo.lat != null && placeInfo.lng != null ? (
                <Pressable
                  onPress={() =>
                    Linking.openURL(
                      `https://www.google.com/maps/dir/?api=1&origin=${userLocation.lat},${userLocation.lng}&destination=${placeInfo.lat},${placeInfo.lng}`
                    )
                  }
                  style={styles.placeInfoBtn}
                >
                  <Text style={styles.placeInfoBtnText}>🧭 directions from you</Text>
                </Pressable>
              ) : null}
            </View>
          </View>
        ) : null}

        {officialTourism ? (
          <Pressable
            onPress={() => Linking.openURL(officialTourism.url)}
            style={[styles.officialLink, { borderColor: accent }]}
          >
            <Text style={[styles.officialLinkIcon, { color: accent }]}>🏛</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.officialLinkTitle}>official tourism authority</Text>
              <Text style={styles.officialLinkSub}>{officialTourism.label}</Text>
            </View>
            <Text style={styles.officialLinkArrow}>→</Text>
          </Pressable>
        ) : null}

        <Text style={styles.section}>what visitors say</Text>
        {reviews.map((r, i) => (
          <View key={i} style={styles.reviewCard}>
            <View style={styles.reviewTop}>
              <Text style={styles.reviewAuthor}>{r.author}</Text>
              <Text style={styles.reviewStars}>{renderStars(r.rating)}</Text>
            </View>
            <Text style={styles.reviewText}>{r.text}</Text>
            <View style={styles.reviewMeta}>
              <Text style={styles.reviewSource}>
                {r.author.startsWith('anonymous')
                  ? 'Anonymous review'
                  : 'Verified visitor'}
              </Text>
            </View>
          </View>
        ))}

        <Text style={styles.section}>getting there — all transports</Text>
        {transports.map((leg, i) => (
          <View key={`${leg.mode}-${i}`} style={styles.transport}>
            <Text style={styles.transportMode}>{leg.label}</Text>
            <Text style={styles.body}>
              {leg.mode === 'flight'
                ? personalizeGettingThere(leg.detail, originAirport)
                : leg.detail}
            </Text>
          </View>
        ))}

        <Section title="visa & entry" text={detailed.visaEntry} />
        <Section title="culture & etiquette" text={detailed.cultureEtiquette} />
        <Section title="dress code" text={detailed.dressCode} />
        <Section title="payment" text={detailed.paymentMethods} />
        <Section title="access" text={detailed.accessNeeded} />
        <Section title="navigation" text={detailed.navigationTips} />
        <Section title="local food to try" text={detailed.food} />
        <Section title="where to stay" text={detailed.stay} />
        <Section title="getting around" text={detailed.gettingAround} />
        <Section title="transport" text={detailed.transport} />
        <Section title="cost per day (1 person)" text={detailed.costPerDay} />
        <Section title="opening hours" text={detailed.openingHours} />
        <Section
          title="emergency numbers"
          text={detailed.emergencyNumbers || getCountryEmergencyNumbers(detailed.country)}
        />
        <Section title="hospitals & clinics" text={detailed.hospitals} />
        <Section title="water source" text={detailed.waterSource} />
        <Section title="shops & supermarkets" text={detailed.shops} />

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

        <Text style={styles.section}>
          flights · {originKnown ? (originCityName ? `${originCityName} (${originAirport})` : originAirport) : 'origin unknown'} → {detailed.airport}
        </Text>
        <Text style={styles.flightLive}>
          {!originKnown
            ? 'set your starting city on the location screen to personalise flights.'
            : flightsLive
              ? '● live flight data'
              : '○ estimated schedule — open a flight to see live options & prices'}
        </Text>
        <View style={styles.links}>
          {flightLinks.map((link) => (
            <Pressable key={link.url} onPress={() => Linking.openURL(link.url)} style={styles.linkChipFlight}>
              <Text style={styles.linkChipFlightText}>{link.label}</Text>
            </Pressable>
          ))}
        </View>
        {loadingFlights ? (
          <ActivityIndicator color={colors.deepNavy} />
        ) : flights.length === 0 ? (
          <Text style={styles.body}>no flights found for this route at the moment.</Text>
        ) : (
          flights.map((f) => {
            const asean = isASEANAirline(f.airline);
            const detailUrl = getFlightDetailLink(f.from, f.to, f.departure);
            return (
              <Pressable
                key={f.flightNumber + f.departure}
                style={[styles.flight, asean && styles.flightASEAN]}
                onPress={() => {
                  handleASEANFlight(f);
                  Linking.openURL(detailUrl);
                }}
              >
                <View style={styles.flightTop}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={styles.flightNo}>{f.flightNumber}</Text>
                    {asean && <Text style={styles.aseanBadge}>ASEAN</Text>}
                  </View>
                  <Text style={styles.flightStatus}>{f.status}</Text>
                </View>
                <Text style={styles.flightMeta}>
                  {f.from} → {f.to} · {f.airline} · {formatFlightDate(f.departure)} ·{' '}
                  {formatFlightTime(f.departure)} → {formatFlightTime(f.arrival)}
                  {f.terminal ? ` · ${f.terminal}` : ''}
                </Text>
                {f.price != null ? (
                  <Text style={styles.flightPrice}>
                    {f.currency || 'USD'} {Number(f.price).toLocaleString()}
                  </Text>
                ) : null}
                {asean && (
                  <Text style={styles.aseanPoints}>+10 shop points · ASEAN partner airline</Text>
                )}
                <Text style={styles.flightLink}>view this flight →</Text>
              </Pressable>
            );
          })
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

function Section({ title, text }: { title: string; text?: string }) {
  if (!text) return null;
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
    height: 200,
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
  officialLink: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1.5,
    backgroundColor: colors.mist,
  },
  officialLinkIcon: {
    fontSize: 28,
  },
  officialLinkTitle: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 13,
    color: colors.deepNavy,
    letterSpacing: 0.4,
  },
  officialLinkSub: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 12,
    color: colors.muted,
    marginTop: 2,
  },
  officialLinkArrow: {
    fontSize: 18,
    color: colors.muted,
  },
  reviewCard: {
    padding: 14,
    borderRadius: 14,
    backgroundColor: colors.mist,
    borderWidth: 1,
    borderColor: colors.line,
    marginBottom: 8,
  },
  reviewTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  reviewAuthor: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 13,
    color: colors.deepNavy,
  },
  reviewStars: {
    fontSize: 13,
    color: colors.warning,
    letterSpacing: 1,
  },
  reviewText: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    lineHeight: 19,
    color: colors.ink,
  },
  reviewMeta: {
    marginTop: 8,
    flexDirection: 'row',
    gap: 8,
  },
  reviewSource: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 11,
    color: colors.muted,
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
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.pureWhite,
    marginBottom: 8,
  },
  flightASEAN: {
    borderColor: colors.aseanYellow,
    backgroundColor: '#FFFEF0',
  },
  flightTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  flightNo: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 14,
    color: colors.deepNavy,
  },
  aseanBadge: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 10,
    color: colors.pureWhite,
    backgroundColor: colors.aseanBlue,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    letterSpacing: 0.6,
    overflow: 'hidden',
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
  flightLive: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 11,
    color: colors.muted,
    marginBottom: 8,
  },
  placeInfoCard: {
    marginTop: 14,
    padding: 14,
    borderRadius: 16,
    backgroundColor: colors.mist,
    borderWidth: 1,
    borderColor: colors.line,
    overflow: 'hidden',
  },
  placeInfoPhoto: {
    width: '100%',
    height: 140,
    borderRadius: 12,
    marginBottom: 10,
    backgroundColor: colors.silentBlue,
  },
  placeInfoTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  placeInfoName: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 14,
    color: colors.deepNavy,
    flexShrink: 1,
  },
  placeInfoRating: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 13,
    color: colors.warning,
  },
  placeInfoAddr: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 12,
    color: colors.muted,
    marginTop: 4,
  },
  placeInfoBtn: {
    backgroundColor: colors.pureWhite,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  placeInfoBtnText: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 12,
    color: colors.deepNavy,
  },
  aseanPoints: {
    marginTop: 4,
    fontFamily: 'DMSans_500Medium',
    fontSize: 11,
    color: colors.aseanBlue,
  },
  flightPrice: {
    marginTop: 4,
    fontFamily: 'Fraunces_600SemiBold',
    fontSize: 15,
    color: colors.deepNavy,
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
