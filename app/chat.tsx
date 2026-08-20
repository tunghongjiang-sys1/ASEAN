import { useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { Redirect, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { places as allPlaces, getPlaceById } from '../data';
import { BackButton } from '../src/components/ui/back-button';
import { Button } from '../src/components/ui/button';
import { Title } from '../src/components/ui/text';
import { colors } from '../src/constants/colors';
import { useApp } from '../src/context/app-context';
import { askLocalDesk } from '../src/services/local-chat';
import { askTravelAgent } from '../src/services/openrouter';
import { foodSafeForAllergies } from '../src/utils/allergies';
import type { ChatMessage, Place } from '../src/types/place';

const SUGGESTIONS = [
  'plan a 3-day bali trip',
  'best time for angkor?',
  'visa tips for indonesia',
  'family-friendly vietnam',
  'how to reach raja ampat',
  'what to wear at temples',
  'hidden gems in cambodia',
  'local food to try in hanoi',
  'any festivals this month?',
  'recommend a beach destination',
];

export default function ChatScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const compact = width < 420;
  const { seed } = useLocalSearchParams<{ seed?: string }>();
  const { auth, onboarded, notes, preferences, travellerProfile, userLocation } = useApp();
  const [input, setInput] = useState(typeof seed === 'string' ? seed : '');
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: travellerProfile
        ? `hello ${travellerProfile.mode === 'solo' ? 'solo traveller' : `group of ${travellerProfile.groupSize || '?'}`}! i'm your asean travel desk. ask me about ${travellerProfile.placeTypes?.slice(0, 3).join(', ') || 'destinations, itineraries, or local tips'} across indonesia, cambodia, and vietnam. what country or vibe are you looking for?`
        : compact
          ? 'hi — which country or type of attraction interests you?'
          : 'hello — i am your asean travel desk. tell me which country you would like to visit, or the kind of attractions you enjoy (beaches, temples, jungles, food…), and i will recommend places, hidden gems, and activities across the region.',
      createdAt: new Date().toISOString(),
    },
  ]);
  const listRef = useRef<FlatList>(null);

  const dbPlaces = useMemo(() => {
    const pref = preferences.map((p) => p.toLowerCase());
    const byCategory =
      pref.length === 0
        ? (allPlaces as Place[])
        : (allPlaces as Place[]).filter((p) => pref.includes(p.category.toLowerCase()));
    const allergies = travellerProfile?.foodAllergies || '';
    return allergies
      ? byCategory.filter((p) => foodSafeForAllergies(p.food, allergies))
      : byCategory;
  }, [preferences, travellerProfile]);

  const notePlaces = useMemo(
    () =>
      notes
        .map((n) => getPlaceById(n.placeId) as Place | undefined)
        .filter(Boolean) as Place[],
    [notes]
  );

  if (!auth) return <Redirect href="/welcome" />;
  if (!onboarded) return <Redirect href="/welcome" />;

  const sendText = async (qRaw: string) => {
    const q = qRaw.trim();
    if (!q || busy) return;
    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: q,
      createdAt: new Date().toISOString(),
    };
    setMessages((m) => [...m, userMsg]);
    setInput('');
    setBusy(true);
    try {
      let contextualizedQ = q;
      if (travellerProfile) {
        const ctx: string[] = [];
        if (travellerProfile.mode === 'group') ctx.push(`i am travelling in a group of ${travellerProfile.groupSize}`);
        else ctx.push('i am travelling solo');
        if (travellerProfile.placeTypes?.length) ctx.push(`i like: ${travellerProfile.placeTypes.join(', ')}`);
        if (travellerProfile.transportPreference) ctx.push(`i prefer ${travellerProfile.transportPreference} transport`);
        if (travellerProfile.foodAllergies) ctx.push(`i have food restrictions: ${travellerProfile.foodAllergies}`);
        if (travellerProfile.hasElderly) ctx.push('travelling with elderly');
        if (travellerProfile.hasChildren) ctx.push('travelling with children');
        if (ctx.length) contextualizedQ = `[traveller profile: ${ctx.join('. ')}] ${q}`;
      }

      let reply: string;
      const agentReply = await askTravelAgent(
        contextualizedQ,
        messages,
        dbPlaces,
        notePlaces,
        userLocation,
        travellerProfile
      );
      if (agentReply.includes('chat backend unreachable') || agentReply.includes('network error')) {
        reply = await askLocalDesk(
          contextualizedQ,
          dbPlaces,
          notePlaces,
          userLocation?.airport,
          userLocation?.country,
          travellerProfile
        );
      } else {
        reply = agentReply;
      }

      setMessages((m) => [
        ...m,
        {
          id: `a-${Date.now()}`,
          role: 'assistant',
          content: reply,
          createdAt: new Date().toISOString(),
        },
      ]);
    } catch (e: any) {
      setMessages((m) => [
        ...m,
        {
          id: `e-${Date.now()}`,
          role: 'assistant',
          content: `sorry — ${e?.message || 'the desk could not reply just now'}.`,
          createdAt: new Date().toISOString(),
        },
      ]);
    } finally {
      setBusy(false);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 50);
    }
  };

  const send = () => sendText(input);

  return (
    <KeyboardAvoidingView
      style={[styles.screen, { paddingTop: insets.top + 12 }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={8}
    >
      <View style={styles.header}>
        <BackButton />
        <Title style={{ fontSize: compact ? 20 : 22 }}>
          {compact ? 'ai desk' : 'ai travel desk'}
        </Title>
      </View>
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(m) => m.id}
        contentContainerStyle={styles.list}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        renderItem={({ item }) => (
          <View
            style={[
              styles.bubble,
              item.role === 'user' ? styles.user : styles.assistant,
            ]}
          >
            <Text style={[styles.bubbleText, item.role === 'user' && styles.userText]}>
              {item.content}
            </Text>
          </View>
        )}
      />
      <View style={[styles.composer, { paddingBottom: insets.bottom + 12 }]}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.suggestions}
          keyboardShouldPersistTaps="handled"
        >
          {SUGGESTIONS.map((s) => (
            <Pressable
              key={s}
              onPress={() => {
                setInput(s);
                sendText(s);
              }}
              style={styles.suggestionChip}
            >
              <Text style={styles.suggestionText}>{s}</Text>
            </Pressable>
          ))}
        </ScrollView>
        <TextInput
          value={input}
          onChangeText={(next) => {
            if (next.endsWith('\n') || next.endsWith('\r')) {
              const stripped = next.replace(/[\r\n]+$/, '');
              setInput('');
              sendText(stripped);
              return;
            }
            setInput(next);
          }}
          placeholder={compact ? 'ask anything…' : 'ask about places, visas, or a 3-day plan...'}
          placeholderTextColor={colors.muted}
          style={styles.input}
          multiline
          returnKeyType="send"
          blurOnSubmit={false}
          onSubmitEditing={send}
        />
        {busy ? (
          <ActivityIndicator color={colors.deepNavy} style={{ marginVertical: 8 }} />
        ) : (
          <Button label="send" onPress={send} />
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.mist },
  header: { paddingHorizontal: 20, gap: 10, marginBottom: 8 },
  list: { paddingHorizontal: 20, paddingBottom: 16, gap: 10 },
  bubble: {
    maxWidth: '92%',
    padding: 14,
    borderRadius: 16,
    marginBottom: 4,
  },
  user: {
    alignSelf: 'flex-end',
    backgroundColor: colors.deepNavy,
  },
  assistant: {
    alignSelf: 'flex-start',
    backgroundColor: colors.pureWhite,
    borderWidth: 1,
    borderColor: colors.line,
  },
  bubbleText: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
    lineHeight: 21,
    color: colors.ink,
  },
  userText: { color: colors.pureWhite },
  composer: {
    paddingHorizontal: 20,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    backgroundColor: colors.mist,
    gap: 8,
  },
  suggestions: {
    gap: 8,
    paddingBottom: 4,
  },
  suggestionChip: {
    backgroundColor: colors.pureWhite,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  suggestionText: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 12,
    color: colors.deepNavy,
  },
  input: {
    minHeight: 48,
    maxHeight: 120,
    backgroundColor: colors.pureWhite,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: 'DMSans_400Regular',
    fontSize: 15,
    color: colors.ink,
  },
});
