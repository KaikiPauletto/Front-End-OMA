import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AppButton } from './AppButton';
import { ProductImage } from './ProductImage';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { formatCurrency } from '../utils/formatCurrency';

export function ProductCard({ product, onPress, onAddToCart, layout = 'horizontal' }) {
  const isGrid = layout === 'grid';
  const isCompact = layout === 'compact';

  return (
    <View style={[styles.card, isGrid && styles.gridCard, isCompact && styles.compactCard]}>
      <Pressable onPress={onPress} style={styles.productArea}>
        <View style={[
          styles.artwork,
          isGrid && styles.gridArtwork,
          isCompact && styles.compactArtwork,
          { backgroundColor: product.backdrop || colors.surfaceMuted },
        ]}>
          <ProductImage
            source={product.image}
            style={styles.image}
            fallbackEmoji={product.emoji || '🧉'}
            accessibilityLabel={product.name}
          />
          {product.badge ? (
            <View style={styles.badge}>
              <Text numberOfLines={1} style={styles.badgeText}>{product.badge}</Text>
            </View>
          ) : null}
        </View>
        <View style={[styles.details, isGrid && styles.gridDetails, isCompact && styles.compactDetails]}>
          <Text numberOfLines={2} style={styles.name}>{product.name}</Text>
          <Text style={styles.price}>{formatCurrency(product.price)}</Text>
        </View>
      </Pressable>
      <View style={[
        styles.buttonContainer,
        isGrid && styles.gridButtonContainer,
        isCompact && styles.compactButtonContainer,
      ]}>
        <AppButton
          title="Adicionar"
          icon="bag-add-outline"
          variant="outline"
          size="small"
          onPress={onAddToCart}
          style={styles.addButton}
          textStyle={styles.addButtonText}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 240,
    minHeight: 366,
    backgroundColor: colors.surface,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOpacity: 0.05,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  gridCard: {
    width: '100%',
    minHeight: 0,
    flex: 1,
  },
  compactCard: {
    width: 168,
    minHeight: 0,
  },
  productArea: { flex: 1 },
  artwork: {
    height: 192,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  gridArtwork: { height: 154 },
  compactArtwork: { height: 112 },
  image: { width: '100%', height: '100%' },
  badge: {
    position: 'absolute',
    top: 12,
    left: 10,
    maxWidth: 125,
    backgroundColor: colors.premium,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  badgeText: {
    color: colors.white,
    fontFamily: typography.family.bodyMedium,
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  details: { paddingHorizontal: 16, paddingTop: 15, paddingBottom: 6 },
  gridDetails: { paddingHorizontal: 10, paddingTop: 10, paddingBottom: 4 },
  compactDetails: { paddingHorizontal: 11, paddingTop: 9, paddingBottom: 2 },
  name: {
    minHeight: 42,
    color: colors.ink,
    fontFamily: typography.family.body,
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 18,
  },
  price: {
    color: colors.ink,
    fontFamily: typography.family.bodyMedium,
    fontSize: 13,
    fontWeight: '600',
    marginTop: 7,
  },
  buttonContainer: { paddingHorizontal: 16, paddingBottom: 12, paddingTop: 7 },
  gridButtonContainer: { paddingHorizontal: 10, paddingBottom: 10, paddingTop: 5 },
  compactButtonContainer: { paddingHorizontal: 10, paddingBottom: 9, paddingTop: 4 },
  addButton: { width: '100%', borderRadius: 8, minHeight: 38 },
  addButtonText: { fontSize: 10, fontWeight: '500' },
});
