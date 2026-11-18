import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppHeader } from '../components/AppHeader';
import { listCategories, listSubcategories } from '../services/productService';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';

export function SubcategoriesScreen({ navigation, route }) {
  const categoryId = String(route.params?.categoryId ?? '');
  const [category, setCategory] = useState(null);
  const [subcategories, setSubcategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');

    Promise.all([listCategories(), listSubcategories(categoryId)])
      .then(([categories, categorySubcategories]) => {
        if (!active) {
          return;
        }

        const foundCategory = categories.find((item) => item.id === categoryId);
        if (!foundCategory) {
          setCategory(null);
          setSubcategories([]);
          setError('Categoria não encontrada.');
          return;
        }
        setCategory(foundCategory);
        setSubcategories(categorySubcategories);
      })
      .catch((loadError) => {
        if (active) {
          setError(loadError instanceof Error ? loadError.message : 'Não foi possível carregar as subcategorias.');
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [categoryId, reloadKey]);

  if (loading || error || !category) {
    return (
      <View style={styles.screen}>
        <AppHeader navigation={navigation} title={category?.name ?? 'Categorias'} showBack />
        {loading ? (
          <ActivityIndicator style={styles.state} color={colors.forest} />
        ) : (
          <View style={styles.state}>
            <Text style={styles.empty}>{error || 'Categoria não encontrada.'}</Text>
            {error && error !== 'Categoria não encontrada.' ? (
              <Pressable onPress={() => setReloadKey((key) => key + 1)}>
                <Text style={styles.retry}>Tentar novamente</Text>
              </Pressable>
            ) : null}
          </View>
        )}
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <AppHeader navigation={navigation} title={category.name} showBack />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.intro}>
          <View style={styles.iconCircle}>
            <Ionicons name="grid-outline" size={22} color={colors.forest} />
          </View>
          <Text style={styles.heading}>{category.name}</Text>
        </View>

        <Pressable
          style={styles.allCard}
          onPress={() => navigation.navigate('Produtos', { categoryId: category.id })}
        >
          <Text style={styles.allTitle}>Ver todos de {category.name}</Text>
          <Ionicons name="arrow-forward" size={18} color={colors.forest} />
        </Pressable>

        <Text style={styles.sectionLabel}>ESCOLHA UM TIPO</Text>
        {subcategories.map((subcategory) => (
            <Pressable
              key={subcategory.id}
              onPress={() => navigation.navigate('Produtos', {
                categoryId: category.id,
                subcategoryId: subcategory.id,
              })}
              style={({ pressed }) => [styles.subcategoryCard, pressed && styles.pressed]}
            >
              <View style={styles.bullet} />
              <Text style={styles.subcategoryName}>{subcategory.name}</Text>
              <Ionicons name="chevron-forward" size={17} color={colors.muted} />
            </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas },
  content: { paddingHorizontal: 18, paddingBottom: 28 },
  intro: { alignItems: 'center', paddingTop: 25, paddingBottom: 18 },
  iconCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: colors.sage,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 11,
  },
  heading: { color: colors.ink, fontFamily: typography.family.display, fontSize: 25 },
  allCard: {
    minHeight: 52,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.sage,
    borderRadius: 9,
    paddingHorizontal: 15,
    marginBottom: 25,
  },
  allTitle: { color: colors.forest, fontWeight: '700', fontSize: 12 },
  sectionLabel: { color: colors.muted, fontSize: 10, fontWeight: '700', letterSpacing: 1.2, marginBottom: 10 },
  subcategoryCard: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 13,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: '#EFEAE4',
    borderRadius: 9,
    marginBottom: 8,
  },
  pressed: { opacity: 0.8 },
  bullet: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.clay, marginRight: 11 },
  subcategoryName: { flex: 1, color: colors.ink, fontSize: 13, fontWeight: '600' },
  empty: { padding: 24, color: colors.muted, textAlign: 'center' },
  state: { alignItems: 'center', paddingVertical: 28, paddingHorizontal: 20 },
  retry: { color: colors.forest, fontSize: 12, fontWeight: '700', marginTop: 10 },
});
