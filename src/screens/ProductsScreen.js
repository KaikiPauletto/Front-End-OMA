import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
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
import { AppHeader } from '../components/AppHeader';
import { ProductCard } from '../components/ProductCard';
import { CartAddedBar } from '../components/CartAddedBar';
import { categories, getCategoryById, getSubcategoryById } from '../data/categories';
import { getAvailableProducts } from '../data/products';
import { useCart } from '../contexts/CartContext';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';

const sortOptions = [
  { id: 'bestsellers', label: 'Mais vendidos' },
  { id: 'price-asc', label: 'Menor preço' },
  { id: 'price-desc', label: 'Maior preço' },
  { id: 'name-asc', label: 'A - Z' },
];

export function ProductsScreen({ navigation, route }) {
  const initialParams = route.params ?? {};
  const [search, setSearch] = useState(initialParams.searchQuery ?? '');
  const [categoryId, setCategoryId] = useState(initialParams.categoryId ?? '');
  const [subcategoryId, setSubcategoryId] = useState(initialParams.subcategoryId ?? '');
  const [sortBy, setSortBy] = useState('bestsellers');
  const [filterVisible, setFilterVisible] = useState(false);
  const [sortVisible, setSortVisible] = useState(false);
  const [cartConfirmationVisible, setCartConfirmationVisible] = useState(false);
  const { addItem, itemCount } = useCart();

  useEffect(() => {
    setSearch(route.params?.searchQuery ?? '');
    setCategoryId(route.params?.categoryId ?? '');
    setSubcategoryId(route.params?.subcategoryId ?? '');
    setSortBy('bestsellers');
  }, [route.params]);

  const selectedCategory = getCategoryById(categoryId);
  const selectedSubcategory = getSubcategoryById(categoryId, subcategoryId);
  const availableProducts = useMemo(() => getAvailableProducts(), []);

  const filteredProducts = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('pt-BR');
    let result = availableProducts.filter((product) => {
      const matchesCategory = !categoryId || product.category === categoryId;
      const matchesSubcategory = !subcategoryId || product.subcategory === subcategoryId;
      const matchesSearch = !term || `${product.name} ${product.description}`.toLocaleLowerCase('pt-BR').includes(term);
      return matchesCategory && matchesSubcategory && matchesSearch;
    });

    result = result.slice();
    if (sortBy === 'price-asc') result.sort((a, b) => a.price - b.price);
    else if (sortBy === 'price-desc') result.sort((a, b) => b.price - a.price);
    else if (sortBy === 'name-asc') result.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
    else result.sort((a, b) => (a.salesRank ?? 999) - (b.salesRank ?? 999));
    return result;
  }, [availableProducts, categoryId, subcategoryId, search, sortBy]);

  const title = search.trim()
    ? 'Resultados da busca'
    : selectedSubcategory?.name || selectedCategory?.name || (initialParams.mode === 'bestsellers' ? 'Mais vendidos' : 'Produtos');

  function openProduct(product) {
    navigation.navigate('ProductDetails', { productId: product.id });
  }

  function handleAdd(product) {
    const result = addItem(product);
    if (result.ok) {
      setCartConfirmationVisible(true);
    } else {
      Alert.alert('Não foi possível adicionar', result.message);
    }
  }

  function selectCategory(nextCategoryId) {
    setCategoryId(nextCategoryId);
    setSubcategoryId('');
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
        <Text style={styles.resultText}>{filteredProducts.length} {filteredProducts.length === 1 ? 'resultado' : 'resultados'}</Text>
        {sortBy === 'bestsellers' ? <Text style={styles.sortLabel}>Mais vendidos</Text> : null}
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
        data={filteredProducts}
        numColumns={2}
        keyExtractor={(item) => item.id}
        columnWrapperStyle={styles.gridRow}
        contentContainerStyle={styles.gridContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={(
          <View style={styles.emptyState}>
            <Ionicons name="search-outline" size={32} color={colors.muted} />
            <Text style={styles.emptyTitle}>Nenhum produto encontrado</Text>
            <Text style={styles.emptyText}>Tente ajustar a pesquisa ou remover os filtros.</Text>
          </View>
        )}
        renderItem={({ item }) => (
          <ProductCard
            product={item}
            layout="grid"
            onPress={() => openProduct(item)}
            onAddToCart={() => handleAdd(item)}
          />
        )}
      />

      <CartAddedBar
        visible={cartConfirmationVisible}
        itemCount={itemCount}
        onClose={() => setCartConfirmationVisible(false)}
        onContinue={() => { setCartConfirmationVisible(false); navigation.navigate('Carrinho'); }}
        bottomOffset={70}
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
                  {selectedCategory.subcategories.map((subcategory) => (
                    <Pressable key={subcategory.id} style={styles.optionRow} onPress={() => setSubcategoryId(subcategory.id)}>
                      <Text style={styles.optionText}>{subcategory.name}</Text>
                      {subcategoryId === subcategory.id ? <Ionicons name="checkmark-circle" size={19} color={colors.forest} /> : null}
                    </Pressable>
                  ))}
                </>
              ) : null}
            </ScrollView>
            <Pressable style={styles.applyButton} onPress={() => setFilterVisible(false)}>
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
            {sortOptions.map((option) => (
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
  applyButton: { height: 48, marginTop: 18, borderRadius: 24, backgroundColor: colors.forest, alignItems: 'center', justifyContent: 'center' },
  applyButtonText: { color: colors.white, fontSize: 12, fontWeight: '700', textTransform: 'uppercase' },
});
