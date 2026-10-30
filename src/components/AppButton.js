import { Pressable, StyleSheet, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';

export function AppButton({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  icon,
  style,
  textStyle,
  disabled = false,
}) {
  const buttonStyles = [
    styles.button,
    styles[variant],
    styles[size],
    disabled && styles.disabled,
    style,
  ];

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [buttonStyles, pressed && !disabled && styles.pressed]}
    >
      {icon ? (
        <Ionicons
          name={icon}
          size={size === 'small' ? 14 : 16}
          color={variant === 'outline' ? colors.forest : colors.white}
        />
      ) : null}
      <Text style={[styles.label, styles[`${variant}Label`], textStyle]}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 44,
    borderRadius: 8,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primary: { backgroundColor: colors.forest, borderWidth: 1, borderColor: colors.forest },
  outline: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.forest },
  small: { minHeight: 42, paddingHorizontal: 10 },
  medium: { minHeight: 48, paddingHorizontal: 22 },
  label: {
    fontFamily: typography.family.bodyMedium,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.35,
    textTransform: 'uppercase',
  },
  primaryLabel: { color: colors.white },
  outlineLabel: { color: colors.forest },
  disabled: { opacity: 0.5 },
  pressed: { opacity: 0.82 },
});
