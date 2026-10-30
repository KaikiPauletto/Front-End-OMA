import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';

export function CartAddedBar({ visible, itemCount, onContinue, onClose, bottomOffset = 10 }) {
  const insets = useSafeAreaInsets();
  if (!visible) return null;

  return (
    <View style={[styles.wrapper, { bottom: bottomOffset + insets.bottom }]}>
      <View style={styles.messageRow}>
        <View style={styles.checkCircle}>
          <Ionicons name="checkmark" size={16} color={colors.white} />
        </View>
        <View style={styles.copy}>
          <Text style={styles.title}>Adicionado à sacola</Text>
          <Text style={styles.subtitle}>
            {itemCount} {itemCount === 1 ? 'item na sacola' : 'itens na sacola'}
          </Text>
        </View>
        <Pressable onPress={onClose} accessibilityLabel="Fechar confirmação" hitSlop={9}>
          <Ionicons name="close" size={20} color={colors.muted} />
        </Pressable>
      </View>
      <Pressable style={styles.action} onPress={onContinue} accessibilityRole="button">
        <Text style={styles.actionText}>Seguir para o carrinho</Text>
        <Ionicons name="arrow-forward" size={17} color={colors.white} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 12,
    right: 12,
    padding: 14,
    borderRadius: 15,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOpacity: 0.14,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 5 },
    elevation: 10,
    zIndex: 30,
  },
  messageRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  checkCircle: { width: 29, height: 29, borderRadius: 15, backgroundColor: colors.forest, alignItems: 'center', justifyContent: 'center' },
  copy: { flex: 1, marginLeft: 10 },
  title: { color: colors.ink, fontFamily: typography.family.bodyMedium, fontSize: 13, fontWeight: '700' },
  subtitle: { color: colors.muted, fontSize: 10, marginTop: 2 },
  action: { minHeight: 44, borderRadius: 22, paddingHorizontal: 15, backgroundColor: colors.forest, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  actionText: { color: colors.white, fontFamily: typography.family.bodyMedium, fontSize: 12, fontWeight: '700' },
});
