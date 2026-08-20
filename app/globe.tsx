import { useEffect, useMemo, useState } from 'react';
import { Dimensions, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { Redirect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { filterPlacesByProfile, getPlaceById } from '../data';
import { GlobeMap } from '../src/components/globe-map';
import { PlacePanel } from '../src/components/place-panel';
import { colors, getCategoryColor } from '../src/constants/colors';
import { useApp } from '../src/context/app-context';
import type { Place } from '../src/types/place';

export default function GlobeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const compact = width < 420;
  const wide = width >= 900;
  const {
    auth,
    logout,
    preferences,
    travellerProfile,
    userLocation,
    selectedPlaceId,
    setSelectedPlaceId,
    onboarded,
  } = useApp();
  const [flyRoute, setFlyRoute] = useState<{
    from: { lat: number; lng: number };
    to: { lat: number; lng: number };
    color: string;
  } | null>(null);

  const places = useMemo(
    () => filterPlacesByProfile(preferences, travellerProfile) as Place[],
    [preferences, travellerProfile]
  );

  const selected = selectedPlaceId ? (getPlaceById(selectedPlaceId) as Place | undefined) : null;
  const panel = useSharedValue(0);

  useEffect(() => {
    panel.value = withTiming(selected ? 1 : 0, { duration: 450 });
  }, [selected, panel]);

  const mapStyle = useAnimatedStyle(() => ({
    flex: 1,
    width: '100%',
  }));

  const sideStyle = useAnimatedStyle(() => ({
    width: wide ? Math.min(420, width * 0.42) : '100%',
    opacity: panel.value,
    position: 'absolute' as const,
    right: 0,
    top: wide ? 0 : undefined,
    bottom: 0,
    height: wide ? '100%' : panel.value ? '72%' : 0,
  }));

  if (!auth) return <Redirect href="/welcome" />;
  if (!onboarded) return <Redirect href="/welcome" />;

  const onSelectPlace = (id: string) => {
    const place = getPlaceById(id) as Place | undefined;
    if (!place) return;
    setSelectedPlaceId(id);
    if (userLocation) {
      setFlyRoute({
        from: { lat: userLocation.lat, lng: userLocation.lng },
        to: { lat: place.lat, lng: place.lng },
        color: getCategoryColor(place.category),
      });
    }
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.topBar}>
        <View style={styles.navLeft}>
          <TopLink label="notes" onPress={() => router.push('/notes')} />
          <TopLink label={compact ? 'ai' : 'ai chat'} onPress={() => router.push('/chat')} />
          <TopLink label="shop" onPress={() => router.push('/redeem')} />
        </View>
        {width >= 700 ? (
          <View style={styles.navCenter}>
            <Text style={[styles.globeLabel, { fontSize: wide ? 18 : 15 }]}>globe</Text>
          </View>
        ) : null}
        <View style={styles.navRight}>
          <TopLink label="logout" onPress={() => { logout(); router.replace('/welcome'); }} />
        </View>
      </View>

      <View style={styles.stage}>
        <Animated.View style={mapStyle}>
          <GlobeMap
            places={places}
            userLocation={userLocation}
            selectedPlace={selected || null}
            split={false}
            flyRoute={flyRoute}
            onSelect={onSelectPlace}
            onPlaneDone={() => setFlyRoute(null)}
          />
          <View
            style={[
              styles.legend,
              {
                bottom:
                  insets.bottom +
                  (selected && !wide ? Dimensions.get('window').height * 0.72 + 8 : 16),
              },
            ]}
          >
            <Text style={styles.legendText}>
              {compact
                ? `${places.length} places · tap a light`
                : `${places.length} places · pinch to zoom · tap a light · plane flies from your start`}
            </Text>
          </View>
        </Animated.View>

        {selected ? (
          <Animated.View style={[styles.side, sideStyle]}>
            <PlacePanel place={selected} onClose={() => setSelectedPlaceId(null)} />
          </Animated.View>
        ) : null}
      </View>
    </View>
  );
}

function TopLink({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.link, pressed && { opacity: 0.75 }]}>
      <Text style={styles.linkText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#04140a' },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: 'rgba(6,37,14,0.92)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.14)',
  },
  navLeft: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  navCenter: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 0,
    pointerEvents: 'none' as const,
  },
  navRight: { flexDirection: 'row', gap: 8, marginLeft: 'auto' },
  globeLabel: {
    fontFamily: 'Fraunces_600SemiBold',
    letterSpacing: 1,
    color: colors.pureWhite,
  },
  link: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
  },
  linkText: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 12,
    letterSpacing: 0.8,
    color: colors.pureWhite,
  },
  stage: { flex: 1, flexDirection: 'row', overflow: 'hidden' },
  side: {
    backgroundColor: 'transparent',
    paddingLeft: 0,
    zIndex: 4,
  },
  legend: {
    position: 'absolute',
    left: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.88)',
  },
  legendText: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 12,
    color: colors.midnightNavy,
  },
});
