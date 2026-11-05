import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppHeader } from '../components/AppHeader';
import { ProductImage } from '../components/ProductImage';
import { useSellerProducts } from '../contexts/SellerProductsContext';
import { getCategoryLabel } from '../data/categories';
import { colors } from '../theme/colors';

export function SellerProductsScreen({ navigation }) {
  const { products, removeProduct } = useSellerProducts();

  function confirmProductRemoval(product) {
    Alert.alert(
      'Excluir produto',
      `Deseja excluir "${product.name}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: () => removeProduct(product.id),
        },
      ],
    );
  }

  return (
    <View style={styles.screen}>
      <AppHeader
        navigation={navigation}
        onBackPress={() => navigation.goBack()}
        showBack
        showMenu={false}
        title="Minhas vendas"
      />
      <Text style={styles.subtitle}>Acompanhe os produtos cadastrados na sua loja.</Text>

      <ScrollView contentContainerStyle={styles.list}>
        {products.map((product) => {
          const isAvailable = product.quantity > 0;
          return (
            <View key={product.id} style={styles.productCard}>
              <ProductImage
                accessibilityLabel={product.name}
                fallbackEmoji="🧉"
                resizeMode="cover"
                source={product.image}
                style={styles.productImage}
              />
              <View style={styles.productDetails}>
                <View style={styles.statusRow}>
                  <View
                    style={[
                      styles.statusBadge,
                      isAvailable ? styles.availableBadge : styles.soldBadge,
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusText,
                        isAvailable ? styles.availableText : styles.soldText,
                      ]}
                    >
                      {isAvailable ? 'Disponível' : 'Vendido'}
                    </Text>
                  </View>
                  {isAvailable ? (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Excluir ${product.name}`}
                      onPress={() => confirmProductRemoval(product)}
                      style={styles.deleteButton}
                    >
                      <Ionicons name="trash-outline" size={18} color={colors.danger} />
                    </Pressable>
                  ) : null}
                </View>
                <Text numberOfLines={2} style={styles.productName}>{product.name}</Text>
                <Text style={styles.category}>{getCategoryLabel(product.category)}</Text>
                <Text style={styles.quantity}>
                  {isAvailable ? `${product.quantity} unidade(s)` : 'Sem unidades em estoque'}
                </Text>
              </View>
            </View>
          );
        })}
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          accessibilityRole="button"
          onPress={() => navigation.navigate('AdicionarProduto')}
          style={styles.addButton}
        >
          <Ionicons name="add" size={20} color={colors.white} />
          <Text style={styles.addButtonText}>Adicionar Produto</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas },
  subtitle: { color: colors.muted, fontSize: 13, marginTop: 7, paddingHorizontal: 22 },
  list: { padding: 18, gap: 12, paddingBottom: 20 },
  productCard: {
    flexDirection: 'row',
    minHeight: 116,
    padding: 10,
    borderRadius: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  productImage: { width: 92, height: 94, borderRadius: 12, backgroundColor: colors.surfaceMuted },
  productDetails: { flex: 1, marginLeft: 12, justifyContent: 'center' },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  deleteButton: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.clayLight,
  },
  statusBadge: { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4 },
  availableBadge: { backgroundColor: colors.sage },
  soldBadge: { backgroundColor: colors.clayLight },
  statusText: { fontSize: 10, fontWeight: '800' },
  availableText: { color: colors.forest },
  soldText: { color: colors.clay },
  productName: { color: colors.ink, fontSize: 13, fontWeight: '800', lineHeight: 18 },
  category: { color: colors.muted, fontSize: 11, marginTop: 3 },
  quantity: { color: colors.mutedStrong, fontSize: 10, marginTop: 4 },
  footer: {
    paddingHorizontal: 22,
    paddingTop: 12,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.canvas,
  },
  addButton: {
    minHeight: 52,
    borderRadius: 16,
    backgroundColor: colors.forest,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  addButtonText: { color: colors.white, fontSize: 14, fontWeight: '800' },
});
