import { useMemo, useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { Redirect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getPlaceById, places as allPlaces } from '../data';
import { BackButton } from '../src/components/ui/back-button';
import { Body, Title } from '../src/components/ui/text';
import { colors } from '../src/constants/colors';
import { useApp } from '../src/context/app-context';
import type { Place } from '../src/types/place';
import { expandPlace, getPlaceLinks, parseTransports, personalizeGettingThere } from '../src/utils/place-details';
import { titleCase } from '../src/utils/text';

export default function NotesScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const compact = width < 420;
  const { auth, onboarded, notes, removeNote, updatenotebody, setSelectedPlaceId, userLocation } = useApp();
  const [openId, setOpenId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  const items = useMemo(
    () =>
      notes
        .map((n) => ({ note: n, place: getPlaceById(n.placeId) as Place | undefined }))
        .filter((x) => !!x.place)
        .map((x) => ({
          ...x,
          place: expandPlace(x.place as Place, allPlaces as Place[]),
        })),
    [notes]
  );

  if (!auth) return <Redirect href="/welcome" />;
  if (!onboarded) return <Redirect href="/welcome" />;

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 12 }]}>
      <View style={styles.header}>
        <BackButton />
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <Title style={{ fontSize: compact ? 24 : 28 }}>
          {compact ? 'notes' : 'travel notes'}
        </Title>
        <Body style={styles.sub}>
          {compact
            ? 'saved places with full details.'
            : 'saved places keep every detail — even when another place shares the same route.'}
        </Body>
        {!items.length ? (
          <View style={styles.empty}>
            <Body>
              {compact
                ? 'no places yet — tap + on the globe.'
                : 'no places yet — open the globe and tap + on a destination.'}
            </Body>
          </View>
        ) : (
          items.map(({ note, place }) => {
            if (!place) return null;
            const open = openId === place.id;
            const transports = parseTransports(place.howToGetThere);
            const links = getPlaceLinks(place);
            return (
              <View key={place.id} style={styles.card}>
                <Pressable
                  onPress={() => setOpenId(open ? null : place.id)}
                  style={styles.row}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.name}>{place.location}</Text>
                    <Text style={styles.meta}>
                      {titleCase(place.country)} · {titleCase(place.category)}
                    </Text>
                  </View>
                  <Text style={styles.chev}>{open ? '–' : '+'}</Text>
                </Pressable>
                {open ? (
                  <View style={styles.drop}>
                    <Body>{place.primaryActivities}</Body>
                    <Body style={styles.block}>getting there:</Body>
                    {transports.map((t, i) => (
                      <Body key={`${t.mode}-${i}`} style={styles.block}>
                        {t.label}:{' '}
                        {t.mode === 'flight'
                          ? personalizeGettingThere(t.detail, userLocation?.airport)
                          : t.detail}
                      </Body>
                    ))}
                    <Body style={styles.block}>visa: {place.visaEntry}</Body>
                    <Body style={styles.block}>dress: {place.dressCode}</Body>
                    <Body style={styles.block}>etiquette: {place.cultureEtiquette}</Body>
                    <Body style={styles.block}>payment: {place.paymentMethods}</Body>
                    <Body style={styles.block}>access: {place.accessNeeded}</Body>
                    <Body style={styles.block}>navigation: {place.navigationTips}</Body>
                    <Body style={styles.block}>amenities: {place.amenities.join(', ')}</Body>
                    {place.funFacts?.length ? (
                      <Body style={styles.block}>facts: {place.funFacts.join(' · ')}</Body>
                    ) : null}
                    <View style={styles.linkRow}>
                      {links.slice(0, 3).map((l) => (
                        <Pressable key={l.url} onPress={() => Linking.openURL(l.url)} style={styles.linkChip}>
                          <Text style={styles.linkChipText}>{l.label}</Text>
                        </Pressable>
                      ))}
                    </View>
                    <TextInput
                      value={drafts[place.id] ?? note.body ?? ''}
                      onChangeText={(text) => {
                        setDrafts((d) => ({ ...d, [place.id]: text }));
                        updatenotebody(place.id, text);
                      }}
                      placeholder={compact ? 'add a note about this place…' : 'type anything you want to remember about this place — packing, tips, or a journal entry.'}
                      placeholderTextColor={colors.muted}
                      style={styles.noteBody}
                      multiline
                      textAlignVertical="top"
                    />
                    <View style={styles.actions}>
                      <Pressable
                        onPress={() => {
                          setSelectedPlaceId(place.id);
                          router.push('/globe');
                        }}
                        style={styles.action}
                      >
                        <Text style={styles.actionText}>open on globe</Text>
                      </Pressable>
                      <Pressable onPress={() => removeNote(place.id)} style={styles.actionGhost}>
                        <Text style={styles.actionGhostText}>remove</Text>
                      </Pressable>
                    </View>
                    <Text style={styles.saved}>
                      saved {new Date(note.addedAt).toLocaleString().toLowerCase()}
                      {note.updatedAt && note.updatedAt !== note.addedAt
                        ? ` · edited ${new Date(note.updatedAt).toLocaleString().toLowerCase()}`
                        : ''}
                    </Text>
                  </View>
                ) : null}
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.mist },
  header: { paddingHorizontal: 20 },
  content: { padding: 20, paddingBottom: 48 },
  sub: { marginTop: 8, marginBottom: 18, color: colors.midnightNavy },
  empty: {
    padding: 18,
    borderRadius: 16,
    backgroundColor: colors.pureWhite,
    borderWidth: 1,
    borderColor: colors.line,
  },
  card: {
    backgroundColor: colors.pureWhite,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.line,
    marginBottom: 10,
    overflow: 'hidden',
  },
  row: {
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  name: {
    fontFamily: 'Fraunces_600SemiBold',
    fontSize: 18,
    color: colors.deepNavy,
  },
  meta: {
    marginTop: 4,
    fontFamily: 'DMSans_400Regular',
    fontSize: 12,
    color: colors.muted,
  },
  chev: {
    fontSize: 22,
    color: colors.deepNavy,
    fontFamily: 'DMSans_500Medium',
  },
  drop: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    paddingTop: 12,
    gap: 6,
  },
  block: { marginTop: 4 },
  linkRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  linkChip: {
    backgroundColor: colors.subtleBlue,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  linkChipText: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 12,
    color: colors.deepNavy,
  },
  actions: { flexDirection: 'row', gap: 8, marginTop: 12 },
  action: {
    backgroundColor: colors.deepNavy,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  actionText: {
    color: colors.pureWhite,
    fontFamily: 'DMSans_500Medium',
    fontSize: 13,
  },
  actionGhost: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.line,
  },
  actionGhostText: {
    color: colors.aseanRed,
    fontFamily: 'DMSans_500Medium',
    fontSize: 13,
  },
  saved: {
    marginTop: 10,
    fontFamily: 'DMSans_400Regular',
    fontSize: 11,
    color: colors.muted,
  },
  noteBody: {
    marginTop: 8,
    minHeight: 72,
    maxHeight: 180,
    backgroundColor: colors.mist,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
    lineHeight: 20,
    color: colors.ink,
  },
});
