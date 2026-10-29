import { useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ProductCard } from '../components/ProductCard';
import { SectionTitle } from '../components/SectionTitle';
import { categories, getAvailableProducts } from '../data/products';
import { colors } from '../theme/colors';

export function HomeScreen({ navigation }) {
  const [category, setCategory] = useState('todos');
  const [search, setSearch] = useState('');
  const availableProducts = useMemo(() => getAvailableProducts(), []);
  const filteredProducts = availableProducts.filter((product) => {
    const matchesCategory = category === 'todos' || product.category === category;
    const matchesSearch = product.name.toLowerCase().includes(search.trim().toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="dark-content" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.topBar}>
          <View>
            <Text style={styles.greeting}>A tradição mora aqui</Text>
            <Text style={styles.brand}>oma<Text style={styles.brandDot}>.</Text></Text>
          </View>
          <Pressable
            accessibilityLabel="Abrir sacola"
            onPress={() => navigation.navigate('Sacola')}
            style={styles.bagButton}
          >
            <Ionicons name="bag-handle-outline" size={22} color={colors.forest} />
          </Pressable>
        </View>

        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={19} color={colors.muted} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="O que você está procurando?"
            placeholderTextColor={colors.muted}
            style={styles.searchInput}
            returnKeyType="search"
          />
        </View>

        <View style={styles.hero}>
          <View style={styles.heroCopy}>
            <Text style={styles.heroEyebrow}>FEITO DE TRADIÇÃO</Text>
            <Text style={styles.heroTitle}>O ritual{'\n'}do teu jeito.</Text>
            <Text style={styles.heroDescription}>Artigos gaúchos para acompanhar cada mate.</Text>
            <Pressable
              onPress={() => {
                setCategory('todos');
                setSearch('');
              }}
              style={styles.heroButton}
            >
              <Text style={styles.heroButtonText}>Explorar loja</Text>
              <Ionicons name="arrow-forward" size={15} color={colors.forest} />
            </Pressable>
          </View>
          <Text style={styles.heroArt}>🧉</Text>
          <View style={styles.heroSun} />
        </View>

        <View style={styles.section}>
          <SectionTitle title="Categorias" />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryList}>
            {categories.map((item) => {
              const selected = category === item.id;
              return (
                <Pressable
                  key={item.id}
                  onPress={() => setCategory(item.id)}
                  style={[styles.categoryChip, selected && styles.categoryChipSelected]}
                >
                  <Ionicons
                    name={item.icon}
                    size={16}
                    color={selected ? colors.white : colors.forest}
                  />
                  <Text style={[styles.categoryLabel, selected && styles.categoryLabelSelected]}>
                    {item.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        <View style={styles.section}>
          <SectionTitle
            title={search ? 'Resultados' : 'Escolhas da casa'}
            action="Ver coleção"
            onActionPress={() => {
              setCategory('todos');
              setSearch('');
            }}
          />
          {filteredProducts.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.productList}>
              {filteredProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onPress={() => navigation.navigate('ProductDetails', { productId: product.id })}
                />
              ))}
            </ScrollView>
          ) : (
            <Text style={styles.noResults}>Não encontramos produtos nessa busca.</Text>
          )}
        </View>

        <View style={styles.note}>
          <Ionicons name="leaf-outline" size={18} color={colors.forest} />
          <Text style={styles.noteText}>Peças com história, feitas para durar.</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas },
  content: { paddingTop: 16, paddingBottom: 30 },
  topBar: {
    paddingHorizontal: 22,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  greeting: { fontSize: 12, color: colors.muted, marginBottom: 1 },
  brand: { fontSize: 34, lineHeight: 38, fontWeight: '900', letterSpacing: -2, color: colors.forest },
  brandDot: { color: colors.clay },
  bagButton: {
    width: 46,
    height: 46,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBox: {
    height: 50,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 22,
    marginTop: 18,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 15,
    backgroundColor: colors.surface,
  },
  searchInput: { flex: 1, padding: 0, fontSize: 13, color: colors.ink },
  hero: {
    minHeight: 216,
    marginHorizontal: 22,
    marginTop: 20,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: colors.forest,
    flexDirection: 'row',
    alignItems: 'center',
  },
  heroCopy: { flex: 1, paddingLeft: 21, paddingVertical: 20, zIndex: 2 },
  heroEyebrow: { fontSize: 9, fontWeight: '800', letterSpacing: 1.8, color: '#DAB875' },
  heroTitle: { color: colors.white, fontSize: 29, lineHeight: 33, fontWeight: '800', marginTop: 9 },
  heroDescription: { color: '#DFE7DD', fontSize: 11, lineHeight: 16, maxWidth: 185, marginTop: 7 },
  heroButton: {
    marginTop: 14,
    backgroundColor: '#E8C483',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 9,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  heroButtonText: { fontSize: 11, color: colors.forest, fontWeight: '800' },
  heroArt: { fontSize: 79, marginRight: 13, zIndex: 1 },
  heroSun: {
    position: 'absolute',
    right: 7,
    top: 35,
    height: 145,
    width: 145,
    borderRadius: 73,
    backgroundColor: colors.forestLight,
  },
  section: { marginTop: 27 },
  categoryList: { paddingHorizontal: 22, gap: 9, paddingBottom: 2 },
  categoryChip: {
    height: 39,
    paddingHorizontal: 13,
    borderRadius: 22,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  categoryChipSelected: { backgroundColor: colors.forest, borderColor: colors.forest },
  categoryLabel: { color: colors.ink, fontSize: 11, fontWeight: '600' },
  categoryLabelSelected: { color: colors.white },
  productList: { paddingHorizontal: 22, gap: 12, paddingBottom: 4 },
  noResults: { color: colors.muted, marginHorizontal: 22, paddingVertical: 20 },
  note: {
    marginHorizontal: 22,
    marginTop: 24,
    padding: 15,
    borderRadius: 16,
    backgroundColor: colors.sage,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  noteText: { color: colors.forest, fontSize: 12, fontWeight: '700' },
});
