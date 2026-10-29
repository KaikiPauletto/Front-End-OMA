import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';
import { formatCurrency } from '../utils/formatCurrency';

export function ProductCard({ product, onPress }) {
  return (
    <Pressable onPress={onPress} style={styles.card}>
      <View style={[styles.artwork, { backgroundColor: product.backdrop }]}>
        {product.badge ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{product.badge}</Text>
          </View>
        ) : null}
        <Text style={styles.emoji}>{product.emoji}</Text>
        <Text style={styles.type}>{product.type === 'UNITÁRIO' ? 'PEÇA ÚNICA' : 'DISPONÍVEL'}</Text>
      </View>
      <View style={styles.details}>
        <Text numberOfLines={1} style={styles.name}>{product.name}</Text>
        <Text style={styles.price}>{formatCurrency(product.price)}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 184,
    backgroundColor: colors.surface,
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  artwork: {
    height: 154,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  emoji: { fontSize: 64 },
  badge: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: colors.surface,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 20,
  },
  badgeText: { color: colors.forest, fontSize: 10, fontWeight: '700' },
  type: {
    position: 'absolute',
    bottom: 10,
    color: colors.forest,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.1,
  },
  details: { paddingHorizontal: 13, paddingVertical: 12 },
  name: { color: colors.ink, fontSize: 14, fontWeight: '600' },
  price: { color: colors.forest, fontSize: 15, fontWeight: '800', marginTop: 6 },
});
