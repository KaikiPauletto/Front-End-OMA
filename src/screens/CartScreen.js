import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { EmptyState } from '../components/EmptyState';
import { QuantitySelector } from '../components/QuantitySelector';
import { ProductImage } from '../components/ProductImage';
import { useCart } from '../contexts/CartContext';
import { normalizeNonNegativeInt64 } from '../services/int64.js';
import { colors } from '../theme/colors';
import { formatCurrency } from '../utils/formatCurrency';

function formatQuantity(value) {
  const normalized = normalizeNonNegativeInt64(value);
  return normalized?.replace(/\B(?=(\d{3})+(?!\d))/g, '.') ?? '—';
}

function formatEstimate(value) {
  return typeof value === 'number' && Number.isFinite(value)
    ? formatCurrency(value)
    : 'Não foi possível estimar';
}

function getAvailabilityMessage(item) {
  if (!item.productAvailable) {
    return 'Produto removido do catálogo. Remova-o da sacola para continuar.';
  }
  if (!item.active) {
    return 'Produto desativado. Remova-o da sacola para continuar.';
  }
  if (!item.available) {
    return 'Estoque insuficiente para a quantidade desejada.';
  }
  return '';
}

export function CartScreen({ navigation }) {
  const {
    items,
    subtotal,
    estimateComplete,
    status,
    error,
    isLoading,
    isRefreshing,
    isMutating,
    reconciliationRequired,
    hasCart,
    pendingItemKey,
    refreshCart,
    updateQuantity,
    removeItem,
  } = useCart();
  const [actionError, setActionError] = useState('');

  useFocusEffect(useCallback(() => {
    refreshCart();
  }, [refreshCart]));

  async function changeQuantity(productId, quantity) {
    setActionError('');
    const result = await updateQuantity(productId, quantity);
    if (!result.ok) {
      setActionError(result.message);
    }
  }

  async function handleRemove(item) {
    setActionError('');
    const result = await removeItem(item.productId);
    if (!result.ok) {
      setActionError(result.message);
    }
  }

  async function handleRefresh() {
    setActionError('');
    await refreshCart();
  }

  if (isLoading && !hasCart) {
    return (
      <View style={styles.centeredState}>
        <ActivityIndicator color={colors.forest} />
        <Text style={styles.stateText}>Carregando sua sacola...</Text>
      </View>
    );
  }

  if (!hasCart && status === 'error') {
    return (
      <View style={styles.centeredState}>
        <Ionicons name="cloud-offline-outline" size={38} color={colors.muted} />
        <Text style={styles.stateTitle}>Não foi possível carregar a sacola</Text>
        <Text style={styles.stateText}>{error}</Text>
        <Pressable
          accessibilityRole="button"
          disabled={isRefreshing}
          onPress={handleRefresh}
          style={styles.retryButton}
        >
          <Text style={styles.retryButtonText}>
            {isRefreshing ? 'Atualizando...' : 'Tentar novamente'}
          </Text>
        </Pressable>
      </View>
    );
  }

  const showError = Boolean(actionError || error);
  const canMutate = status === 'ready' && !isMutating && !reconciliationRequired;
  const canContinue = status === 'ready' &&
    !isMutating &&
    estimateComplete &&
    subtotal !== null &&
    items.every((item) => item.productAvailable && item.active && item.available);

  if (hasCart && items.length === 0) {
    return (
      <View style={styles.screen}>
        <Text style={styles.title}>Minha sacola</Text>
        {showError ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{actionError || error}</Text>
            <Pressable accessibilityRole="button" onPress={handleRefresh}>
              <Text style={styles.retryLink}>Tentar novamente</Text>
            </Pressable>
          </View>
        ) : null}
        <EmptyState
          icon="bag-handle-outline"
          title="A sacola está esperando"
          description="Encontre aquele item especial para acompanhar teu próximo mate."
        />
        <Pressable onPress={() => navigation.navigate('Home')} style={styles.continueButton}>
          <Text style={styles.continueButtonText}>Explorar produtos</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <Text style={styles.title}>Minha sacola</Text>
        <Text style={styles.subtitle}>
          {items.length} {items.length === 1 ? 'tipo de produto' : 'tipos de produto'}
          {isRefreshing ? ' · Atualizando' : ''}
        </Text>

        {showError ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{actionError || error}</Text>
            <Pressable accessibilityRole="button" onPress={handleRefresh} disabled={isMutating}>
              <Text style={styles.retryLink}>
                {isMutating ? 'Aguarde...' : 'Atualizar sacola'}
              </Text>
            </Pressable>
          </View>
        ) : null}

        {items.map((item) => {
          const availabilityMessage = getAvailabilityMessage(item);
          const metadata = [item.product.brand, item.product.model].filter(Boolean).join(' · ');
          const itemPending = isMutating && pendingItemKey === item.key;

          return (
            <View key={item.key} style={styles.itemCard}>
              <View style={[styles.productArt, { backgroundColor: colors.surfaceMuted }]}>
                <ProductImage
                  source={item.product.image}
                  style={styles.cartProductImage}
                  fallbackEmoji="🧉"
                  accessibilityLabel={item.product.name || 'Produto'}
                />
              </View>
              <View style={styles.itemDetails}>
                <View style={styles.itemTitleRow}>
                  <Text numberOfLines={2} style={styles.itemName}>
                    {item.product.name || 'Produto removido do catálogo'}
                  </Text>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Remover ${item.product.name || 'produto'}`}
                    disabled={!canMutate}
                    onPress={() => handleRemove(item)}
                    hitSlop={8}
                    style={!canMutate ? styles.disabledAction : null}
                  >
                    {itemPending ? (
                      <ActivityIndicator size="small" color={colors.muted} />
                    ) : (
                      <Ionicons name="trash-outline" size={17} color={colors.muted} />
                    )}
                  </Pressable>
                </View>
                {metadata ? <Text style={styles.metadata}>{metadata}</Text> : null}
                <Text style={styles.typeText}>
                  {item.productType === 'SINGLE_UNIT'
                    ? 'Peça única'
                    : item.productType === 'MULTI_UNIT'
                      ? 'Produto por quantidade'
                      : 'Tipo indisponível'}
                </Text>
                <Text style={styles.itemPrice}>
                  {item.unitPrice === null ? 'Preço indisponível' : formatCurrency(item.unitPrice)}
                </Text>
                {item.productAvailable ? (
                  <View style={styles.stockDetails}>
                    <Text style={styles.stockText}>
                      Físico {formatQuantity(item.quantityOnHand)}
                      {'  ·  '}Reservado {formatQuantity(item.quantityReserved)}
                    </Text>
                    <Text style={styles.stockText}>
                      Disponível {formatQuantity(item.availableQuantity)}
                    </Text>
                  </View>
                ) : null}
                {availabilityMessage ? (
                  <Text style={styles.availabilityError}>{availabilityMessage}</Text>
                ) : null}
                <View style={styles.quantityRow}>
                  {item.productType === 'SINGLE_UNIT' ? (
                    <Text style={styles.unitNote}>1 unidade</Text>
                  ) : item.productType === 'MULTI_UNIT' && item.maximum > 0 &&
                    item.productAvailable && item.active ? (
                    <QuantitySelector
                      compact
                      disabled={!canMutate}
                      value={item.quantity}
                      maximum={item.maximum}
                      onChange={(quantity) => changeQuantity(item.productId, quantity)}
                    />
                  ) : (
                    <Text style={styles.unitNote}>Remova o item para atualizar a sacola.</Text>
                  )}
                  <Text style={styles.lineTotal}>
                    {item.estimatedSubtotal === null
                      ? 'Subtotal indisponível'
                      : formatCurrency(item.estimatedSubtotal)}
                  </Text>
                </View>
              </View>
            </View>
          );
        })}

        <View style={styles.summary}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal estimado</Text>
            <Text style={styles.summaryValue}>
              {estimateComplete ? formatEstimate(subtotal) : 'Não foi possível estimar'}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Frete</Text>
            <Text style={styles.shippingNote}>Calculado no checkout</Text>
          </View>
          <View style={styles.divider} />
          {!estimateComplete ? (
            <Pressable
              accessibilityRole="button"
              disabled={isMutating || isRefreshing}
              onPress={handleRefresh}
            >
              <Text style={styles.retryLink}>
                {isRefreshing ? 'Atualizando estimativa...' : 'Atualizar estimativa'}
              </Text>
            </Pressable>
          ) : null}
          <Text style={styles.disclaimer}>
            Preços e disponibilidade são retornados pelo backend e podem mudar. Esta etapa não cria pedidos nem reserva estoque.
          </Text>
        </View>
      </ScrollView>

      <View style={styles.bottomBar}>
        <View>
          <Text style={styles.totalLabel}>Subtotal estimado</Text>
          <Text style={styles.total}>
            {estimateComplete ? formatEstimate(subtotal) : 'Indisponível'}
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          disabled={!canContinue}
          onPress={() => navigation.navigate('Checkout')}
          style={[styles.checkoutButton, !canContinue && styles.disabledCheckout]}
        >
          <Text style={styles.checkoutText}>Continuar</Text>
          <Ionicons name="arrow-forward" size={17} color={colors.white} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas, paddingTop: 20 },
  centeredState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 26,
    backgroundColor: colors.canvas,
  },
  stateTitle: { color: colors.ink, fontSize: 18, fontWeight: '800', textAlign: 'center', marginTop: 13 },
  stateText: { color: colors.muted, fontSize: 12, lineHeight: 18, textAlign: 'center', marginTop: 9 },
  retryButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: colors.forest,
    marginTop: 17,
  },
  retryButtonText: { color: colors.white, fontWeight: '800', fontSize: 12 },
  content: { paddingHorizontal: 22, paddingBottom: 24 },
  title: { color: colors.ink, fontSize: 26, fontWeight: '800', paddingHorizontal: 22 },
  subtitle: { color: colors.muted, fontSize: 12, paddingHorizontal: 22, marginTop: 5, marginBottom: 18 },
  errorBanner: {
    padding: 12,
    borderRadius: 13,
    backgroundColor: colors.clayLight,
    marginHorizontal: 4,
    marginBottom: 12,
  },
  errorText: { color: colors.danger, fontSize: 11, lineHeight: 16 },
  retryLink: { color: colors.forest, fontSize: 11, fontWeight: '800', marginTop: 7 },
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
    overflow: 'hidden',
  },
  cartProductImage: { width: '100%', height: '100%' },
  itemDetails: { flex: 1, marginLeft: 12, justifyContent: 'center' },
  itemTitleRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 6 },
  itemName: { flex: 1, color: colors.ink, fontSize: 13, fontWeight: '700' },
  metadata: { color: colors.muted, fontSize: 10, marginTop: 3 },
  typeText: { color: colors.mutedStrong, fontSize: 10, marginTop: 4 },
  itemPrice: { color: colors.forest, fontSize: 12, fontWeight: '700', marginTop: 5 },
  stockDetails: { marginTop: 6 },
  stockText: { color: colors.muted, fontSize: 9, lineHeight: 14 },
  availabilityError: { color: colors.danger, fontSize: 10, lineHeight: 14, marginTop: 5 },
  quantityRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 7, marginTop: 8 },
  unitNote: { color: colors.muted, fontSize: 10, flex: 1 },
  lineTotal: { color: colors.ink, fontSize: 11, fontWeight: '800', textAlign: 'right', flexShrink: 1 },
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
  disabledCheckout: { opacity: 0.45 },
  checkoutText: { color: colors.white, fontSize: 13, fontWeight: '800' },
  disabledAction: { opacity: 0.45 },
  continueButton: {
    alignSelf: 'center',
    backgroundColor: colors.forest,
    paddingHorizontal: 22,
    paddingVertical: 14,
    borderRadius: 15,
  },
  continueButtonText: { color: colors.white, fontWeight: '800', fontSize: 13 },
});
