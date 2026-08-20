import { StyleSheet, Text, View, type TextProps, type ViewProps } from 'react-native';
import { colors } from '../../constants/colors';

export function Screen({ style, ...props }: ViewProps) {
  return <View style={[styles.screen, style]} {...props} />;
}

export function Title({ style, ...props }: TextProps) {
  return <Text style={[styles.title, style]} {...props} />;
}

export function Body({ style, ...props }: TextProps) {
  return <Text style={[styles.body, style]} {...props} />;
}

export function Muted({ style, ...props }: TextProps) {
  return <Text style={[styles.muted, style]} {...props} />;
}

export function Label({ style, ...props }: TextProps) {
  return <Text style={[styles.label, style]} {...props} />;
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.mist,
  },
  title: {
    fontFamily: 'Fraunces_600SemiBold',
    fontSize: 28,
    color: colors.deepNavy,
    letterSpacing: -0.4,
  },
  body: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 15,
    lineHeight: 22,
    color: colors.ink,
  },
  muted: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    lineHeight: 18,
    color: colors.muted,
  },
  label: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 12,
    letterSpacing: 0.6,
    color: colors.midnightNavy,
  },
});
