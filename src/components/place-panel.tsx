import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Image, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { places as allPlaces } from '../../data';
import { colors, getCategoryColor } from '../constants/colors';
import { getCountryEmergencyNumbers } from '../constants/country-emergency';
import { getLocalPlaceImage } from '../data/place-images';
import { useApp } from '../context/app-context';
import type { FlightInfo, HotelItem, HotelsReply, Place, PlaceInfo, PlaceReview } from '../types/place';
import {
  addDays,
  formatDateLong,
  formatFlightDate,
  formatFlightTime,
  getFlightsTo,
  toISODate,
} from '../services/flights';
import { getPlaceInfo, getPlaceReviews } from '../services/place-info';
import { getHotelsNear } from '../services/hotels';
import { ScrollDatePicker } from './ui/scroll-dates';
import { detectUserCurrency, formatCostPerDay } from '../services/currency';
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
import { titleCase } from '../utils/text';
import { Button } from './ui/button';

function renderStars(rating: number): string {
  return '★'.repeat(rating) + '☆'.repeat(5 - rating);
}

type Props = {
  place: Place;
  onClose: () => void;
};

export function PlacePanel({ place, onClose }: Props) {
  const router = useRouter();
  const { addNote, removeNote, hasNote, userLocation } = useApp();
  const [flights, setFlights] = useState<FlightInfo[]>([]);
  const [returnFlights, setReturnFlights] = useState<FlightInfo[]>([]);
  const [flightsLive, setFlightsLive] = useState(false);
  const [loadingFlights, setLoadingFlights] = useState(true);
  const [exactDates, setExactDates] = useState(true);
  const [nearestOutbound, setNearestOutbound] = useState('');
  const [nearestReturn, setNearestReturn] = useState('');
  const [hotels, setHotels] = useState<HotelsReply | null>(null);
  const [hotelsLoading, setHotelsLoading] = useState(true);
  const today = useMemo(() => {
    const t = new Date();
    return new Date(t.getFullYear(), t.getMonth(), t.getDate());
  }, []);
  const [outboundDate, setOutboundDate] = useState(() => addDays(today, 1));
  const [returnDate, setReturnDate] = useState(() => addDays(today, 5));
  const [placeInfo, setPlaceInfo] = useState<PlaceInfo | null>(null);
  const [realReviews, setRealReviews] = useState<PlaceReview[] | null>(null);
  const [reviewsMeta, setReviewsMeta] = useState<{ placeName?: string; mapsUrl?: string }>({});
  const saved = hasNote(place.id);

  const detailed = useMemo(
    () => expandPlace(place, allPlaces as Place[]),
    [place]
  );
  const localImage = useMemo(() => getLocalPlaceImage(detailed.id), [detailed.id]);
  const game = findMinigameForPlace(detailed);
  const accent = getCategoryColor(detailed.category);
  const userCurrency = useMemo(() => detectUserCurrency(userLocation), [userLocation]);
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

  useEffect(() => {
    let alive = true;
    setLoadingFlights(true);
    getFlightsTo(detailed.airport, originAirport, toISODate(outboundDate), toISODate(returnDate)).then(
      (reply) => {
        if (!alive) return;
        setFlights(reply.flights || []);
        setReturnFlights(reply.returnFlights || []);
        setFlightsLive(!!reply.live);
        setExactDates(reply.exactDates !== false);
        setNearestOutbound(reply.nearestOutboundDate || '');
        setNearestReturn(reply.nearestReturnDate || '');
        setLoadingFlights(false);
      },
      () => {
        if (!alive) return;
        setFlights([]);
        setReturnFlights([]);
        setFlightsLive(false);
        setExactDates(true);
        setNearestOutbound('');
        setNearestReturn('');
        setLoadingFlights(false);
      }
    );
    return () => {
      alive = false;
    };
  }, [detailed.airport, originAirport, outboundDate, returnDate]);

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

  useEffect(() => {
    let alive = true;
    getPlaceReviews(`${detailed.location}, ${detailed.country}`).then((res) => {
      if (!alive || !res || !res.reviews.length) return;
      setRealReviews(res.reviews);
      setReviewsMeta({ placeName: res.placeName, mapsUrl: res.mapsUrl });
    });
    return () => {
      alive = false;
    };
  }, [detailed.location, detailed.country]);

  useEffect(() => {
    let alive = true;
    setHotelsLoading(true);
    getHotelsNear(detailed.location, toISODate(outboundDate), toISODate(returnDate)).then((h) => {
      if (!alive) return;
      setHotels(h);
      setHotelsLoading(false);
    });
    return () => {
      alive = false;
    };
  }, [detailed.location, outboundDate, returnDate]);

  const FlightCard = ({ f }: { f: FlightInfo }) => (
    <Pressable
      style={styles.flight}
      onPress={() => Linking.openURL(getFlightDetailLink(f.from, f.to, f.departure))}
    >
      <View style={styles.flightTop}>
        <Text style={styles.flightNo}>{f.flightNumber}</Text>
        <Text style={styles.flightStatus}>{f.status}</Text>
      </View>
      <Text style={styles.flightMeta}>
        {f.from} → {f.to} · {titleCase(f.airline)} · {formatFlightDate(f.departure)} ·{' '}
        {formatFlightTime(f.departure)} → {formatFlightTime(f.arrival)}
        {f.terminal ? ` · ${f.terminal}` : ''}
      </Text>
      {f.price != null ? (
        <Text style={styles.flightPrice}>
          {f.currency || 'USD'} {Number(f.price).toLocaleString()}
        </Text>
      ) : null}
      <Text style={styles.flightLink}>view this flight on google flights →</Text>
    </Pressable>
  );

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
        <Text style={styles.country}>{titleCase(detailed.country)}</Text>
        <Text style={styles.title}>{detailed.location}</Text>
        <Text style={styles.category}>{titleCase(detailed.category)}</Text>
        <Text style={styles.body}>{detailed.primaryActivities}</Text>

        <Pressable
          onPress={() =>
            Linking.openURL(
              `https://en.wikipedia.org/wiki/Special:Search?search=${encodeURIComponent(detailed.location)}`
            )
          }
          style={[styles.moreInfoBtn, { borderColor: accent }]}
        >
          <Text style={[styles.moreInfoIcon, { color: accent }]}>📖</Text>
          <Text style={styles.moreInfoText}>
            more about {titleCase(detailed.location)} →
          </Text>
        </Pressable>

        {detailed.food ? (
          <View style={styles.foodCard}>
            <View style={styles.foodCardHeader}>
              <Text style={styles.foodCardIcon}>🍜</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.foodCardTitle}>local delicacies</Text>
                <Text style={styles.foodCardSub}>recommended food to try here</Text>
              </View>
            </View>
            <View style={styles.foodChips}>
              {detailed.food
                .split(',')
                .map((d) => d.trim())
                .filter(Boolean)
                .map((dish) => (
                  <View key={dish} style={styles.foodChip}>
                    <Text style={styles.foodChipText}>{dish}</Text>
                  </View>
                ))}
            </View>
          </View>
        ) : null}

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
        {realReviews && realReviews.length ? (
          <>
            {realReviews.map((r, i) => (
              <View key={`${r.author}-${i}`} style={styles.reviewCard}>
                <View style={styles.reviewTop}>
                  <Text style={styles.reviewAuthor}>{r.author}</Text>
                  <Text style={styles.reviewStars}>{renderStars(r.rating)}</Text>
                </View>
                <Text style={styles.reviewText}>{r.text}</Text>
                <View style={styles.reviewMeta}>
                  <Text style={styles.reviewSource}>
                    google maps{r.date ? ` · ${r.date}` : ''}
                  </Text>
                  {r.url ? (
                    <Pressable onPress={() => Linking.openURL(r.url!)}>
                      <Text style={styles.reviewLink}>read on google maps →</Text>
                    </Pressable>
                  ) : null}
                </View>
              </View>
            ))}
            {reviewsMeta.mapsUrl ? (
              <Pressable
                onPress={() => Linking.openURL(reviewsMeta.mapsUrl!)}
                style={styles.reviewAllLink}
              >
                <Text style={styles.reviewAllLinkText}>
                  see all google maps reviews for {reviewsMeta.placeName || detailed.location} →
                </Text>
              </Pressable>
            ) : null}
          </>
        ) : (
          <Text style={styles.body}>real traveller reviews from google maps will appear here.</Text>
        )}

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

        <Section title="culture & etiquette" text={detailed.cultureEtiquette} />
        <Section title="dress code" text={detailed.dressCode} />
        <Section title="payment" text={detailed.paymentMethods} />
        <Section title="access" text={detailed.accessNeeded} />
        <Section title="navigation" text={detailed.navigationTips} />
        <Section title="where to stay" text={detailed.stay} />
        <Section title="getting around" text={detailed.gettingAround} />
        <Section title="transport" text={detailed.transport} />
        {(() => {
          const cost = formatCostPerDay(detailed.costPerDay, detailed.country, userCurrency);
          return cost ? (
            <View style={{ marginTop: 14 }}>
              <Text style={styles.section}>cost per day (1 person)</Text>
              <Text style={styles.body}>{cost}</Text>
            </View>
          ) : null;
        })()}
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

        <Text style={styles.section}>flights</Text>
        {!originKnown ? (
          <Text style={styles.flightHint}>
            set your starting city on the location screen to personalise flights.
          </Text>
        ) : (
          <>
            <Text style={styles.flightRoute}>
              when would you like to travel? scroll the wheels to pick your going and return dates.
            </Text>
            <Text style={styles.dateLabel}>
              {originCityName ? `${originCityName} (${originAirport})` : originAirport} → {detailed.airport}
            </Text>
            <ScrollDatePicker
              start={outboundDate}
              end={returnDate}
              minDate={today}
              maxDate={addDays(today, 180)}
              onChange={(s, e) => {
                setOutboundDate(s);
                setReturnDate(e > s ? e : addDays(s, 1));
              }}
            />
            <Text style={styles.flightLive}>
              {flightsLive
                ? '● live options via google flights'
                : '○ estimated schedule — tap a flight to see live options & prices'}
            </Text>
          </>
        )}

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
          <>
            {!exactDates && (flights.length || returnFlights.length) ? (
              <Text style={styles.noFlightsNote}>
                no flights for your exact dates yet — schedules usually open closer to travel.
                here are options on the nearest available dates:
              </Text>
            ) : null}
            {flights.length ? (
              <>
                <Text style={styles.groupTitle}>
                  going ·{' '}
                  {formatDateLong(nearestOutbound ? new Date(`${nearestOutbound}T00:00:00`) : outboundDate)}
                </Text>
                {flights.map((f) => (
                  <FlightCard key={`out-${f.flightNumber}-${f.departure}`} f={f} />
                ))}
              </>
            ) : null}
            {returnFlights.length ? (
              <>
                <Text style={styles.groupTitle}>
                  back ·{' '}
                  {formatDateLong(nearestReturn ? new Date(`${nearestReturn}T00:00:00`) : returnDate)}
                </Text>
                {returnFlights.map((f) => (
                  <FlightCard key={`ret-${f.flightNumber}-${f.departure}`} f={f} />
                ))}
              </>
            ) : null}
            {!flights.length && !returnFlights.length ? (
              <Text style={styles.body}>
                {!exactDates
                  ? 'no flights are available for those dates yet — airline schedules usually open a few months out. try dates closer to today on the calendar, and check back again later.'
                  : flightsLive
                    ? 'no flights available for this route on those dates — try moving your dates on the calendar.'
                    : 'no flights found for this route on those dates.'}
              </Text>
            ) : null}
          </>
        )}

        <Text style={styles.section}>hotels & homestays</Text>
        {hotelsLoading ? (
          <ActivityIndicator color={colors.deepNavy} />
        ) : hotels ? (
          <>
            <Text style={styles.flightRoute}>
              bookable stays for your dates — {formatDateLong(new Date(`${hotels.checkin}T00:00:00`))} to{' '}
              {formatDateLong(new Date(`${hotels.checkout}T00:00:00`))}. tap a stay to check rates and book.
            </Text>
            {hotels.hotels.map((h: HotelItem, i: number) => (
              <Pressable
                key={`${h.name}-${i}`}
                style={styles.hotel}
                onPress={() => (h.link ? Linking.openURL(h.link) : undefined)}
              >
                {h.thumbnail ? (
                  <Image source={{ uri: h.thumbnail }} style={styles.hotelThumb} resizeMode="cover" />
                ) : null}
                <View style={{ flex: 1, gap: 3 }}>
                  <Text style={styles.hotelName}>{h.name}</Text>
                  {h.description ? (
                    <Text style={styles.hotelDesc} numberOfLines={2}>
                      {h.description}
                    </Text>
                  ) : null}
                  <View style={styles.hotelMeta}>
                    {h.hotelClass ? (
                      <Text style={styles.hotelMetaText}>{'★'.repeat(h.hotelClass)}</Text>
                    ) : null}
                    {h.rating ? (
                      <Text style={styles.hotelMetaText}>★ {h.rating.toFixed(1)}</Text>
                    ) : null}
                    {h.reviews ? (
                      <Text style={styles.hotelMetaText}>({h.reviews.toLocaleString()} reviews)</Text>
                    ) : null}
                  </View>
                  {h.price ? <Text style={styles.hotelPrice}>{h.price}/night</Text> : null}
                  {h.link ? <Text style={styles.hotelLink}>view & book →</Text> : null}
                </View>
              </Pressable>
            ))}
          </>
        ) : (
          <Text style={styles.body}>
            bookable hotels & homestays near {detailed.location} will appear here for your dates.
          </Text>
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
  foodCard: {
    marginTop: 14,
    padding: 14,
    borderRadius: 16,
    backgroundColor: colors.warmCream,
    borderWidth: 1.5,
    borderColor: colors.warning,
  },
  foodCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  foodCardIcon: { fontSize: 26 },
  foodCardTitle: {
    fontFamily: 'Fraunces_600SemiBold',
    fontSize: 16,
    color: colors.deepNavy,
  },
  foodCardSub: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 12,
    color: colors.muted,
    marginTop: 2,
  },
  foodChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  foodChip: {
    backgroundColor: colors.pureWhite,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.line,
  },
  foodChipText: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 13,
    color: colors.deepNavy,
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
  reviewLink: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 12,
    color: colors.aseanBlue,
  },
  reviewAllLink: {
    marginTop: 4,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: colors.subtleBlue,
    alignSelf: 'flex-start',
  },
  reviewAllLinkText: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 12,
    color: colors.deepNavy,
    letterSpacing: 0.4,
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
    flexWrap: 'wrap',
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
  flightTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
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
  flightRoute: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    lineHeight: 19,
    color: colors.ink,
    marginBottom: 10,
  },
  flightHint: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    lineHeight: 19,
    color: colors.ink,
  },
  dateLabel: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 12,
    color: colors.midnightNavy,
    letterSpacing: 0.4,
    marginTop: 10,
    marginBottom: 6,
  },
  dateRow: { gap: 8, paddingBottom: 4, paddingRight: 12 },
  dateChip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.pureWhite,
  },
  dateChipOn: {
    backgroundColor: colors.aseanBlue,
    borderColor: colors.aseanBlue,
  },
  dateChipText: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 12,
    color: colors.deepNavy,
  },
  dateChipTextOn: {
    color: colors.pureWhite,
  },
  groupTitle: {
    fontFamily: 'Fraunces_600SemiBold',
    fontSize: 16,
    color: colors.deepNavy,
    marginTop: 14,
    marginBottom: 8,
  },
  flightLive: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 11,
    color: colors.muted,
    marginTop: 10,
  },
  flightPrice: {
    marginTop: 4,
    fontFamily: 'Fraunces_600SemiBold',
    fontSize: 15,
    color: colors.deepNavy,
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
  noFlightsNote: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 13,
    lineHeight: 19,
    color: colors.warning,
    backgroundColor: colors.warmCream,
    borderWidth: 1,
    borderColor: colors.warning,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  moreInfoBtn: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    borderWidth: 1.5,
    backgroundColor: colors.mist,
  },
  moreInfoIcon: { fontSize: 16 },
  moreInfoText: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 13,
    color: colors.deepNavy,
  },
  hotel: {
    flexDirection: 'row',
    gap: 12,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.pureWhite,
    marginBottom: 8,
  },
  hotelThumb: {
    width: 72,
    height: 72,
    borderRadius: 12,
    backgroundColor: colors.silentBlue,
  },
  hotelName: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 14,
    color: colors.deepNavy,
  },
  hotelDesc: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 12,
    lineHeight: 16,
    color: colors.muted,
  },
  hotelMeta: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  hotelMetaText: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 11,
    color: colors.muted,
  },
  hotelPrice: {
    fontFamily: 'Fraunces_600SemiBold',
    fontSize: 14,
    color: colors.forestGreen,
  },
  hotelLink: {
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