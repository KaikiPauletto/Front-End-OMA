import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { QuantitySelector } from '../components/QuantitySelector';
import { CartAddedBar } from '../components/CartAddedBar';
import { ProductImage } from '../components/ProductImage';
import { ProductCard } from '../components/ProductCard';
import { ProductAdminActions } from '../components/ProductAdminActions';
import { ProductDeactivationModal } from '../components/ProductDeactivationModal';
import { ProductEditModal } from '../components/ProductEditModal';
import { SectionTitle } from '../components/SectionTitle';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import { useProductCatalog } from '../contexts/ProductCatalogContext';
import { useSellerProducts } from '../contexts/SellerProductsContext';
import {
  getAvailableProducts,
  getMaximumPurchase,
  getProductPrice,
  getProductStock,
} from '../data/products';
import { getCategoryLabel } from '../data/categories';
import {
  getProductById,
  updateProduct as updateRemoteProduct,
} from '../services/productService';
import { colors } from '../theme/colors';
import { formatCurrency } from '../utils/formatCurrency';

export function ProductDetailsScreen({ navigation, route }) {
  const { user, token } = useAuth();
  const isAdministrator = user?.role === 'ADMINISTRADOR';
  const { products: catalogProducts, updateProduct: updateCatalogProduct } = useProductCatalog();
  const { products: sellerProducts, updateProduct: updateSellerProduct } = useSellerProducts();
  const productId = route.params?.productId;
  const catalogProduct = catalogProducts.find((item) => item.id === productId);
  const sellerProduct = sellerProducts.find((item) => item.id === productId);
  const [apiProduct, setApiProduct] = useState(null);
  const [apiLoading, setApiLoading] = useState(false);
  const [apiError, setApiError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const remoteProduct = apiProduct?.id === String(productId) ? apiProduct : null;
  const product = catalogProduct ?? sellerProduct ?? remoteProduct;
  const isRemoteProduct = !catalogProduct && !sellerProduct;
  const isSellerProduct = !catalogProduct && Boolean(sellerProduct);
  const [variantId, setVariantId] = useState(product?.variants?.[0]?.id ?? null);
  const [quantity, setQuantity] = useState(1);
  const [cartConfirmationVisible, setCartConfirmationVisible] = useState(
    Boolean(route.params?.justAdded) && !isAdministrator,
  );
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [deactivationModalVisible, setDeactivationModalVisible] = useState(false);
  const [productStatusError, setProductStatusError] = useState('');
  const { addItem, itemCount } = useCart();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    let active = true;
    if (catalogProduct || sellerProduct || productId === undefined || productId === null) {
      setApiProduct(null);
      setApiError('');
      setApiLoading(false);
      return () => {
        active = false;
      };
    }

    setApiProduct(null);
    setApiError('');
    setApiLoading(true);
    getProductById(productId)
      .then((result) => {
        if (active) {
          setApiProduct(result);
        }
      })
      .catch((loadError) => {
        if (active) {
          setApiError(loadError instanceof Error ? loadError.message : 'Não foi possível carregar o produto.');
        }
      })
      .finally(() => {
        if (active) {
          setApiLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [productId, catalogProduct?.id, sellerProduct?.id, reloadKey]);

  const variant = product?.variants?.find((item) => item.id === variantId)
    ?? product?.variants?.[0]
    ?? null;
  const availableProducts = useMemo(
    () => (isRemoteProduct ? [] : getAvailableProducts(catalogProducts)),
    [catalogProducts, isRemoteProduct],
  );
  const similarProducts = useMemo(
    () => availableProducts
      .filter((item) => item.id !== product?.id && item.category === product?.category)
      .slice(0, 20),
    [availableProducts, product?.category, product?.id],
  );
  const otherProducts = useMemo(
    () => availableProducts
      .filter((item) => item.category !== product?.category)
      .slice(0, 20),
    [availableProducts, product?.category],
  );

  useEffect(() => {
    setVariantId(product?.variants?.[0]?.id ?? null);
    setQuantity(1);
    setCartConfirmationVisible(Boolean(route.params?.justAdded) && !isAdministrator);
  }, [product?.id, route.params?.justAdded, isAdministrator]);

  useEffect(() => {
    if (isAdministrator && route.params?.editOnOpen) {
      setEditModalVisible(true);
      navigation.setParams({ editOnOpen: false });
    }
  }, [isAdministrator, navigation, route.params?.editOnOpen]);

  if (
    isRemoteProduct &&
    productId !== undefined &&
    productId !== null &&
    !remoteProduct
  ) {
    return (
      <View style={styles.notFound}>
        {apiLoading || !apiError ? (
          <>
            <ActivityIndicator color={colors.forest} />
            <Text style={styles.stateText}>Carregando produto...</Text>
          </>
        ) : (
          <>
            <Text style={styles.notFoundText}>Não foi possível carregar o produto.</Text>
            <Text style={styles.stateText}>{apiError}</Text>
            <Pressable onPress={() => setReloadKey((key) => key + 1)}>
              <Text style={styles.backLink}>Tentar novamente</Text>
            </Pressable>
          </>
        )}
        <Pressable onPress={() => navigation.goBack()}>
          <Text style={styles.backLink}>Voltar</Text>
        </Pressable>
      </View>
    );
  }

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

  const stock = getProductStock(product, variant);
  const unitPrice = getProductPrice(product, variant);
  const maximum = getMaximumPurchase(product, variant);

  function handleAdd() {
    const result = addItem(product, variant, quantity);

    if (result?.ok) {
      setCartConfirmationVisible(true);
    } else {
      Alert.alert('Não foi possível adicionar', result?.message ?? 'Tente novamente.');
    }
  }

  async function handleSaveEdits(editedProduct) {
    if (isRemoteProduct) {
      await updateRemoteProduct(product.id, editedProduct, token);
      setEditModalVisible(false);
      setCartConfirmationVisible(false);
      setReloadKey((key) => key + 1);
      return;
    }

    const updates = { ...editedProduct };
    if (product.variants?.length && variant) {
      updates.variants = product.variants.map((item) => (
        item.id === variant.id ? { ...item, price: editedProduct.price } : item
      ));
    }

    const updateProduct = isSellerProduct ? updateSellerProduct : updateCatalogProduct;
    if (!updateProduct(product.id, updates)) {
      throw new Error('O produto não foi encontrado no catálogo.');
    }

    setEditModalVisible(false);
    setCartConfirmationVisible(false);
  }

  function updateProductStatus(active) {
    const updateProduct = isSellerProduct ? updateSellerProduct : updateCatalogProduct;
    if (!updateProduct(product.id, { active })) {
      setProductStatusError('Não foi possível atualizar o produto. Tente novamente.');
      return false;
    }

    setProductStatusError('');
    setCartConfirmationVisible(false);
    return true;
  }

  function toggleProductStatus() {
    if (product.active === false) {
      updateProductStatus(true);
      return;
    }

    setProductStatusError('');
    setDeactivationModalVisible(true);
  }

  function confirmProductDeactivation() {
    if (!updateProductStatus(false)) {
      return false;
    }

    setDeactivationModalVisible(false);
    return true;
  }

  function handleAddRecommendation(recommendedProduct) {
    const result = addItem(recommendedProduct);
    if (result?.ok) {
      setCartConfirmationVisible(true);
    } else {
      Alert.alert('Não foi possível adicionar', result?.message ?? 'Tente novamente.');
    }
  }

  function openProduct(recommendedProduct) {
    navigation.navigate('ProductDetails', { productId: recommendedProduct.id });
  }

  function openProductEditor(recommendedProduct) {
    navigation.navigate('ProductDetails', {
      productId: recommendedProduct.id,
      editOnOpen: true,
    });
  }

  return (
    <View style={styles.screen}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={[styles.artwork, { backgroundColor: product.backdrop || colors.surfaceMuted }]}>
          <ProductImage
            source={product.image}
            style={styles.productImage}
            fallbackEmoji={product.emoji || '🧉'}
            accessibilityLabel={product.name}
          />
          <Pressable onPress={() => navigation.goBack()} style={[styles.backButton, { top: insets.top + 12 }]}>
            <Ionicons name="arrow-back" size={21} color={colors.forest} />
          </Pressable>
          {product.type === 'UNITÁRIO' ? (
            <View style={styles.uniqueTag}>
              <Text style={styles.uniqueText}>PEÇA ÚNICA</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.content}>
          <Text style={styles.category}>
            {(product.categoryName || getCategoryLabel(product.category)).toUpperCase()}
          </Text>
          <Text style={styles.name}>{product.name}</Text>
          {product.brand || product.model ? (
            <Text style={styles.metadata}>
              {[product.brand, product.model].filter(Boolean).join(' · ')}
            </Text>
          ) : null}
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
                        setVariantId(item.id);
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

          {isRemoteProduct ? (
            <View style={styles.availability}>
              <Ionicons name="checkmark-circle" size={17} color={colors.forestLight} />
              <Text style={styles.availabilityText}>Produto ativo no catálogo</Text>
            </View>
          ) : (
            <View style={styles.availability}>
              <Ionicons
                name={product.active === false ? 'close-circle' : 'checkmark-circle'}
                size={17}
                color={product.active === false ? colors.danger : colors.forestLight}
              />
              <Text style={styles.availabilityText}>
                {product.active === false
                  ? 'Produto desativado'
                  : stock > 0
                  ? (isAdministrator ? 'Produto disponível' : 'Disponível para compra')
                  : 'Indisponível no momento'}
              </Text>
            </View>
          )}
          <Text style={styles.typeDescription}>
            {product.type === 'UNITÁRIO'
              ? 'Peça individual: quantidade limitada a 1 unidade.'
              : 'Produto por quantidade. Disponibilidade sujeita à confirmação.'}
          </Text>

          {!isRemoteProduct && !isAdministrator && product.type !== 'UNITÁRIO' && stock > 0 ? (
            <View style={styles.quantityRow}>
              <Text style={styles.optionTitle}>Quantidade</Text>
              <QuantitySelector value={quantity} maximum={maximum} onChange={setQuantity} />
            </View>
          ) : null}
        </View>

        {!isRemoteProduct && similarProducts.length > 0 ? (
          <View style={styles.recommendationSection}>
            <SectionTitle title="Produtos parecidos" />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.recommendationList}
            >
              {similarProducts.map((item) => (
                <ProductCard
                  key={item.id}
                  product={item}
                  layout="compact"
                  onPress={() => openProduct(item)}
                  onAddToCart={() => handleAddRecommendation(item)}
                  onEdit={() => openProductEditor(item)}
                />
              ))}
            </ScrollView>
          </View>
        ) : null}

        {!isRemoteProduct && otherProducts.length > 0 ? (
          <View style={styles.recommendationSection}>
            <SectionTitle title="Você também pode gostar" />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.recommendationList}
            >
              {otherProducts.map((item) => (
                <ProductCard
                  key={item.id}
                  product={item}
                  layout="compact"
                  onPress={() => openProduct(item)}
                  onAddToCart={() => handleAddRecommendation(item)}
                  onEdit={() => openProductEditor(item)}
                />
              ))}
            </ScrollView>
          </View>
        ) : null}
      </ScrollView>

      {isAdministrator ? (
        <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 14) }]}>
          <ProductAdminActions
            active={product.active !== false}
            error={productStatusError}
            onEdit={() => setEditModalVisible(true)}
            onToggleActive={toggleProductStatus}
            showToggle={!isRemoteProduct}
          />
        </View>
      ) : !isRemoteProduct && !cartConfirmationVisible ? (
        <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 14) }]}>
          <View>
            <Text style={styles.totalLabel}>Valor demonstrativo</Text>
            <Text style={styles.total}>{formatCurrency(unitPrice * quantity)}</Text>
          </View>
          <Pressable disabled={stock <= 0} onPress={handleAdd} style={[styles.addButton, stock <= 0 && styles.disabledButton]}>
            <Ionicons name="bag-add-outline" size={18} color={colors.white} />
            <Text style={styles.addButtonText}>Adicionar ao carrinho</Text>
          </Pressable>
        </View>
      ) : null}
      {!isRemoteProduct && !isAdministrator ? (
        <CartAddedBar
          visible={cartConfirmationVisible}
          itemCount={itemCount}
          onClose={() => setCartConfirmationVisible(false)}
          onContinue={() => { setCartConfirmationVisible(false); navigation.navigate('MainTabs', { screen: 'Carrinho' }); }}
        />
      ) : null}
      {isAdministrator ? (
        <ProductEditModal
          visible={editModalVisible}
          product={product}
          price={isRemoteProduct ? (product.originalPrice ?? unitPrice) : unitPrice}
          currency={product.currency || 'BRL'}
          remote={isRemoteProduct}
          onClose={() => setEditModalVisible(false)}
          onSave={handleSaveEdits}
        />
      ) : null}
      {!isRemoteProduct ? (
        <>
          <ProductDeactivationModal
            visible={deactivationModalVisible}
            onCancel={() => setDeactivationModalVisible(false)}
            onConfirm={confirmProductDeactivation}
          />
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas },
  artwork: { height: 330, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  productImage: { width: '100%', height: '100%' },
  backButton: {
    position: 'absolute',
    top: 12,
    left: 20,
    width: 43,
    height: 43,
    borderRadius: 15,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  uniqueTag: {
    position: 'absolute',
    bottom: 22,
    borderRadius: 20,
    paddingHorizontal: 13,
    paddingVertical: 7,
    backgroundColor: colors.surface,
  },
  uniqueText: { color: colors.forest, fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  content: { padding: 18, paddingBottom: 30 },
  category: { color: colors.clay, fontSize: 10, fontWeight: '800', letterSpacing: 1.3 },
  name: { color: colors.ink, fontSize: 27, fontWeight: '800', marginTop: 7 },
  metadata: { color: colors.muted, fontSize: 12, marginTop: 6 },
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
  recommendationSection: { marginTop: 24, marginBottom: 8 },
  recommendationList: { paddingHorizontal: 18, gap: 12, paddingBottom: 8 },
  bottomBar: {
    paddingHorizontal: 18,
    paddingTop: 13,
    paddingBottom: 14,
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
    minWidth: 168,
    height: 49,
    backgroundColor: colors.forest,
    borderRadius: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  disabledButton: { opacity: 0.45 },
  addButtonText: { color: colors.white, fontSize: 11, fontWeight: '800' },
  notFound: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  notFoundText: { color: colors.ink, fontSize: 16, fontWeight: '700' },
  stateText: { color: colors.muted, fontSize: 12, textAlign: 'center', marginTop: 10, paddingHorizontal: 24 },
  backLink: { color: colors.clay, marginTop: 12, fontWeight: '700' },
});
