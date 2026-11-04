import { useMemo, useState } from 'react';
import {
  Alert,
  ImageBackground,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppButton } from '../components/AppButton';
import { AppHeader } from '../components/AppHeader';
import { EditorialSection } from '../components/EditorialSection';
import { ProductCard } from '../components/ProductCard';
import { SectionTitle } from '../components/SectionTitle';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import { categories, getCategoryById } from '../data/categories';
import { getAvailableProducts } from '../data/products';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';

const heroImage = { uri: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/1/18/Chimarr%C3%A3o_do_Ga%C3%BAcho.jpg/1280px-Chimarr%C3%A3o_do_Ga%C3%BAcho.jpg' };

const brandPlaceholders = ['Marca 1', 'Marca 2', 'Marca 3', 'Marca 4', 'Marca 5'];
const PRODUCTS_PER_PAGE = 30;
const sortOptions = [
  { id: 'bestsellers', label: 'Mais vendidos' },
  { id: 'price-asc', label: 'Menor preço' },
  { id: 'price-desc', label: 'Maior preço' },
  { id: 'name-asc', label: 'A - Z' },
];

export function HomeScreen({ navigation }) {
  const [search, setSearch] = useState('');
  const [productPage, setProductPage] = useState(1);
  const [categoryId, setCategoryId] = useState('');
  const [sortBy, setSortBy] = useState('bestsellers');
  const [categoryPickerVisible, setCategoryPickerVisible] = useState(false);
  const [sortPickerVisible, setSortPickerVisible] = useState(false);
  const { width: screenWidth } = useWindowDimensions();
  const heroHeight = Math.min(400, Math.max(300, (screenWidth - 40) * (400 / 350)));
  const { user } = useAuth();
  const { addItem } = useCart();

  const availableProducts = useMemo(() => getAvailableProducts(), []);
  const featuredProducts = useMemo(
    () => availableProducts.slice().sort((a, b) => (a.salesRank ?? 999) - (b.salesRank ?? 999)).slice(0, 5),
    [availableProducts],
  );
  const selectedCategory = getCategoryById(categoryId);
  const filteredProducts = useMemo(() => {
    const result = availableProducts.filter(
      (product) => !categoryId || product.category === categoryId,
    );

    if (sortBy === 'price-asc') result.sort((first, second) => first.price - second.price);
    else if (sortBy === 'price-desc') result.sort((first, second) => second.price - first.price);
    else if (sortBy === 'name-asc') result.sort((first, second) => first.name.localeCompare(second.name, 'pt-BR'));
    else result.sort((first, second) => (first.salesRank ?? 999) - (second.salesRank ?? 999));
    return result;
  }, [availableProducts, categoryId, sortBy]);
  const pageCount = Math.ceil(filteredProducts.length / PRODUCTS_PER_PAGE);
  const pageProducts = filteredProducts.slice(
    (productPage - 1) * PRODUCTS_PER_PAGE,
    productPage * PRODUCTS_PER_PAGE,
  );
  const productRows = [];
  for (let index = 0; index < pageProducts.length; index += 2) {
    productRows.push(pageProducts.slice(index, index + 2));
  }

  function openSearch() {
    navigation.navigate('Produtos', { searchQuery: search.trim() });
  }

  function handleAddToCart(product) {
    const result = addItem(product);
    Alert.alert(
      result.ok ? 'Adicionado à sacola' : 'Não foi possível adicionar',
      result.message,
    );
  }

  function openProduct(product) {
    navigation.navigate('ProductDetails', { productId: product.id });
  }

  return (
    <View style={styles.screen}>
      <AppHeader
        navigation={navigation}
        onMenuPress={() => navigation.navigate('Categorias')}
        showMenu={user?.role === 'ADMINISTRADOR'}
      />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.searchBox}>
          <Pressable onPress={openSearch} hitSlop={8} accessibilityLabel="Pesquisar produtos">
            <Ionicons name="search-outline" size={18} color={colors.muted} />
          </Pressable>
          <TextInput
            value={search}
            onChangeText={setSearch}
            onSubmitEditing={openSearch}
            placeholder="Buscar cuias, erva-mate, acessórios..."
            placeholderTextColor={colors.muted}
            style={styles.searchInput}
            returnKeyType="search"
          />
          {search.length > 0 ? (
            <Pressable onPress={() => setSearch('')} hitSlop={8} accessibilityLabel="Limpar pesquisa">
              <Ionicons name="close-circle" size={17} color={colors.muted} />
            </Pressable>
          ) : null}
        </View>

        <View style={styles.heroOuter}>
          <ImageBackground source={heroImage} imageStyle={styles.heroImage} style={[styles.hero, { height: heroHeight }]}>
            <View style={styles.heroShade} />
            <View style={styles.heroCopy}>
              <Text style={styles.heroEyebrow}>DESTAQUES DA SEMANA</Text>
              <Text style={styles.heroTitle}>O Sabor Autêntico do Pampa</Text>
              <Text style={styles.heroDescription}>
                Ervas selecionadas e acessórios escolhidos para acompanhar o teu ritual de mate.
              </Text>
              <AppButton
                title="Ver coleção"
                icon="arrow-forward"
                variant="primary"
                size="small"
                onPress={() => navigation.navigate('Produtos', { mode: 'collection' })}
                style={styles.heroButton}
                textStyle={styles.heroButtonText}
              />
            </View>
          </ImageBackground>
        </View>

        <View style={styles.section}>
          <SectionTitle
            title="Mais Vendidos"
            action="Ver todos"
            onActionPress={() => navigation.navigate('Produtos', { mode: 'bestsellers' })}
          />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.productList}
          >
            {featuredProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onPress={() => openProduct(product)}
                onAddToCart={() => handleAddToCart(product)}
              />
            ))}
          </ScrollView>
        </View>

        <View style={styles.brandsSection}>
          <SectionTitle title="Marcas" />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.brandList}
          >
            {brandPlaceholders.map((brand) => (
              <View key={brand} style={styles.brandPlaceholder}>
                <Ionicons name="image-outline" size={22} color="#A6A9A5" />
              </View>
            ))}
          </ScrollView>
        </View>

        <EditorialSection />

        <View style={styles.catalogSection}>
          <SectionTitle title="Todos os produtos" />
          <View style={styles.catalogActions}>
            <Pressable
              accessibilityRole="button"
              onPress={() => setCategoryPickerVisible(true)}
              style={styles.catalogAction}
            >
              <Ionicons name="options-outline" size={16} color={colors.ink} />
              <Text numberOfLines={1} style={styles.catalogActionText}>
                {selectedCategory?.name ?? 'Todas as categorias'}
              </Text>
              <Ionicons name="chevron-down" size={15} color={colors.muted} />
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={() => setSortPickerVisible(true)}
              style={styles.catalogAction}
            >
              <Ionicons name="swap-vertical-outline" size={16} color={colors.ink} />
              <Text numberOfLines={1} style={styles.catalogActionText}>
                {sortOptions.find((option) => option.id === sortBy).label}
              </Text>
              <Ionicons name="chevron-down" size={15} color={colors.muted} />
            </Pressable>
          </View>
          <Text style={styles.catalogCount}>
            {filteredProducts.length} {filteredProducts.length === 1 ? 'produto disponível' : 'produtos disponíveis'}
          </Text>
          <View style={styles.productGrid}>
            {productRows.map((row, rowIndex) => (
              <View key={`product-row-${rowIndex}`} style={styles.productGridRow}>
                {row.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    layout="grid"
                    onPress={() => openProduct(product)}
                    onAddToCart={() => handleAddToCart(product)}
                  />
                ))}
                {row.length === 1 ? <View style={styles.gridPlaceholder} /> : null}
              </View>
            ))}
          </View>
          {filteredProducts.length === 0 ? (
            <Text style={styles.emptyProducts}>Nenhum produto encontrado nesta categoria.</Text>
          ) : null}
          {pageCount > 1 ? (
            <View style={styles.pagination}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Página anterior"
                accessibilityState={{ disabled: productPage === 1 }}
                disabled={productPage === 1}
                onPress={() => setProductPage((page) => page - 1)}
                style={[styles.pageButton, productPage === 1 && styles.pageButtonDisabled]}
              >
                <Ionicons name="chevron-back" size={18} color={colors.forest} />
                <Text style={styles.pageButtonText}>Anterior</Text>
              </Pressable>
              <Text style={styles.pageIndicator}>Página {productPage} de {pageCount}</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Próxima página"
                accessibilityState={{ disabled: productPage === pageCount }}
                disabled={productPage === pageCount}
                onPress={() => setProductPage((page) => page + 1)}
                style={[styles.pageButton, productPage === pageCount && styles.pageButtonDisabled]}
              >
                <Text style={styles.pageButtonText}>Próxima</Text>
                <Ionicons name="chevron-forward" size={18} color={colors.forest} />
              </Pressable>
            </View>
          ) : null}
        </View>
      </ScrollView>

      <Modal
        animationType="slide"
        onRequestClose={() => setCategoryPickerVisible(false)}
        transparent
        visible={categoryPickerVisible}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setCategoryPickerVisible(false)}>
          <Pressable style={styles.modalSheet} onPress={() => {}}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Filtrar por categoria</Text>
            <ScrollView>
              {[{ id: '', name: 'Todas as categorias' }, ...categories].map((category) => (
                <Pressable
                  key={category.id || 'all'}
                  onPress={() => {
                    setCategoryId(category.id);
                    setProductPage(1);
                    setCategoryPickerVisible(false);
                  }}
                  style={styles.modalOption}
                >
                  <Text style={styles.modalOptionText}>{category.name}</Text>
                  {categoryId === category.id ? (
                    <Ionicons name="checkmark-circle" size={19} color={colors.forest} />
                  ) : null}
                </Pressable>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        animationType="slide"
        onRequestClose={() => setSortPickerVisible(false)}
        transparent
        visible={sortPickerVisible}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setSortPickerVisible(false)}>
          <Pressable style={styles.modalSheet} onPress={() => {}}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Ordenar produtos</Text>
            {sortOptions.map((option) => (
              <Pressable
                key={option.id}
                onPress={() => {
                  setSortBy(option.id);
                  setProductPage(1);
                  setSortPickerVisible(false);
                }}
                style={styles.modalOption}
              >
                <Text style={styles.modalOptionText}>{option.label}</Text>
                {sortBy === option.id ? (
                  <Ionicons name="checkmark-circle" size={19} color={colors.forest} />
                ) : null}
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
  scrollContent: { paddingTop: 8, paddingBottom: 20 },
  searchBox: {
    height: 47,
    marginHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#F2EFEA',
  },
  searchInput: {
    flex: 1,
    padding: 0,
    color: colors.ink,
    fontFamily: typography.family.body,
    fontSize: 12,
  },
  heroOuter: { marginTop: 32, marginHorizontal: 20 },
  hero: {
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: colors.forest,
    justifyContent: 'flex-end',
  },
  heroImage: { borderRadius: 12 },
  heroShade: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 25, 4, 0.48)',
  },
  heroCopy: { paddingHorizontal: 16, paddingBottom: 18, zIndex: 1 },
  heroEyebrow: {
    alignSelf: 'flex-start',
    color: colors.white,
    backgroundColor: colors.clay,
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 4,
    fontFamily: typography.family.bodyMedium,
    fontSize: 9,
    letterSpacing: 0.7,
  },
  heroTitle: {
    color: colors.white,
    fontFamily: typography.family.display,
    fontSize: 23,
    lineHeight: 28,
    marginTop: 8,
  },
  heroDescription: {
    color: 'rgba(255,255,255,0.92)',
    fontFamily: typography.family.body,
    fontSize: 11,
    lineHeight: 17,
    marginTop: 4,
    maxWidth: 285,
  },
  heroButton: {
    alignSelf: 'flex-start',
    marginTop: 10,
    borderRadius: 999,
    paddingHorizontal: 15,
    minHeight: 36,
  },
  heroButtonText: { fontSize: 10 },
  section: { marginTop: 48 },
  productList: { paddingHorizontal: 20, gap: 16, paddingBottom: 4 },
  noResults: {
    marginHorizontal: 18,
    paddingVertical: 20,
    color: colors.muted,
    fontFamily: typography.family.body,
    fontSize: 13,
  },
  brandsSection: { marginTop: 38 },
  brandList: { paddingHorizontal: 8, gap: 13 },
  brandPlaceholder: {
    width: 66,
    height: 66,
    borderRadius: 33,
    borderWidth: 1,
    borderColor: '#AFB1B6',
    backgroundColor: '#EFEFF0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  catalogSection: { marginTop: 38 },
  catalogCount: {
    color: colors.muted,
    fontFamily: typography.family.body,
    fontSize: 11,
    marginHorizontal: 20,
    marginTop: 6,
    marginBottom: 14,
  },
  catalogActions: {
    flexDirection: 'row',
    gap: 10,
    marginHorizontal: 18,
    marginTop: 16,
  },
  catalogAction: {
    flex: 1,
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: 9,
  },
  catalogActionText: { flexShrink: 1, color: colors.ink, fontSize: 10, fontWeight: '700' },
  emptyProducts: {
    color: colors.muted,
    fontFamily: typography.family.body,
    fontSize: 12,
    textAlign: 'center',
    paddingVertical: 28,
    paddingHorizontal: 20,
  },
  productGrid: { paddingHorizontal: 16, gap: 12 },
  productGridRow: { flexDirection: 'row', gap: 12, alignItems: 'stretch' },
  gridPlaceholder: { flex: 1 },
  pagination: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginTop: 20,
  },
  pageButton: {
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: 10,
  },
  pageButtonDisabled: { opacity: 0.45 },
  pageButtonText: { color: colors.forest, fontSize: 11, fontWeight: '700' },
  pageIndicator: { color: colors.mutedStrong, fontSize: 11, fontWeight: '600' },
  modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(20, 25, 18, 0.38)' },
  modalSheet: {
    maxHeight: '75%',
    backgroundColor: colors.canvas,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 26,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  modalHandle: {
    width: 42,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    color: colors.ink,
    fontFamily: typography.family.display,
    fontSize: 21,
    fontWeight: '700',
    marginBottom: 12,
  },
  modalOption: {
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalOptionText: { color: colors.ink, fontSize: 12 },
});
