import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppHeader } from '../components/AppHeader';
import { listCategories } from '../services/productService';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';

export function CategoriesScreen({ navigation }) {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');

    listCategories()
      .then((result) => {
        if (active) {
          setCategories(result);
        }
      })
      .catch((loadError) => {
        if (active) {
          setError(loadError instanceof Error ? loadError.message : 'Não foi possível carregar as categorias.');
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
  }, [reloadKey]);

  return (
    <View style={styles.screen}>
      <AppHeader
        navigation={navigation}
        title="Categorias"
        showBack
        showMenu={false}
        tone="forest"
      />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.intro}>
          <Text style={styles.eyebrow}>EXPLORAR</Text>
          <Text style={styles.heading}>Encontre o essencial para a sua mateada.</Text>
          <View style={styles.rule} />
        </View>

        {loading ? (
          <ActivityIndicator style={styles.state} color={colors.forest} />
        ) : error ? (
          <View style={styles.state}>
            <Text style={styles.stateText}>{error}</Text>
            <Pressable onPress={() => setReloadKey((key) => key + 1)}>
              <Text style={styles.retry}>Tentar novamente</Text>
            </Pressable>
          </View>
        ) : categories.map((category) => (
            <Pressable
              key={category.id}
              onPress={() => navigation.navigate('Subcategorias', { categoryId: category.id })}
              style={({ pressed }) => [styles.categoryCard, pressed && styles.pressed]}
            >
              <View style={styles.iconCircle}>
                <Ionicons name="grid-outline" size={21} color={colors.forest} />
              </View>
              <View style={styles.categoryCopy}>
                <Text style={styles.categoryName}>{category.name}</Text>
              </View>
              <View style={styles.trailing}>
                <Ionicons name="chevron-forward" size={19} color={colors.muted} />
              </View>
            </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas },
  content: { paddingHorizontal: 22, paddingBottom: 28 },
  intro: { alignItems: 'center', paddingTop: 25, paddingBottom: 21 },
  eyebrow: {
    color: colors.muted,
    fontFamily: typography.family.bodyMedium,
    fontSize: 12,
    letterSpacing: 1.6,
  },
  heading: {
    color: colors.ink,
    fontFamily: typography.family.body,
    fontSize: 15,
    textAlign: 'center',
    marginTop: 10,
  },
  rule: { width: 54, height: 1, backgroundColor: colors.border, marginTop: 16 },
  categoryCard: {
    minHeight: 76,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: '#EFEAE4',
    paddingHorizontal: 13,
    paddingVertical: 11,
    marginBottom: 10,
  },
  pressed: { opacity: 0.82, transform: [{ scale: 0.995 }] },
  iconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.sage,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryCopy: { flex: 1, marginLeft: 13 },
  categoryName: {
    color: colors.ink,
    fontFamily: typography.family.display,
    fontSize: 21,
    fontWeight: '600',
  },
  trailing: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  state: { alignItems: 'center', paddingVertical: 28, paddingHorizontal: 20 },
  stateText: { color: colors.muted, fontSize: 12, textAlign: 'center' },
  retry: { color: colors.forest, fontSize: 12, fontWeight: '700', marginTop: 10 },
});
