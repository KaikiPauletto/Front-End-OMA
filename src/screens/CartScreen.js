import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { EmptyState } from '../components/EmptyState';
import { QuantitySelector } from '../components/QuantitySelector';
import { useCart } from '../contexts/CartContext';
import { colors } from '../theme/colors';
import { formatCurrency } from '../utils/formatCurrency';

export function CartScreen({ navigation }) {
  const { items, subtotal, updateQuantity, removeItem } = useCart();

  function changeQuantity(key, quantity) {
    const result = updateQuantity(key, quantity);
    if (!result.ok) Alert.alert('Quantidade indisponível', result.message);
  }

  if (items.length === 0) {
    return (
      <View style={styles.screen}>
        <Text style={styles.title}>Minha sacola</Text>
        <EmptyState
          icon="bag-handle-outline"
          title="A sacola está esperando"
          description="Encontre aquele item especial para acompanhar teu próximo mate."
        />
        <Pressable onPress={() => navigation.navigate('Início')} style={styles.continueButton}>
          <Text style={styles.continueButtonText}>Explorar produtos</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <Text style={styles.title}>Minha sacola</Text>
        <Text style={styles.subtitle}>{items.length} {items.length === 1 ? 'tipo de produto' : 'tipos de produto'}</Text>

        {items.map((item) => (
          <View key={item.key} style={styles.itemCard}>
            <View style={[styles.productArt, { backgroundColor: item.product.backdrop }]}>
              <Text style={styles.productEmoji}>{item.product.emoji}</Text>
            </View>
            <View style={styles.itemDetails}>
              <View style={styles.itemTitleRow}>
                <Text numberOfLines={1} style={styles.itemName}>{item.product.name}</Text>
                <Pressable
                  accessibilityLabel={`Remover ${item.product.name}`}
                  onPress={() => removeItem(item.key)}
                  hitSlop={8}
                >
                  <Ionicons name="trash-outline" size={17} color={colors.muted} />
                </Pressable>
              </View>
              {item.variant ? <Text style={styles.variantName}>{item.variant.name}</Text> : null}
              <Text style={styles.itemPrice}>{formatCurrency(item.unitPrice)}</Text>
              <View style={styles.quantityRow}>
                {item.product.type === 'UNITÁRIO' ? (
                  <Text style={styles.unitNote}>Peça única · 1 unidade</Text>
                ) : (
                  <QuantitySelector
                    compact
                    value={item.quantity}
                    maximum={item.maximum}
                    onChange={(quantity) => changeQuantity(item.key, quantity)}
                  />
                )}
                <Text style={styles.lineTotal}>{formatCurrency(item.unitPrice * item.quantity)}</Text>
              </View>
            </View>
          </View>
        ))}

        <View style={styles.summary}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal estimado</Text>
            <Text style={styles.summaryValue}>{formatCurrency(subtotal)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Frete</Text>
            <Text style={styles.shippingNote}>Calculado no checkout</Text>
          </View>
          <View style={styles.divider} />
          <Text style={styles.disclaimer}>
            Valores demonstrativos. Preços e disponibilidade serão revalidados pelo sistema.
          </Text>
        </View>
      </ScrollView>
      <View style={styles.bottomBar}>
        <View>
          <Text style={styles.totalLabel}>Subtotal estimado</Text>
          <Text style={styles.total}>{formatCurrency(subtotal)}</Text>
        </View>
        <Pressable onPress={() => navigation.navigate('Checkout')} style={styles.checkoutButton}>
          <Text style={styles.checkoutText}>Continuar</Text>
          <Ionicons name="arrow-forward" size={17} color={colors.white} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas, paddingTop: 20 },
  content: { paddingHorizontal: 22, paddingBottom: 24 },
  title: { color: colors.ink, fontSize: 26, fontWeight: '800', paddingHorizontal: 22 },
  subtitle: { color: colors.muted, fontSize: 12, paddingHorizontal: 22, marginTop: 5, marginBottom: 18 },
  itemCard: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    marginBottom: 11,
  },
  productArt: {
    width: 86,
    height: 100,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  productEmoji: { fontSize: 42 },
  itemDetails: { flex: 1, marginLeft: 12, justifyContent: 'center' },
  itemTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6 },
  itemName: { flex: 1, color: colors.ink, fontSize: 13, fontWeight: '700' },
  variantName: { color: colors.muted, fontSize: 10, marginTop: 3 },
  itemPrice: { color: colors.forest, fontSize: 12, fontWeight: '700', marginTop: 5 },
  quantityRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
  unitNote: { color: colors.muted, fontSize: 10 },
  lineTotal: { color: colors.ink, fontSize: 12, fontWeight: '800' },
  summary: {
    marginTop: 5,
    padding: 17,
    backgroundColor: colors.surface,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: colors.border,
  },
  summaryRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginVertical: 5 },
  summaryLabel: { color: colors.muted, fontSize: 12 },
  summaryValue: { color: colors.ink, fontSize: 13, fontWeight: '700' },
  shippingNote: { color: colors.muted, fontSize: 11 },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 11 },
  disclaimer: { color: colors.muted, fontSize: 10, lineHeight: 15 },
  bottomBar: {
    paddingHorizontal: 22,
    paddingTop: 13,
    paddingBottom: 22,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: { color: colors.muted, fontSize: 10 },
  total: { color: colors.forest, fontSize: 19, fontWeight: '800', marginTop: 2 },
  checkoutButton: {
    minWidth: 147,
    height: 48,
    borderRadius: 15,
    backgroundColor: colors.forest,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
  },
  checkoutText: { color: colors.white, fontSize: 13, fontWeight: '800' },
  continueButton: {
    alignSelf: 'center',
    backgroundColor: colors.forest,
    paddingHorizontal: 22,
    paddingVertical: 14,
    borderRadius: 15,
  },
  continueButtonText: { color: colors.white, fontWeight: '800', fontSize: 13 },
});
