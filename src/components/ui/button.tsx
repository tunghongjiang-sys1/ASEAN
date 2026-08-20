import { Pressable, StyleSheet, Text, type ViewStyle } from 'react-native';
import { colors } from '../../constants/colors';

type Props = {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'asean' | 'hero';
  disabled?: boolean;
  style?: ViewStyle;
};

export function Button({ label, onPress, variant = 'primary', disabled, style }: Props) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        variant === 'primary' && styles.primary,
        variant === 'secondary' && styles.secondary,
        variant === 'ghost' && styles.ghost,
        variant === 'asean' && styles.asean,
        variant === 'hero' && styles.hero,
        pressed && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}
    >
      <Text
        style={[
          styles.label,
          (variant === 'secondary' || variant === 'ghost') && styles.labelDark,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 52,
    paddingHorizontal: 28,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primary: {
    backgroundColor: colors.forestGreen,
  },
  secondary: {
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.forestGreen,
  },
  ghost: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.line,
  },
  asean: {
    backgroundColor: colors.aseanBlue,
  },
  hero: {
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.55)',
  },
  pressed: {
    opacity: 0.88,
    transform: [{ scale: 0.985 }],
  },
  disabled: {
    opacity: 0.45,
  },
  label: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 13,
    letterSpacing: 1.4,
    color: colors.pureWhite,
  },
  labelDark: {
    color: colors.forestGreen,
  },
});
