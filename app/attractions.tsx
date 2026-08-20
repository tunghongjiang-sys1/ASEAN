import { useRef, useState } from 'react';
import {
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { Redirect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { categories } from '../data';
import { BackButton } from '../src/components/ui/back-button';
import { Button } from '../src/components/ui/button';
import { ScrollPicker } from '../src/components/ui/scroll-picker';
import { colors, getCategoryColor } from '../src/constants/colors';
import { useApp } from '../src/context/app-context';
import type { TravellerProfile } from '../src/types/place';
import { titleCase } from '../src/utils/text';

type Step = 0 | 1 | 2 | 3;

const TRANSPORT_OPTIONS = [
  { key: 'car', label: 'Car / Private Driver', icon: '🚗' },
  { key: 'scooter', label: 'Motorcycle / Scooter', icon: '🛵' },
  { key: 'walk', label: 'Walking / Bicycle', icon: '🚶' },
  { key: 'public', label: 'Public Transport', icon: '🚌' },
];

const COMMON_ALLERGENS = [
  'shellfish and crustaceans',
  'fish',
  'tree nuts and seeds',
  'gluten / wheat',
  'soy',
  'alliums (garlic, onion, shallots)',
  'spicy foods',
];

const categoryList = (categories as string[]).slice().sort();

export default function AttractionsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const compact = width < 420;
  const wide = width >= 900;
  const { auth, preferences, setPreferences, setTravellerProfile, travellerProfile } = useApp();

  const savedAllergies = (travellerProfile?.foodAllergies ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const [step, setStep] = useState<Step>(0);
  const [solo, setSolo] = useState(travellerProfile?.mode !== 'group');
  const [groupSize, setGroupSize] = useState(travellerProfile?.groupSize ?? 2);
  const [hasElderly, setHasElderly] = useState(travellerProfile?.hasElderly ?? false);
  const [hasChildren, setHasChildren] = useState(travellerProfile?.hasChildren ?? false);
  const [specialNeeds, setSpecialNeeds] = useState(travellerProfile?.specialNeeds ?? '');
  const [transport, setTransport] = useState(travellerProfile?.transportPreference ?? '');
  const [allergies, setAllergies] = useState(
    savedAllergies.filter((a) => !COMMON_ALLERGENS.includes(a)).join(', ')
  );
  const [selectedAllergens, setSelectedAllergens] = useState<string[]>(
    savedAllergies.filter((a) => COMMON_ALLERGENS.includes(a))
  );
  const [selectedCategories, setSelectedCategories] = useState<string[]>(preferences);

  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  if (!auth) return <Redirect href="/welcome" />;

  const animateStep = (next: Step) => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 0, duration: 180, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: -20, duration: 180, useNativeDriver: true }),
    ]).start(() => {
      setStep(next);
      slideAnim.setValue(20);
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start();
    });
  };

  const goNext = () => {
    if (step < 3) animateStep((step + 1) as Step);
  };
  const goBack = () => {
    if (step > 0) animateStep((step - 1) as Step);
  };

  const finish = () => {
    setPreferences(selectedCategories);
    const profile: TravellerProfile = {
      mode: solo ? 'solo' : 'group',
      groupSize: solo ? undefined : groupSize,
      hasElderly: solo ? undefined : hasElderly,
      hasChildren: solo ? undefined : hasChildren,
      specialNeeds: specialNeeds.trim() || undefined,
      transportPreference: transport || undefined,
      foodAllergies:
        [allergies.trim(), ...selectedAllergens].filter(Boolean).join(', ') || undefined,
      placeTypes: selectedCategories.length ? selectedCategories : undefined,
    };
    setTravellerProfile(profile);
    router.push('/location');
  };

  const progress = ((step + 1) / 4) * 100;

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 16 }]}>
      <View style={styles.header}>
        <BackButton />
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progress}%` }]} />
        </View>
        <Text style={styles.stepLabel}>{step + 1} of 4</Text>
      </View>

      <Animated.View
        style={[
          styles.body,
          {
            opacity: fadeAnim,
            transform: [{ translateX: slideAnim }],
            maxWidth: wide ? 720 : undefined,
            alignSelf: wide ? 'center' : undefined,
            width: '100%',
          },
        ]}
      >
        {step === 0 && (
          <ScrollView contentContainerStyle={styles.question} showsVerticalScrollIndicator={false}>
            <Text style={[styles.qTitle, { fontSize: compact ? 30 : wide ? 48 : 36 }]}>
              Are you travelling solo or in a group?
            </Text>
            ‎ // empty space
            <View style={styles.toggleRow}>
              <Pressable
                onPress={() => setSolo(true)}
                style={[styles.toggleChip, solo && styles.toggleChipOn]}
              >
                <Text style={[styles.toggleText, solo && styles.toggleTextOn]}>🧍 solo</Text>
              </Pressable>
              <Pressable
                onPress={() => setSolo(false)}
                style={[styles.toggleChip, !solo && styles.toggleChipOn]}
              >
                <Text style={[styles.toggleText, !solo && styles.toggleTextOn]}>👥 group</Text>
              </Pressable>
            </View>

            {!solo && (
              <View style={styles.groupSection}>
                <Text style={styles.groupLabel}>How many travellers?</Text>
                <ScrollPicker min={2} max={500} value={groupSize} onValueChange={setGroupSize} />

                <View style={styles.checkRow}>
                  <Pressable
                    onPress={() => setHasElderly(!hasElderly)}
                    style={[styles.checkChip, hasElderly && styles.checkChipOn]}
                  >
                    <Text style={[styles.checkText, hasElderly && styles.checkTextOn]}>
                      {hasElderly ? '☑' : '☐'} elderly
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => setHasChildren(!hasChildren)}
                    style={[styles.checkChip, hasChildren && styles.checkChipOn]}
                  >
                    <Text style={[styles.checkText, hasChildren && styles.checkTextOn]}>
                      {hasChildren ? '☑' : '☐'} children
                    </Text>
                  </Pressable>
                </View>

                <Text style={styles.groupLabel}>
                  Special needs or accessibility requirements?
                </Text>
                <TextInput
                  value={specialNeeds}
                  onChangeText={setSpecialNeeds}
                  placeholder="e.g. wheelchair, dietary, medical…"
                  placeholderTextColor={colors.muted}
                  style={styles.textInput}
                  multiline
                />
              </View>
            )}
          </ScrollView>
        )}

        {step === 1 && (
          <ScrollView contentContainerStyle={styles.question} showsVerticalScrollIndicator={false}>
            <Text style={[styles.qTitle, { fontSize: compact ? 28 : wide ? 48 : 36 }]}>
              How do you prefer{'\n'}to get around?
            </Text>
            <Text style={styles.qSub}>Pick One Transport Mode</Text>
            <View style={styles.transportGrid}>
              {TRANSPORT_OPTIONS.map((opt) => (
                <Pressable
                  key={opt.key}
                  onPress={() => setTransport(opt.key)}
                  style={[styles.transportCard, transport === opt.key && styles.transportCardOn]}
                >
                  <Text style={styles.transportIcon}>{opt.icon}</Text>
                  <Text
                    style={[
                      styles.transportLabel,
                      transport === opt.key && styles.transportLabelOn,
                    ]}
                  >
                    {opt.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>
        )}

        {step === 2 && (
          <ScrollView contentContainerStyle={styles.question} showsVerticalScrollIndicator={false}>
            <Text style={[styles.qTitle, { fontSize: compact ? 26 : wide ? 48 : 34 }]}>
              Any food allergies{'\n'}or dietary needs?
            </Text>
            <Text style={styles.qSub}>Add Your Own Or Tap Common Allergens</Text>
            <TextInput
              value={allergies}
              onChangeText={setAllergies}
              placeholder="type any allergies or dietary needs…"
              placeholderTextColor={colors.muted}
              style={styles.textInput}
            />
            <View style={styles.chips}>
              {COMMON_ALLERGENS.map((a) => (
                <Pressable
                  key={a}
                  onPress={() =>
                    setSelectedAllergens((prev) =>
                      prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a]
                    )
                  }
                  style={[styles.chip, selectedAllergens.includes(a) && styles.chipOn]}
                >
                  <Text style={[styles.chipText, selectedAllergens.includes(a) && styles.chipTextOn]}>
                    {a}
                  </Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>
        )}

        {step === 3 && (
          <ScrollView contentContainerStyle={styles.question} showsVerticalScrollIndicator={false}>
            <Text style={[styles.qTitle, { fontSize: compact ? 26 : wide ? 48 : 34 }]}>
              What kind of places{'\n'}do you want to visit?
            </Text>
            <Text style={styles.qSub}>Select All That Apply</Text>
            <View style={styles.chips}>
              {categoryList.map((c) => {
                const accent = getCategoryColor(c);
                const sel = selectedCategories.includes(c);
                return (
                  <Pressable
                    key={c}
                    onPress={() =>
                      setSelectedCategories((prev) =>
                        prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]
                      )
                    }
                    style={[styles.placeChip, sel && { backgroundColor: accent, borderColor: accent }]}
                  >
                    <Text style={[styles.placeChipText, sel && { color: colors.pureWhite }]}>
                      {titleCase(c)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>
        )}
      </Animated.View>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 14 }]}>
        {step > 0 && <Button label="back" variant="ghost" onPress={goBack} />}
        {step < 3 ? (
          <Button label="next" onPress={goNext} style={{ flex: 1 }} />
        ) : (
          <Button
            label={
              selectedCategories.length
                ? `finish · ${selectedCategories.length} types`
                : 'finish · all types'
            }
            onPress={finish}
            style={{ flex: 1 }}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  header: {
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  progressBar: {
    flex: 1,
    height: 4,
    backgroundColor: colors.line,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.forestGreen,
    borderRadius: 2,
  },
  stepLabel: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 12,
    color: colors.muted,
    letterSpacing: 0.6,
  },
  body: {
    flex: 1,
    paddingHorizontal: 20,
  },
  question: {
    paddingTop: 28,
    paddingBottom: 32,
    gap: 22,
  },
  qTitle: {
    fontFamily: 'Fraunces_600SemiBold',
    color: colors.forestGreen,
    letterSpacing: -0.5,
    lineHeight: 1.15,
  },
  qSub: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 12,
    letterSpacing: 1.4,
    color: colors.forestGreen,
    marginBottom: 6,
    marginTop: -6,
  },
  toggleRow: {
    flexDirection: 'row',
    gap: 12,
  },
  toggleChip: {
    flex: 1,
    paddingVertical: 18,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: colors.line,
    backgroundColor: colors.pureWhite,
    alignItems: 'center',
  },
  toggleChipOn: {
    borderColor: colors.forestGreen,
    backgroundColor: colors.forestGreen,
  },
  toggleText: {
    fontFamily: 'Fraunces_600SemiBold',
    fontSize: 20,
    color: colors.midnightNavy,
  },
  toggleTextOn: {
    color: colors.pureWhite,
  },
  groupSection: {
    gap: 18,
    marginTop: 8,
  },
  groupLabel: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 13,
    color: colors.forestGreen,
    letterSpacing: 0.6,
  },
  checkRow: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
  },
  checkChip: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.pureWhite,
  },
  checkChipOn: {
    borderColor: colors.forestGreen,
    backgroundColor: colors.forestGreen,
  },
  checkText: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 14,
    color: colors.midnightNavy,
  },
  checkTextOn: {
    color: colors.pureWhite,
  },
  textInput: {
    backgroundColor: colors.pureWhite,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontFamily: 'DMSans_400Regular',
    fontSize: 15,
    color: colors.ink,
    minHeight: 52,
  },
  transportGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  transportCard: {
    width: '47%',
    paddingVertical: 28,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: colors.line,
    backgroundColor: colors.pureWhite,
    alignItems: 'center',
    gap: 10,
  },
  transportCardOn: {
    borderColor: colors.forestGreen,
    backgroundColor: colors.forestGreen,
  },
  transportIcon: {
    fontSize: 36,
  },
  transportLabel: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 14,
    color: colors.midnightNavy,
    textAlign: 'center',
  },
  transportLabelOn: {
    color: colors.pureWhite,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.pureWhite,
  },
  chipOn: {
    borderColor: colors.aseanRed,
    backgroundColor: colors.aseanRed,
  },
  chipText: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 13,
    color: colors.midnightNavy,
  },
  chipTextOn: {
    color: colors.pureWhite,
  },
  placeChip: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.pureWhite,
  },
  placeChipText: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 13,
    color: colors.midnightNavy,
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 14,
    flexDirection: 'row',
    gap: 12,
  },
});
