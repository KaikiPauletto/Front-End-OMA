import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

export function QuantitySelector({ value, maximum, onChange, compact = false }) {
  return (
    <View style={[styles.container, compact && styles.compact]}>
      <Pressable
        accessibilityLabel="Diminuir quantidade"
        disabled={value <= 1}
        onPress={() => onChange(value - 1)}
        style={styles.button}
      >
        <Ionicons color={value <= 1 ? colors.border : colors.forest} name="remove" size={17} />
      </Pressable>
      <Text style={styles.value}>{value}</Text>
      <Pressable
        accessibilityLabel="Aumentar quantidade"
        disabled={value >= maximum}
        onPress={() => onChange(value + 1)}
        style={styles.button}
      >
        <Ionicons color={value >= maximum ? colors.border : colors.forest} name="add" size={17} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 15,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  compact: { height: 38 },
  button: { width: 38, height: '100%', alignItems: 'center', justifyContent: 'center' },
  value: { minWidth: 27, color: colors.ink, textAlign: 'center', fontWeight: '700' },
});
