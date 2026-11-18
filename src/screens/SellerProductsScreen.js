import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { AppHeader } from '../components/AppHeader';
import { ProductImage } from '../components/ProductImage';
import { useAuth } from '../contexts/AuthContext';
import { getCategoryLabel } from '../data/categories';
import { listAdminProducts } from '../services/productService';
import { colors } from '../theme/colors';

const PAGE_SIZE = 10;
const statusOptions = [
  { value: 'ACTIVE', label: 'Ativos' },
  { value: 'INACTIVE', label: 'Inativos' },
  { value: 'ALL', label: 'Todos' },
];

export function SellerProductsScreen({ navigation }) {
  const { token } = useAuth();
  const [status, setStatus] = useState('ACTIVE');
  const [products, setProducts] = useState([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [paginationError, setPaginationError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const hasBeenFocused = useRef(false);
  const requestVersion = useRef(0);
  const loadMoreLock = useRef(false);

  useFocusEffect(useCallback(() => {
    if (hasBeenFocused.current) {
      requestVersion.current += 1;
      loadMoreLock.current = false;
      setReloadKey((key) => key + 1);
    } else {
      hasBeenFocused.current = true;
    }

    return () => {
      requestVersion.current += 1;
      loadMoreLock.current = false;
    };
  }, []));

  useEffect(() => {
    const version = requestVersion.current + 1;
    requestVersion.current = version;
    let active = true;
    setProducts([]);
    setPage(0);
    setTotalPages(0);
    setTotalElements(0);
    setError('');
    setPaginationError('');
    setLoading(true);
    setLoadingMore(false);
    loadMoreLock.current = false;

    listAdminProducts({
      status,
      sort: 'description,asc',
      page: 0,
      size: PAGE_SIZE,
      token,
    })
      .then((result) => {
        if (active && requestVersion.current === version) {
          setProducts(result.products);
          setPage(result.page);
          setTotalPages(result.totalPages);
          setTotalElements(result.totalElements);
        }
      })
      .catch((loadError) => {
        if (active && requestVersion.current === version) {
          setError(loadError instanceof Error
            ? loadError.message
            : 'Não foi possível carregar os produtos.');
        }
      })
      .finally(() => {
        if (active && requestVersion.current === version) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [status, token, reloadKey]);

  function changeStatus(nextStatus) {
    if (nextStatus === status) {
      return;
    }

    requestVersion.current += 1;
    loadMoreLock.current = false;
    setStatus(nextStatus);
  }

  function retry() {
    requestVersion.current += 1;
    loadMoreLock.current = false;
    setReloadKey((key) => key + 1);
  }

  async function loadMore() {
    if (
      loading ||
      loadingMore ||
      loadMoreLock.current ||
      page + 1 >= totalPages
    ) {
      return;
    }

    loadMoreLock.current = true;
    setLoadingMore(true);
    setPaginationError('');
    const version = requestVersion.current;

    try {
      const result = await listAdminProducts({
        status,
        sort: 'description,asc',
        page: page + 1,
        size: PAGE_SIZE,
        token,
      });

      if (requestVersion.current === version) {
        setProducts((currentProducts) => [...currentProducts, ...result.products]);
        setPage(result.page);
        setTotalPages(result.totalPages);
        setTotalElements(result.totalElements);
      }
    } catch (loadError) {
      if (requestVersion.current === version) {
        setPaginationError(loadError instanceof Error
          ? loadError.message
          : 'Não foi possível carregar mais produtos.');
      }
    } finally {
      if (requestVersion.current === version) {
        loadMoreLock.current = false;
        setLoadingMore(false);
      }
    }
  }

  function renderProduct({ item: product }) {
    const isActive = product.active !== false;

    return (
      <View style={styles.productCard}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Visualizar ${product.name}`}
          onPress={() => navigation.navigate('ProductDetails', {
            productId: product.id,
            source: 'admin',
          })}
          style={styles.productContent}
        >
          <ProductImage
            accessibilityLabel={product.name}
            fallbackEmoji="🧉"
            resizeMode="cover"
            source={product.image}
            style={styles.productImage}
          />
          <View style={styles.productDetails}>
            <View style={styles.statusRow}>
              <View style={[
                styles.statusBadge,
                isActive ? styles.activeBadge : styles.inactiveBadge,
              ]}
              >
                <Text style={[
                  styles.statusText,
                  isActive ? styles.activeText : styles.inactiveText,
                ]}
                >
                  {isActive ? 'Ativo' : 'Desativado'}
                </Text>
              </View>
            </View>
            <Text numberOfLines={2} style={styles.productName}>{product.name}</Text>
            <Text style={styles.category}>
              {product.categoryName || getCategoryLabel(product.category)}
            </Text>
          </View>
        </Pressable>
      </View>
    );
  }

  function renderEmptyState() {
    if (loading) {
      return (
        <View style={styles.emptyState}>
          <ActivityIndicator color={colors.forest} />
          <Text style={styles.stateText}>Carregando produtos...</Text>
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>Não foi possível carregar os produtos</Text>
          <Text style={styles.stateText}>{error}</Text>
          <Pressable onPress={retry} style={styles.retryButton}>
            <Text style={styles.retryButtonText}>Tentar novamente</Text>
          </Pressable>
        </View>
      );
    }

    return (
      <View style={styles.emptyState}>
        <Ionicons name="pricetags-outline" size={32} color={colors.muted} />
        <Text style={styles.emptyTitle}>Nenhum produto encontrado</Text>
        <Text style={styles.stateText}>Não há produtos para este filtro.</Text>
      </View>
    );
  }

  function renderFooter() {
    if (paginationError) {
      return (
        <View style={styles.footer}>
          <Text style={styles.stateText}>{paginationError}</Text>
          <Pressable onPress={loadMore} style={styles.retryButton}>
            <Text style={styles.retryButtonText}>Tentar novamente</Text>
          </Pressable>
        </View>
      );
    }

    if (loadingMore) {
      return <ActivityIndicator style={styles.loadingMore} color={colors.forest} />;
    }

    return page + 1 < totalPages ? (
      <Pressable onPress={loadMore} style={styles.loadMoreButton}>
        <Text style={styles.retryButtonText}>Carregar mais</Text>
      </Pressable>
    ) : null;
  }

  return (
    <View style={styles.screen}>
      <AppHeader
        navigation={navigation}
        onBackPress={() => navigation.navigate('Home')}
        showBack
        showMenu={false}
        title="Minhas Vendas"
      />
      <Text style={styles.subtitle}>Acompanhe os produtos cadastrados na sua loja.</Text>

      <View style={styles.statusFilters} accessibilityRole="tablist">
        {statusOptions.map((option) => {
          const selected = status === option.value;
          return (
            <Pressable
              key={option.value}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              onPress={() => changeStatus(option.value)}
              style={[styles.statusFilter, selected && styles.selectedStatusFilter]}
            >
              <Text style={[styles.statusFilterText, selected && styles.selectedStatusFilterText]}>
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.resultCount}>
        {loading
          ? 'Carregando produtos...'
          : `${totalElements} ${totalElements === 1 ? 'produto' : 'produtos'}`}
      </Text>

      <FlatList
        data={products}
        keyExtractor={(product) => product.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        onEndReached={loadMore}
        onEndReachedThreshold={0.4}
        ListEmptyComponent={renderEmptyState}
        ListFooterComponent={renderFooter}
        renderItem={renderProduct}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas },
  subtitle: { color: colors.muted, fontSize: 13, marginTop: 7, paddingHorizontal: 22 },
  statusFilters: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 18,
    paddingTop: 16,
  },
  statusFilter: {
    flex: 1,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  selectedStatusFilter: {
    borderColor: colors.forest,
    backgroundColor: colors.sage,
  },
  statusFilterText: { color: colors.mutedStrong, fontSize: 11, fontWeight: '700' },
  selectedStatusFilterText: { color: colors.forest },
  resultCount: { color: colors.muted, fontSize: 12, paddingHorizontal: 20, paddingTop: 14 },
  list: { padding: 18, gap: 12, paddingBottom: 20, flexGrow: 1 },
  productCard: {
    flexDirection: 'row',
    minHeight: 116,
    padding: 10,
    borderRadius: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  productContent: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  productImage: { width: 92, height: 94, borderRadius: 12, backgroundColor: colors.surfaceMuted },
  productDetails: { flex: 1, marginLeft: 12, justifyContent: 'center' },
  statusRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 5 },
  statusBadge: { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4 },
  activeBadge: { backgroundColor: colors.sage },
  inactiveBadge: { backgroundColor: colors.clayLight },
  statusText: { fontSize: 10, fontWeight: '800' },
  activeText: { color: colors.forest },
  inactiveText: { color: colors.clay },
  productName: { color: colors.ink, fontSize: 13, fontWeight: '800', lineHeight: 18 },
  category: { color: colors.muted, fontSize: 11, marginTop: 3 },
  emptyState: { alignItems: 'center', paddingHorizontal: 24, paddingVertical: 52 },
  emptyTitle: { color: colors.ink, fontSize: 16, fontWeight: '700', textAlign: 'center', marginTop: 12 },
  stateText: { color: colors.muted, fontSize: 12, lineHeight: 18, textAlign: 'center', marginTop: 10 },
  retryButton: {
    marginTop: 12,
    borderRadius: 10,
    backgroundColor: colors.forest,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  retryButtonText: { color: colors.white, fontSize: 11, fontWeight: '800' },
  footer: { alignItems: 'center', paddingVertical: 12 },
  loadingMore: { paddingVertical: 16 },
  loadMoreButton: {
    alignSelf: 'center',
    marginVertical: 8,
    borderRadius: 10,
    backgroundColor: colors.forest,
    paddingHorizontal: 18,
    paddingVertical: 11,
  },
});
