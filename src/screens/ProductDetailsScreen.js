import { useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { QuantitySelector } from '../components/QuantitySelector';
import { useCart } from '../contexts/CartContext';
import { products } from '../data/products';
import { colors } from '../theme/colors';
import { formatCurrency } from '../utils/formatCurrency';

export function ProductDetailsScreen({ navigation, route }) {
  const product = products.find((item) => item.id === route.params?.productId);
  const [variant, setVariant] = useState(product?.variants?.[0] ?? null);
  const [quantity, setQuantity] = useState(1);
  const { addItem } = useCart();

  if (!product) {
    return (
      <View style={styles.notFound}>
        <Text style={styles.notFoundText}>Produto não encontrado.</Text>
        <Pressable onPress={() => navigation.goBack()}>
          <Text style={styles.backLink}>Voltar</Text>
        </Pressable>
      </View>
    );
  }

  const stock = variant?.stock ?? product.stock;
  const unitPrice = variant?.price ?? product.price;
  const maximum = Math.min(stock, product.maxPurchase ?? stock);

  function handleAdd() {
    const result = addItem(product, variant, quantity);

    if (result?.ok) {
      Alert.alert('Pronto!', 'Produto adicionado à sua sacola.', [
        { text: 'Continuar comprando', style: 'cancel' },
        { text: 'Ver sacola', onPress: () => navigation.navigate('MainTabs', { screen: 'Sacola' }) },
      ]);
    } else {
      Alert.alert('Não foi possível adicionar', result?.message ?? 'Tente novamente.');
    }
  }

  return (
    <View style={styles.screen}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={[styles.artwork, { backgroundColor: product.backdrop }]}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={21} color={colors.forest} />
          </Pressable>
          <Text style={styles.emoji}>{product.emoji}</Text>
          {product.type === 'UNITÁRIO' ? (
            <View style={styles.uniqueTag}>
              <Text style={styles.uniqueText}>PEÇA ÚNICA</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.content}>
          <Text style={styles.category}>{product.category.toUpperCase()}</Text>
          <Text style={styles.name}>{product.name}</Text>
          <Text style={styles.price}>{formatCurrency(unitPrice)}</Text>
          <Text style={styles.description}>{product.description}</Text>

          {product.variants?.length ? (
            <View style={styles.options}>
              <Text style={styles.optionTitle}>Acabamento</Text>
              <View style={styles.variantList}>
                {product.variants.map((item) => {
                  const selected = variant?.id === item.id;
                  return (
                    <Pressable
                      key={item.id}
                      onPress={() => {
                        setVariant(item);
                        setQuantity(1);
                      }}
                      style={[styles.variant, selected && styles.variantSelected]}
                    >
                      <Text style={[styles.variantText, selected && styles.variantTextSelected]}>
                        {item.name}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ) : null}

          <View style={styles.availability}>
            <Ionicons name="checkmark-circle" size={17} color={colors.forestLight} />
            <Text style={styles.availabilityText}>
              {stock > 0 ? 'Disponível para compra' : 'Indisponível no momento'}
            </Text>
          </View>
          <Text style={styles.typeDescription}>
            {product.type === 'UNITÁRIO'
              ? 'Peça individual: quantidade limitada a 1 unidade.'
              : 'Produto por quantidade. Disponibilidade sujeita à confirmação.'}
          </Text>

          {product.type !== 'UNITÁRIO' && stock > 0 ? (
            <View style={styles.quantityRow}>
              <Text style={styles.optionTitle}>Quantidade</Text>
              <QuantitySelector value={quantity} maximum={maximum} onChange={setQuantity} />
            </View>
          ) : null}
        </View>
      </ScrollView>

      <View style={styles.bottomBar}>
        <View>
          <Text style={styles.totalLabel}>Valor demonstrativo</Text>
          <Text style={styles.total}>{formatCurrency(unitPrice * quantity)}</Text>
        </View>
        <Pressable disabled={stock <= 0} onPress={handleAdd} style={[styles.addButton, stock <= 0 && styles.disabledButton]}>
          <Ionicons name="bag-add-outline" size={18} color={colors.white} />
          <Text style={styles.addButtonText}>Adicionar</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas },
  artwork: { height: 330, alignItems: 'center', justifyContent: 'center' },
  backButton: {
    position: 'absolute',
    top: 54,
    left: 20,
    width: 43,
    height: 43,
    borderRadius: 15,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  emoji: { fontSize: 122 },
  uniqueTag: {
    position: 'absolute',
    bottom: 22,
    borderRadius: 20,
    paddingHorizontal: 13,
    paddingVertical: 7,
    backgroundColor: colors.surface,
  },
  uniqueText: { color: colors.forest, fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  content: { padding: 23, paddingBottom: 30 },
  category: { color: colors.clay, fontSize: 10, fontWeight: '800', letterSpacing: 1.3 },
  name: { color: colors.ink, fontSize: 27, fontWeight: '800', marginTop: 7 },
  price: { color: colors.forest, fontSize: 21, fontWeight: '800', marginTop: 8 },
  description: { color: colors.muted, fontSize: 14, lineHeight: 22, marginTop: 13 },
  options: { marginTop: 23 },
  optionTitle: { color: colors.ink, fontSize: 14, fontWeight: '700' },
  variantList: { flexDirection: 'row', gap: 9, marginTop: 11 },
  variant: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 13,
    backgroundColor: colors.surface,
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  variantSelected: { borderColor: colors.forest, backgroundColor: colors.sage },
  variantText: { color: colors.ink, fontSize: 12, fontWeight: '600' },
  variantTextSelected: { color: colors.forest, fontWeight: '800' },
  availability: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 22 },
  availabilityText: { color: colors.forestLight, fontSize: 12, fontWeight: '700' },
  typeDescription: { color: colors.muted, fontSize: 11, marginTop: 6 },
  quantityRow: { marginTop: 21, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  bottomBar: {
    paddingHorizontal: 22,
    paddingTop: 13,
    paddingBottom: 24,
    backgroundColor: colors.surface,
    borderTopColor: colors.border,
    borderTopWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  totalLabel: { color: colors.muted, fontSize: 10 },
  total: { color: colors.forest, fontSize: 19, fontWeight: '800', marginTop: 2 },
  addButton: {
    minWidth: 154,
    height: 49,
    backgroundColor: colors.forest,
    borderRadius: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  disabledButton: { opacity: 0.45 },
  addButtonText: { color: colors.white, fontSize: 13, fontWeight: '800' },
  notFound: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  notFoundText: { color: colors.ink, fontSize: 16, fontWeight: '700' },
  backLink: { color: colors.clay, marginTop: 12, fontWeight: '700' },
});
