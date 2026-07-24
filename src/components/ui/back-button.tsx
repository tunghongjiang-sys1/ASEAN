import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { colors } from '../../constants/colors';

type Props = {
  label?: string;
  onPress?: () => void;
};

export function BackButton({ label = 'back', onPress }: Props) {
  const router = useRouter();
  return (
    <Pressable
      onPress={onPress || (() => router.back())}
      style={({ pressed }) => [styles.wrap, pressed && { opacity: 0.7 }]}
      hitSlop={8}
    >
      <View style={styles.arrow}>
        <Text style={styles.chevron}>‹</Text>
      </View>
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
  },
  arrow: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.subtleBlue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chevron: {
    fontSize: 22,
    lineHeight: 24,
    color: colors.deepNavy,
    marginTop: -2,
  },
  label: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 14,
    color: colors.midnightNavy,
    textTransform: 'lowercase',
  },
});
