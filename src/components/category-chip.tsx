import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, getCategoryColor } from '../constants/colors';

type Props = {
  label: string;
  selected?: boolean;
  onPress?: () => void;
};

export function CategoryChip({ label, selected, onPress }: Props) {
  const accent = getCategoryColor(label);
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        selected && styles.chipOn,
        pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] },
      ]}
    >
      <View style={[styles.dot, { backgroundColor: selected ? colors.aseanYellow : accent }]} />
      <Text style={[styles.text, selected && styles.textOn]}>{label.toLowerCase()}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 11,
    paddingHorizontal: 16,
    borderRadius: 999,
    backgroundColor: colors.pureWhite,
    borderWidth: 1,
    borderColor: colors.forestGreen,
  },
  chipOn: {
    backgroundColor: colors.forestGreen,
    borderColor: colors.forestGreen,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  text: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 13,
    color: colors.forestGreen,
    maxWidth: 240,
  },
  textOn: {
    color: colors.pureWhite,
  },
});
