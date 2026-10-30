import { useMemo, useState } from 'react';
import {
  Alert,
  ImageBackground,
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
import { useCart } from '../contexts/CartContext';
import { getAvailableProducts } from '../data/products';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';

const heroImage = { uri: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/1/18/Chimarr%C3%A3o_do_Ga%C3%BAcho.jpg/1280px-Chimarr%C3%A3o_do_Ga%C3%BAcho.jpg' };

const brandPlaceholders = ['Marca 1', 'Marca 2', 'Marca 3', 'Marca 4', 'Marca 5'];

export function HomeScreen({ navigation }) {
  const [search, setSearch] = useState('');
  const { width: screenWidth } = useWindowDimensions();
  const heroHeight = Math.min(400, Math.max(300, (screenWidth - 40) * (400 / 350)));
  const { addItem } = useCart();

  const availableProducts = useMemo(() => getAvailableProducts(), []);
  const featuredProducts = useMemo(
    () => availableProducts.slice().sort((a, b) => (a.salesRank ?? 999) - (b.salesRank ?? 999)).slice(0, 5),
    [availableProducts],
  );

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
      <AppHeader navigation={navigation} onMenuPress={() => navigation.navigate('Categorias')} />
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
      </ScrollView>
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
});
