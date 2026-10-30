import { ScrollView, StyleSheet, Text, Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppHeader } from '../components/AppHeader';
import { categories } from '../data/categories';
import { getAvailableProducts } from '../data/products';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';

export function CategoriesScreen({ navigation }) {
  const availableProducts = getAvailableProducts();

  return (
    <View style={styles.screen}>
      <AppHeader navigation={navigation} title="Categorias" showBack tone="forest" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.intro}>
          <Text style={styles.eyebrow}>EXPLORAR</Text>
          <Text style={styles.heading}>Encontre o essencial para a sua mateada.</Text>
          <View style={styles.rule} />
        </View>

        {categories.map((category) => {
          const productCount = availableProducts.filter((product) => product.category === category.id).length;
          return (
            <Pressable
              key={category.id}
              onPress={() => navigation.navigate('Subcategorias', { categoryId: category.id })}
              style={({ pressed }) => [styles.categoryCard, pressed && styles.pressed]}
            >
              <View style={styles.iconCircle}>
                <Ionicons name={category.icon} size={21} color={colors.forest} />
              </View>
              <View style={styles.categoryCopy}>
                <Text style={styles.categoryName}>{category.name}</Text>
                <Text style={styles.categoryDescription}>{category.description}</Text>
              </View>
              <View style={styles.trailing}>
                <Text style={styles.count}>{productCount}</Text>
                <Ionicons name="chevron-forward" size={19} color={colors.muted} />
              </View>
            </Pressable>
          );
        })}
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
  categoryDescription: { color: colors.muted, fontSize: 10, marginTop: 2 },
  trailing: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  count: { color: colors.muted, fontSize: 10 },
});
