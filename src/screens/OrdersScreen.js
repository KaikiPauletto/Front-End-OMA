import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { EmptyState } from '../components/EmptyState';
import { useOrders } from '../contexts/OrdersContext';
import { colors } from '../theme/colors';
import { formatCurrency } from '../utils/formatCurrency';

export function OrdersScreen() {
  const { orders } = useOrders();

  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Meus pedidos</Text>
      {orders.length === 0 ? (
        <EmptyState
          icon="receipt-outline"
          title="Seus pedidos vão aparecer aqui"
          description="Os pedidos demonstrativos feitos durante esta execução serão listados aqui."
        />
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          {orders.map((order) => (
            <View key={order.id} style={styles.orderCard}>
              <Text style={styles.orderTitle}>Pedido demonstrativo</Text>
              <Text style={styles.orderDate}>
                {new Date(order.createdAt).toLocaleString('pt-BR')}
              </Text>
              <Text style={styles.status}>AGUARDANDO_PAGAMENTO · pendente</Text>
              {order.items.map((item) => (
                <View key={`${item.productId}:${item.variantId ?? 'default'}`} style={styles.itemRow}>
                  <View style={styles.itemDescription}>
                    <Text style={styles.productName}>{item.productName}</Text>
                    {item.variantName ? (
                      <Text style={styles.variantName}>{item.variantName}</Text>
                    ) : null}
                    <Text style={styles.quantity}>Quantidade: {item.quantity}</Text>
                  </View>
                  <Text style={styles.itemPrice}>{formatCurrency(item.lineTotal)}</Text>
                </View>
              ))}
              <View style={styles.divider} />
              <Text style={styles.total}>Subtotal · {formatCurrency(order.subtotal)}</Text>
              <Text style={styles.address}>
                Entrega: {order.address.street}, {order.address.number} · {order.address.neighborhood},{' '}
                {order.address.city} - {order.address.state}
                {order.address.postalCode ? ` · CEP ${order.address.postalCode}` : ''}
              </Text>
              <Text style={styles.notice}>
                Pagamento pendente. Frete e estoque não foram confirmados nesta demonstração.
              </Text>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas, paddingTop: 20 },
  title: { color: colors.ink, fontSize: 26, fontWeight: '800', paddingHorizontal: 22 },
  list: { padding: 18, gap: 12, paddingBottom: 24 },
  orderCard: {
    padding: 16,
    borderRadius: 18,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  orderTitle: { color: colors.ink, fontSize: 15, fontWeight: '800' },
  orderDate: { color: colors.muted, fontSize: 10, marginTop: 4 },
  status: { color: colors.clay, fontSize: 11, fontWeight: '800', marginTop: 9 },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, marginTop: 12 },
  itemDescription: { flex: 1 },
  productName: { color: colors.ink, fontSize: 12, fontWeight: '700' },
  variantName: { color: colors.muted, fontSize: 10, marginTop: 2 },
  quantity: { color: colors.muted, fontSize: 10, marginTop: 3 },
  itemPrice: { color: colors.ink, fontSize: 11, fontWeight: '700' },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 12 },
  total: { color: colors.ink, fontSize: 12, fontWeight: '800' },
  address: { color: colors.muted, fontSize: 10, lineHeight: 15, marginTop: 8 },
  notice: { color: colors.clay, fontSize: 10, lineHeight: 15, marginTop: 8 },
});
