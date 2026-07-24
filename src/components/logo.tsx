import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { colors } from '../constants/colors';

type Props = {
  size?: number;
  showWordmark?: boolean;
};

export function Logo({ size = 56, showWordmark = true }: Props) {
  return (
    <View style={styles.wrap}>
      <View style={[styles.mark, { width: size, height: size, borderRadius: size * 0.28 }]}>
        <Svg width={size * 0.62} height={size * 0.62} viewBox="0 0 64 64">
          <Circle cx="32" cy="32" r="28" fill={colors.aseanBlue} />
          <Path
            d="M10 34c8-2 14 4 22 2s14-8 22-4"
            stroke={colors.aseanYellow}
            strokeWidth="3"
            fill="none"
          />
          <Path
            d="M12 24c10 2 16-6 24-4s14 8 18 4"
            stroke={colors.pureWhite}
            strokeWidth="2.5"
            fill="none"
            opacity="0.9"
          />
          <Rect x="28" y="14" width="8" height="8" rx="2" fill={colors.aseanRed} />
        </Svg>
      </View>
      {showWordmark ? (
        <View>
          <Text style={styles.brand}>asean routes</Text>
          <Text style={styles.tag}>your southeast asia desk</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  mark: {
    backgroundColor: colors.warmCream,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.line,
  },
  brand: {
    fontFamily: 'Fraunces_600SemiBold',
    fontSize: 22,
    color: colors.deepNavy,
    letterSpacing: -0.3,
  },
  tag: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 12,
    color: colors.muted,
    marginTop: 2,
  },
});
