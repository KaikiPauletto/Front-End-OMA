import { useEffect, useMemo, useRef, useState } from 'react';
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
  getProductPrice,
} from '../data/products';
import { getCategoryLabel } from '../data/categories';
import { ApiError } from '../services/apiClient';
import {
  getProductInventory,
  InvalidInventoryResponseError,
} from '../services/inventoryService';
import { normalizeNonNegativeInt64 } from '../services/int64';
import {
  getAdminProductById,
  getProductById,
  setProductActive as setRemoteProductActive,
  updateProduct as updateRemoteProduct,
} from '../services/productService';
import { colors } from '../theme/colors';
import { formatCurrency } from '../utils/formatCurrency';

function formatInventoryQuantity(value) {
  const normalized = normalizeNonNegativeInt64(value);
  return normalized?.replace(/\B(?=(\d{3})+(?!\d))/g, '.') ?? '—';
}

function formatInventoryTimestamp(value) {
  const timestamp = new Date(value);
  return Number.isNaN(timestamp.getTime())
    ? ''
    : timestamp.toLocaleString('pt-BR');
}

function getInventoryErrorMessage(error) {
  if (error instanceof ApiError) {
    if (error.status === 404) {
      return 'Estoque ainda não registrado para este produto.';
    }
    if (error.status === 401) {
      return 'Sua sessão de administrador expirou. Entre novamente para consultar o estoque.';
    }
    if (error.status === 403) {
      return 'Sua conta não tem autorização para consultar este estoque.';
    }
    return `Não foi possível carregar o estoque (HTTP ${error.status}).`;
  }

  if (error instanceof InvalidInventoryResponseError) {
    return 'A API retornou dados de estoque inválidos ou incompatíveis.';
  }

  if (
    error instanceof Error &&
    (error.message.startsWith('API não configurada.') ||
      error.message.startsWith('Sua sessão não está válida.'))
  ) {
    return error.message;
  }

  return 'Falha de comunicação ao carregar o estoque. Verifique a conexão e tente novamente.';
}

export function ProductDetailsScreen({ navigation, route }) {
  const { user, token } = useAuth();
  const isAdministrator = user?.role === 'ADMINISTRADOR';
  const isCustomer = user?.role === 'CLIENTE';
  const isAdminOrigin = isAdministrator && route.params?.source === 'admin';
  const { products: catalogProducts, updateProduct: updateCatalogProduct } = useProductCatalog();
  const { products: sellerProducts, updateProduct: updateSellerProduct } = useSellerProducts();
  const productId = route.params?.productId;
  const catalogProduct = isAdminOrigin
    ? null
    : catalogProducts.find((item) => item.id === productId);
  const sellerProduct = isAdminOrigin
    ? null
    : sellerProducts.find((item) => item.id === productId);
  const [apiProduct, setApiProduct] = useState(null);
  const [apiProductAdminOrigin, setApiProductAdminOrigin] = useState(false);
  const [apiLoading, setApiLoading] = useState(false);
  const [apiError, setApiError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [inventoryState, setInventoryState] = useState(null);
  const [inventoryReloadKey, setInventoryReloadKey] = useState(0);
  const remoteProduct = apiProduct?.id === String(productId) &&
    apiProductAdminOrigin === isAdminOrigin
    ? apiProduct
    : null;
  const product = catalogProduct ?? sellerProduct ?? remoteProduct;
  const isRemoteProduct = isAdminOrigin || (!catalogProduct && !sellerProduct);
  const isPublicApiProduct = Boolean(remoteProduct) && !isAdminOrigin && isCustomer;
  const isSellerProduct = !catalogProduct && Boolean(sellerProduct);
  const isAdminProductLoaded = Boolean(remoteProduct);
  const adminProductType = remoteProduct?.productType;
  const currentInventoryState = inventoryState?.productId === String(productId)
    ? inventoryState
    : null;
  const [variantId, setVariantId] = useState(product?.variants?.[0]?.id ?? null);
  const [addingToCart, setAddingToCart] = useState(false);
  const [cartConfirmationVisible, setCartConfirmationVisible] = useState(
    Boolean(route.params?.justAdded) && isCustomer && !isAdminOrigin,
  );
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [deactivationModalVisible, setDeactivationModalVisible] = useState(false);
  const [productStatusError, setProductStatusError] = useState('');
  const [isUpdatingProductStatus, setIsUpdatingProductStatus] = useState(false);
  const productStatusLock = useRef(false);
  const {
    addItem,
    itemCount,
    status: cartStatus,
    error: cartError,
    isMutating: isCartMutating,
    reconciliationRequired,
    refreshCart,
  } = useCart();
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
    const fetchProduct = isAdminOrigin
      ? getAdminProductById(productId, token)
      : getProductById(productId);
    fetchProduct
      .then((result) => {
        if (active) {
          setApiProduct(result);
          setApiProductAdminOrigin(isAdminOrigin);
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
  }, [productId, catalogProduct?.id, sellerProduct?.id, isAdminOrigin, token, reloadKey]);

  useEffect(() => {
    let active = true;

    if (!isAdminOrigin || !isAdminProductLoaded) {
      setInventoryState(null);
      return () => {
        active = false;
      };
    }

    const requestedProductId = String(productId);
    if (typeof token !== 'string' || !token.trim()) {
      setInventoryState({
        productId: requestedProductId,
        status: 'error',
        message: 'Sua sessão não está válida. Entre novamente como administrador.',
      });
      return () => {
        active = false;
      };
    }

    setInventoryState({ productId: requestedProductId, status: 'loading' });
    getProductInventory(productId, adminProductType, token)
      .then((inventory) => {
        if (active) {
          setInventoryState({
            productId: requestedProductId,
            status: 'success',
            inventory,
          });
        }
      })
      .catch((error) => {
        if (active) {
          setInventoryState({
            productId: requestedProductId,
            status: 'error',
            message: getInventoryErrorMessage(error),
          });
        }
      });

    return () => {
      active = false;
    };
  }, [
    isAdminOrigin,
    isAdminProductLoaded,
    productId,
    adminProductType,
    token,
    inventoryReloadKey,
  ]);

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
    setCartConfirmationVisible(Boolean(route.params?.justAdded) && isCustomer && !isAdminOrigin);
  }, [product?.id, route.params?.justAdded, isCustomer, isAdminOrigin]);

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

  const unitPrice = getProductPrice(product, variant);
  const canAddToCart = isPublicApiProduct &&
    product.active !== false &&
    cartStatus === 'ready' &&
    !isCartMutating &&
    !reconciliationRequired &&
    !addingToCart;

  async function handleAdd() {
    if (!isPublicApiProduct || addingToCart || isCartMutating) {
      return;
    }

    setAddingToCart(true);
    try {
      const result = await addItem(product, null, 1);
      if (result?.ok) {
        setCartConfirmationVisible(true);
      } else {
        Alert.alert('Não foi possível adicionar', result?.message ?? 'Tente novamente.');
      }
    } catch (error) {
      Alert.alert(
        'Não foi possível adicionar',
        error instanceof Error ? error.message : 'Tente novamente.',
      );
    } finally {
      setAddingToCart(false);
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

  async function updateProductStatus(active) {
    if (productStatusLock.current) {
      return false;
    }

    productStatusLock.current = true;
    setIsUpdatingProductStatus(true);
    setProductStatusError('');

    try {
      if (isRemoteProduct) {
        const updatedProduct = await setRemoteProductActive(product.id, active, token);
        setApiProduct((currentProduct) => (
          currentProduct?.id === String(product.id)
            ? { ...currentProduct, active: updatedProduct.active }
            : currentProduct
        ));
      } else {
        const updateProduct = isSellerProduct ? updateSellerProduct : updateCatalogProduct;
        if (!updateProduct(product.id, { active })) {
          setProductStatusError('Não foi possível atualizar o produto. Tente novamente.');
          return false;
        }
      }

      setCartConfirmationVisible(false);
      return true;
    } catch (error) {
      if (isRemoteProduct) {
        throw error;
      }
      setProductStatusError(
        error instanceof Error ? error.message : 'Não foi possível atualizar o produto.',
      );
      return false;
    } finally {
      productStatusLock.current = false;
      setIsUpdatingProductStatus(false);
    }
  }

  async function toggleProductStatus() {
    if (product.active === false) {
      try {
        await updateProductStatus(true);
      } catch (error) {
        setProductStatusError(error?.status === 409
          ? 'Não é possível reativar este produto enquanto a categoria ou subcategoria estiver inativa.'
          : error instanceof Error
            ? error.message
            : 'Não foi possível ativar o produto.');
      }
      return;
    }

    setProductStatusError('');
    setDeactivationModalVisible(true);
  }

  async function confirmProductDeactivation() {
    if (!await updateProductStatus(false)) {
      return false;
    }

    setDeactivationModalVisible(false);
    return true;
  }

  async function handleAddRecommendation(recommendedProduct) {
    try {
      const result = await addItem(recommendedProduct);
      if (!result?.ok) {
        Alert.alert('Não foi possível adicionar', result?.message ?? 'Tente novamente.');
      }
    } catch (error) {
      Alert.alert(
        'Não foi possível adicionar',
        error instanceof Error ? error.message : 'Tente novamente.',
      );
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
          {!isRemoteProduct ? (
            <Text style={styles.demoPriceLabel}>Preço demonstrativo</Text>
          ) : null}
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
              <Ionicons
                name={product.active === false ? 'close-circle' : 'checkmark-circle'}
                size={17}
                color={product.active === false ? colors.danger : colors.forestLight}
              />
              <Text style={styles.availabilityText}>
                {product.active === false ? 'Produto desativado' : 'Produto ativo no catálogo'}
              </Text>
            </View>
          ) : (
            <View style={styles.availability}>
              <Ionicons name="information-circle-outline" size={17} color={colors.muted} />
              <Text style={[styles.availabilityText, styles.demoAvailabilityText]}>
                Produto demonstrativo fora do catálogo persistente.
              </Text>
            </View>
          )}
          <Text style={styles.typeDescription}>
            {product.type === 'UNITÁRIO'
              ? 'Peça individual: quantidade limitada a 1 unidade.'
              : 'Produto por quantidade. Disponibilidade sujeita à confirmação.'}
          </Text>

          {isAdminOrigin ? (
            <View style={styles.inventorySection}>
              <View style={styles.inventoryCard}>
                <Text style={[styles.optionTitle, styles.inventoryTitle]}>Estoque</Text>
                {!currentInventoryState || currentInventoryState.status === 'loading' ? (
                  <View style={styles.inventoryState}>
                    <ActivityIndicator color={colors.forest} />
                    <Text style={styles.inventoryStateText}>Carregando estoque...</Text>
                  </View>
                ) : currentInventoryState.status === 'error' ? (
                  <View style={styles.inventoryState}>
                    <Text style={styles.inventoryErrorText}>
                      {currentInventoryState.message}
                    </Text>
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => setInventoryReloadKey((key) => key + 1)}
                      style={styles.inventoryRetry}
                    >
                      <Text style={styles.inventoryRetryText}>Tentar novamente</Text>
                    </Pressable>
                  </View>
                ) : (
                  <>
                    {[
                      ['Quantidade física', currentInventoryState.inventory.quantityOnHand],
                      ['Quantidade reservada', currentInventoryState.inventory.quantityReserved],
                      ['Quantidade disponível', currentInventoryState.inventory.availableQuantity],
                      ['Limite de estoque baixo', currentInventoryState.inventory.lowStockThreshold],
                    ].map(([label, value]) => (
                      <View key={label} style={styles.inventoryRow}>
                        <Text style={styles.inventoryLabel}>{label}</Text>
                        <Text style={styles.inventoryValue}>
                          {formatInventoryQuantity(value)}
                        </Text>
                      </View>
                    ))}
                    <View
                      style={[
                        styles.inventoryLowStock,
                        currentInventoryState.inventory.lowStock
                          ? styles.inventoryLowStockActive
                          : styles.inventoryLowStockNormal,
                      ]}
                    >
                      <Ionicons
                        name={currentInventoryState.inventory.lowStock
                          ? 'warning-outline'
                          : 'checkmark-circle-outline'}
                        size={16}
                        color={currentInventoryState.inventory.lowStock
                          ? colors.danger
                          : colors.forest}
                      />
                      <Text
                        style={[
                          styles.inventoryLowStockText,
                          currentInventoryState.inventory.lowStock
                            ? styles.inventoryLowStockTextActive
                            : styles.inventoryLowStockTextNormal,
                        ]}
                      >
                        {currentInventoryState.inventory.lowStock
                          ? 'Estoque baixo'
                          : 'Sem alerta de estoque baixo'}
                      </Text>
                    </View>
                    {formatInventoryTimestamp(currentInventoryState.inventory.updatedAt) ? (
                      <Text style={styles.inventoryUpdatedAt}>
                        Atualizado em {formatInventoryTimestamp(currentInventoryState.inventory.updatedAt)}
                      </Text>
                    ) : null}
                  </>
                )}
              </View>
            </View>
          ) : null}

          {!isRemoteProduct && isCustomer ? (
            <Text style={styles.demoCartNotice}>
              Produtos demonstrativos e variantes locais não podem ser adicionados à sacola persistente.
            </Text>
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
            isUpdating={isUpdatingProductStatus}
            onEdit={() => setEditModalVisible(true)}
            onToggleActive={toggleProductStatus}
          />
        </View>
      ) : isPublicApiProduct && !cartConfirmationVisible ? (
        <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 14) }]}>
          <View>
            <Text style={styles.totalLabel}>Valor unitário</Text>
            <Text style={styles.total}>{formatCurrency(unitPrice)}</Text>
            {cartError ? (
              <>
                <Text style={styles.cartActionError}>{cartError}</Text>
                <Pressable onPress={refreshCart} accessibilityRole="button">
                  <Text style={styles.cartRetryText}>Tentar atualizar a sacola</Text>
                </Pressable>
              </>
            ) : null}
          </View>
          <Pressable
            accessibilityRole="button"
            disabled={!canAddToCart}
            onPress={handleAdd}
            style={[styles.addButton, !canAddToCart && styles.disabledButton]}
          >
            {addingToCart || isCartMutating || ['loading', 'refreshing'].includes(cartStatus) ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <Ionicons name="bag-add-outline" size={18} color={colors.white} />
            )}
            <Text style={styles.addButtonText}>
              {addingToCart || isCartMutating
                ? 'Adicionando...'
                : ['loading', 'refreshing', 'idle'].includes(cartStatus)
                  ? 'Carregando sacola...'
                  : 'Adicionar ao carrinho'}
            </Text>
          </Pressable>
        </View>
      ) : null}
      {isPublicApiProduct ? (
        <CartAddedBar
          visible={cartConfirmationVisible}
          itemCount={itemCount}
          onClose={() => setCartConfirmationVisible(false)}
          onContinue={() => { setCartConfirmationVisible(false); navigation.navigate('MainTabs', { screen: 'Carrinho' }); }}
        />
      ) : null}
      {isAdministrator ? (
        <>
          <ProductEditModal
            visible={editModalVisible}
            product={product}
            price={isRemoteProduct ? (product.originalPrice ?? unitPrice) : unitPrice}
            currency={product.currency || 'BRL'}
            remote={isRemoteProduct}
            onClose={() => setEditModalVisible(false)}
            onSave={handleSaveEdits}
          />
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
  demoPriceLabel: { color: colors.muted, fontSize: 10, marginTop: 2 },
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
  demoAvailabilityText: { color: colors.muted },
  demoCartNotice: {
    color: colors.mutedStrong,
    fontSize: 11,
    lineHeight: 17,
    marginTop: 14,
    padding: 11,
    borderRadius: 12,
    backgroundColor: colors.surfaceMuted,
  },
  typeDescription: { color: colors.muted, fontSize: 11, marginTop: 6 },
  inventorySection: { marginTop: 24 },
  inventoryCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 14,
  },
  inventoryTitle: { marginBottom: 8 },
  inventoryState: { alignItems: 'center', paddingVertical: 8 },
  inventoryStateText: { color: colors.muted, fontSize: 12, marginTop: 9 },
  inventoryErrorText: { color: colors.danger, fontSize: 12, lineHeight: 18, textAlign: 'center' },
  inventoryRetry: { paddingVertical: 10, paddingHorizontal: 12 },
  inventoryRetryText: { color: colors.forest, fontSize: 12, fontWeight: '800' },
  inventoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  inventoryLabel: { color: colors.mutedStrong, fontSize: 12, flex: 1, marginRight: 12 },
  inventoryValue: { color: colors.ink, fontSize: 13, fontWeight: '700' },
  inventoryLowStock: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 7,
    marginTop: 12,
  },
  inventoryLowStockActive: { backgroundColor: colors.clayLight },
  inventoryLowStockNormal: { backgroundColor: colors.sage },
  inventoryLowStockText: { fontSize: 11, fontWeight: '700' },
  inventoryLowStockTextActive: { color: colors.danger },
  inventoryLowStockTextNormal: { color: colors.forest },
  inventoryUpdatedAt: { color: colors.muted, fontSize: 10, marginTop: 12 },
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
  cartActionError: { color: colors.danger, fontSize: 9, lineHeight: 13, maxWidth: 170, marginTop: 3 },
  cartRetryText: { color: colors.forest, fontSize: 10, fontWeight: '700', marginTop: 2 },
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
