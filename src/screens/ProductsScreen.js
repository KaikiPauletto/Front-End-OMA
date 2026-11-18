import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { AppHeader } from '../components/AppHeader';
import { ProductCard } from '../components/ProductCard';
import { useAuth } from '../contexts/AuthContext';
import { listCategories, listProducts, listSubcategories, productSortOptions } from '../services/productService';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';

const PAGE_SIZE = 10;

export function ProductsScreen({ navigation, route }) {
  const { user } = useAuth();
  const isAdministrator = user?.role === 'ADMINISTRADOR';
  const initialParams = route.params ?? {};
  const [search, setSearch] = useState(initialParams.searchQuery ?? '');
  const [submittedSearch, setSubmittedSearch] = useState(initialParams.searchQuery ?? '');
  const [categoryId, setCategoryId] = useState(initialParams.categoryId ? String(initialParams.categoryId) : '');
  const [subcategoryId, setSubcategoryId] = useState(initialParams.subcategoryId ? String(initialParams.subcategoryId) : '');
  const [sortBy, setSortBy] = useState('description-asc');
  const [minPriceInput, setMinPriceInput] = useState('');
  const [maxPriceInput, setMaxPriceInput] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [filterError, setFilterError] = useState('');
  const [filterVisible, setFilterVisible] = useState(false);
  const [sortVisible, setSortVisible] = useState(false);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [paginationError, setPaginationError] = useState('');
  const [categoryError, setCategoryError] = useState('');
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [reloadKey, setReloadKey] = useState(0);
  const hasBeenFocused = useRef(false);
  const queryVersion = useRef(0);
  const loadMoreLock = useRef(false);

  useEffect(() => {
    setSearch(route.params?.searchQuery ?? '');
    setSubmittedSearch(route.params?.searchQuery ?? '');
    setCategoryId(route.params?.categoryId ? String(route.params.categoryId) : '');
    setSubcategoryId(route.params?.subcategoryId ? String(route.params.subcategoryId) : '');
    setSortBy('description-asc');
    setMinPriceInput('');
    setMaxPriceInput('');
    setMinPrice('');
    setMaxPrice('');
  }, [route.params]);

  useEffect(() => {
    const timer = setTimeout(() => setSubmittedSearch(search.trim()), 350);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    let active = true;
    listCategories()
      .then((result) => {
        if (active) {
          setCategories(result);
          setCategoryError('');
        }
      })
      .catch((loadError) => {
        if (active) {
          setCategoryError(loadError instanceof Error ? loadError.message : 'Não foi possível carregar as categorias.');
        }
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    if (!categoryId) {
      setSubcategories([]);
      return () => {
        active = false;
      };
    }

    listSubcategories(categoryId)
      .then((result) => {
        if (active) {
          setSubcategories(result);
          setCategoryError('');
        }
      })
      .catch((loadError) => {
        if (active) {
          setSubcategories([]);
          setCategoryError(loadError instanceof Error ? loadError.message : 'Não foi possível carregar as subcategorias.');
        }
      });

    return () => {
      active = false;
    };
  }, [categoryId]);

  const selectedCategory = categories.find((category) => category.id === String(categoryId));
  const selectedSubcategory = subcategories.find((subcategory) => subcategory.id === String(subcategoryId));
  const selectedSort = productSortOptions.find((option) => option.id === sortBy) ?? productSortOptions[0];

  useFocusEffect(useCallback(() => {
    if (hasBeenFocused.current) {
      setReloadKey((key) => key + 1);
    } else {
      hasBeenFocused.current = true;
    }
  }, []));

  useEffect(() => {
    const version = queryVersion.current + 1;
    queryVersion.current = version;
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

    listProducts({
      name: submittedSearch,
      categoryId,
      subcategoryId,
      minPrice,
      maxPrice,
      sort: selectedSort.sort,
      page: 0,
      size: PAGE_SIZE,
    })
      .then((result) => {
        if (active && queryVersion.current === version) {
          setProducts(result.products);
          setPage(result.page);
          setTotalPages(result.totalPages);
          setTotalElements(result.totalElements);
        }
      })
      .catch((loadError) => {
        if (active && queryVersion.current === version) {
          setError(loadError instanceof Error ? loadError.message : 'Não foi possível carregar os produtos.');
        }
      })
      .finally(() => {
        if (active && queryVersion.current === version) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [submittedSearch, categoryId, subcategoryId, minPrice, maxPrice, selectedSort.sort, reloadKey]);

  const title = search.trim()
    ? 'Resultados da busca'
    : selectedSubcategory?.name || selectedCategory?.name || 'Produtos';

  function selectCategory(nextCategoryId) {
    setCategoryId(nextCategoryId);
    setSubcategoryId('');
  }

  async function loadMore() {
    if (loading || loadingMore || loadMoreLock.current || page + 1 >= totalPages) {
      return;
    }

    loadMoreLock.current = true;
    setLoadingMore(true);
    setPaginationError('');
    const version = queryVersion.current;

    try {
      const result = await listProducts({
        name: submittedSearch,
        categoryId,
        subcategoryId,
        minPrice,
        maxPrice,
        sort: selectedSort.sort,
        page: page + 1,
        size: PAGE_SIZE,
      });

      if (queryVersion.current === version) {
        setProducts((currentProducts) => [...currentProducts, ...result.products]);
        setPage(result.page);
        setTotalPages(result.totalPages);
        setTotalElements(result.totalElements);
      }
    } catch (loadError) {
      if (queryVersion.current === version) {
        setPaginationError(loadError instanceof Error ? loadError.message : 'Não foi possível carregar mais produtos.');
      }
    } finally {
      if (queryVersion.current === version) {
        loadMoreLock.current = false;
        setLoadingMore(false);
      }
    }
  }

  function parsePrice(value) {
    const trimmed = value.trim();
    if (!trimmed) {
      return '';
    }

    const normalized = trimmed.replace(',', '.');
    return /^\d+(?:\.\d{1,2})?$/.test(normalized) ? Number(normalized) : null;
  }

  function applyFilters() {
    const nextMinPrice = parsePrice(minPriceInput);
    const nextMaxPrice = parsePrice(maxPriceInput);

    if (nextMinPrice === null || nextMaxPrice === null) {
      setFilterError('Informe preços válidos, usando no máximo duas casas decimais.');
      return;
    }
    if (nextMinPrice !== '' && nextMaxPrice !== '' && nextMinPrice > nextMaxPrice) {
      setFilterError('O preço mínimo não pode ser maior que o preço máximo.');
      return;
    }

    setFilterError('');
    setMinPrice(nextMinPrice);
    setMaxPrice(nextMaxPrice);
    setFilterVisible(false);
  }

  function clearFilters() {
    setCategoryId('');
    setSubcategoryId('');
    setMinPriceInput('');
    setMaxPriceInput('');
    setMinPrice('');
    setMaxPrice('');
    setFilterError('');
    setFilterVisible(false);
  }

  return (
    <View style={styles.screen}>
      <AppHeader navigation={navigation} title={title} showBack />
      <View style={styles.searchBox}>
        <Ionicons name="search-outline" size={17} color={colors.muted} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Buscar produtos..."
          placeholderTextColor={colors.muted}
          style={styles.searchInput}
          returnKeyType="search"
        />
        {search ? (
          <Pressable onPress={() => setSearch('')} hitSlop={8}>
            <Ionicons name="close-circle" size={17} color={colors.muted} />
          </Pressable>
        ) : null}
      </View>

      <View style={styles.resultHeader}>
        <Text style={styles.resultText}>
          {loading
            ? 'Carregando produtos...'
            : `${totalElements} ${totalElements === 1 ? 'resultado' : 'resultados'}`}
        </Text>
        <Text style={styles.sortLabel}>{selectedSort.label}</Text>
      </View>

      <View style={styles.actions}>
        <Pressable style={styles.actionButton} onPress={() => setFilterVisible(true)}>
          <Text style={styles.actionText}>FILTRAR</Text>
          <Ionicons name="options-outline" size={15} color={colors.ink} />
        </Pressable>
        <Pressable style={styles.actionButton} onPress={() => setSortVisible(true)}>
          <Text style={styles.actionText}>ORDENAR</Text>
          <Ionicons name="swap-vertical-outline" size={15} color={colors.ink} />
        </Pressable>
      </View>

      <FlatList
        data={products}
        numColumns={2}
        keyExtractor={(item) => item.id}
        columnWrapperStyle={styles.gridRow}
        contentContainerStyle={styles.gridContent}
        showsVerticalScrollIndicator={false}
        onEndReached={loadMore}
        onEndReachedThreshold={0.4}
        ListEmptyComponent={loading ? (
          <View style={styles.emptyState}>
            <ActivityIndicator color={colors.forest} />
            <Text style={styles.emptyText}>Carregando produtos...</Text>
          </View>
        ) : error ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>Não foi possível carregar os produtos</Text>
            <Text style={styles.emptyText}>{error}</Text>
            <Pressable onPress={() => setReloadKey((key) => key + 1)} style={styles.retryButton}>
              <Text style={styles.retryButtonText}>Tentar novamente</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="search-outline" size={32} color={colors.muted} />
            <Text style={styles.emptyTitle}>Nenhum produto encontrado</Text>
            <Text style={styles.emptyText}>Tente ajustar a pesquisa ou remover os filtros.</Text>
          </View>
        )}
        ListFooterComponent={paginationError ? (
          <View style={styles.paginationError}>
            <Text style={styles.emptyText}>{paginationError}</Text>
            <Pressable onPress={loadMore} style={styles.retryButton}>
              <Text style={styles.retryButtonText}>Tentar novamente</Text>
            </Pressable>
          </View>
        ) : loadingMore ? (
          <ActivityIndicator style={styles.loadingMore} color={colors.forest} />
        ) : page + 1 < totalPages ? (
          <Pressable onPress={loadMore} style={styles.loadMoreButton}>
            <Text style={styles.retryButtonText}>Carregar mais</Text>
          </Pressable>
        ) : null}
        renderItem={({ item }) => (
          <ProductCard
            product={item}
            layout="grid"
            showAction={isAdministrator}
            onPress={() => navigation.navigate('ProductDetails', { productId: item.id })}
            onEdit={() => navigation.navigate('ProductDetails', {
              productId: item.id,
              editOnOpen: true,
            })}
          />
        )}
      />

      <Modal visible={filterVisible} transparent animationType="slide" onRequestClose={() => setFilterVisible(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setFilterVisible(false)}>
          <Pressable style={styles.modalSheet} onPress={() => {}}>
            <View style={styles.modalHandle} />
            <View style={styles.modalTitleRow}>
              <Text style={styles.modalTitle}>Filtrar produtos</Text>
              <Pressable onPress={() => setFilterVisible(false)} hitSlop={10}><Ionicons name="close" size={22} color={colors.ink} /></Pressable>
            </View>
            <ScrollView style={styles.filterOptions} showsVerticalScrollIndicator={false}>
              <Text style={styles.modalSection}>CATEGORIA</Text>
              <Pressable style={styles.optionRow} onPress={() => selectCategory('')}>
                <Text style={styles.optionText}>Todas as categorias</Text>
                {categoryId === '' ? <Ionicons name="checkmark-circle" size={19} color={colors.forest} /> : null}
              </Pressable>
              {categoryError ? <Text style={styles.filterError}>{categoryError}</Text> : null}
              {categories.map((category) => (
                <Pressable key={category.id} style={styles.optionRow} onPress={() => selectCategory(category.id)}>
                  <Text style={styles.optionText}>{category.name}</Text>
                  {categoryId === category.id ? <Ionicons name="checkmark-circle" size={19} color={colors.forest} /> : null}
                </Pressable>
              ))}
              {selectedCategory ? (
                <>
                  <Text style={styles.modalSection}>SUBCATEGORIA</Text>
                  <Pressable style={styles.optionRow} onPress={() => setSubcategoryId('')}>
                    <Text style={styles.optionText}>Todas de {selectedCategory.name}</Text>
                    {!subcategoryId ? <Ionicons name="checkmark-circle" size={19} color={colors.forest} /> : null}
                  </Pressable>
                  {subcategories.map((subcategory) => (
                    <Pressable key={subcategory.id} style={styles.optionRow} onPress={() => setSubcategoryId(subcategory.id)}>
                      <Text style={styles.optionText}>{subcategory.name}</Text>
                      {subcategoryId === subcategory.id ? <Ionicons name="checkmark-circle" size={19} color={colors.forest} /> : null}
                    </Pressable>
                  ))}
                </>
              ) : null}
              <Text style={styles.modalSection}>FAIXA DE PREÇO (R$)</Text>
              <View style={styles.priceFields}>
                <TextInput
                  accessibilityLabel="Preço mínimo"
                  keyboardType="decimal-pad"
                  onChangeText={setMinPriceInput}
                  placeholder="Mínimo"
                  placeholderTextColor={colors.muted}
                  style={styles.priceInput}
                  value={minPriceInput}
                />
                <TextInput
                  accessibilityLabel="Preço máximo"
                  keyboardType="decimal-pad"
                  onChangeText={setMaxPriceInput}
                  placeholder="Máximo"
                  placeholderTextColor={colors.muted}
                  style={styles.priceInput}
                  value={maxPriceInput}
                />
              </View>
              {filterError ? <Text style={styles.filterError}>{filterError}</Text> : null}
            </ScrollView>
            <Pressable style={styles.clearFiltersButton} onPress={clearFilters}>
              <Text style={styles.clearFiltersText}>Limpar filtros</Text>
            </Pressable>
            <Pressable style={styles.applyButton} onPress={applyFilters}>
              <Text style={styles.applyButtonText}>Aplicar filtros</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={sortVisible} transparent animationType="slide" onRequestClose={() => setSortVisible(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setSortVisible(false)}>
          <Pressable style={styles.sortSheet} onPress={() => {}}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Ordenar por</Text>
            {productSortOptions.map((option) => (
              <Pressable key={option.id} style={styles.optionRow} onPress={() => { setSortBy(option.id); setSortVisible(false); }}>
                <Text style={styles.optionText}>{option.label}</Text>
                {sortBy === option.id ? <Ionicons name="checkmark-circle" size={19} color={colors.forest} /> : null}
              </Pressable>
            ))}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas },
  searchBox: {
    height: 42,
    marginHorizontal: 18,
    marginTop: 13,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#F2EFEA',
  },
  searchInput: { flex: 1, padding: 0, color: colors.ink, fontSize: 12, fontFamily: typography.family.body },
  resultHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginHorizontal: 20, marginTop: 13 },
  resultText: { color: colors.ink, fontSize: 11, fontWeight: '600' },
  sortLabel: { color: colors.forest, fontSize: 10, fontWeight: '600' },
  actions: { flexDirection: 'row', gap: 10, marginHorizontal: 18, marginTop: 12, marginBottom: 12 },
  actionButton: {
    flex: 1,
    height: 36,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    backgroundColor: colors.surface,
  },
  actionText: { color: colors.ink, fontSize: 10, fontWeight: '700', letterSpacing: 0.6 },
  gridContent: { paddingHorizontal: 13, paddingBottom: 25 },
  gridRow: { gap: 10, marginBottom: 12 },
  emptyState: { alignItems: 'center', paddingHorizontal: 30, paddingTop: 55 },
  emptyTitle: { color: colors.ink, fontFamily: typography.family.display, fontSize: 20, marginTop: 12 },
  emptyText: { color: colors.muted, fontSize: 12, textAlign: 'center', marginTop: 5 },
  retryButton: {
    alignSelf: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginTop: 10,
    borderRadius: 18,
    backgroundColor: colors.sage,
  },
  retryButtonText: { color: colors.forest, fontSize: 12, fontWeight: '700' },
  loadingMore: { paddingVertical: 16 },
  paginationError: { alignItems: 'center', paddingVertical: 14 },
  loadMoreButton: {
    alignSelf: 'center',
    paddingHorizontal: 18,
    paddingVertical: 11,
    marginVertical: 10,
    borderRadius: 18,
    backgroundColor: colors.sage,
  },
  modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(20, 25, 18, 0.38)' },
  modalSheet: { maxHeight: '85%', backgroundColor: colors.canvas, paddingHorizontal: 20, paddingTop: 10, paddingBottom: 30, borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  sortSheet: { backgroundColor: colors.canvas, paddingHorizontal: 20, paddingTop: 10, paddingBottom: 26, borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  modalHandle: { width: 42, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center', marginBottom: 16 },
  modalTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  modalTitle: { color: colors.ink, fontFamily: typography.family.display, fontSize: 22, marginBottom: 15 },
  filterOptions: { flexShrink: 1, maxHeight: 440 },
  modalSection: { color: colors.muted, fontSize: 10, fontWeight: '700', letterSpacing: 1.1, marginTop: 14, marginBottom: 5 },
  optionRow: { minHeight: 43, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: colors.border },
  optionText: { flex: 1, color: colors.ink, fontSize: 12 },
  filterError: { color: colors.danger, fontSize: 11, lineHeight: 16, marginTop: 7 },
  priceFields: { flexDirection: 'row', gap: 10, marginTop: 5 },
  priceInput: {
    flex: 1,
    height: 43,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
    color: colors.ink,
    fontSize: 12,
  },
  clearFiltersButton: { alignSelf: 'center', paddingVertical: 10, marginTop: 10 },
  clearFiltersText: { color: colors.mutedStrong, fontSize: 12, fontWeight: '600' },
  applyButton: { height: 48, marginTop: 18, borderRadius: 24, backgroundColor: colors.forest, alignItems: 'center', justifyContent: 'center' },
  applyButtonText: { color: colors.white, fontSize: 12, fontWeight: '700', textTransform: 'uppercase' },
});
