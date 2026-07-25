import { Image, StyleSheet, Text, View } from 'react-native';
import { colors } from '../constants/colors';

type Props = {
  size?: number;
  showWordmark?: boolean;
};

export function Logo({ size = 56, showWordmark = true }: Props) {
  return (
    <View style={styles.wrap}>
      <View style={[styles.mark, { width: size, height: size, borderRadius: size * 0.28 }]}>
        <Image
          source={require('../../assets/aseantaplogo.png')}
          style={{ width: size * 0.82, height: size * 0.82 }}
          resizeMode="contain"
        />
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
