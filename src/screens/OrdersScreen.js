import { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  AppState,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { AppHeader } from '../components/AppHeader';
import { EmptyState } from '../components/EmptyState';
import { useAuth } from '../contexts/AuthContext';
import { useOrders } from '../contexts/OrdersContext';
import {
  createCheckoutSession,
  getPaymentStatus,
} from '../services/ordersService.js';
import { colors } from '../theme/colors';
import { formatCurrency } from '../utils/formatCurrency';

const orderStatusLabels = {
  RESERVATION_PENDING: 'Preparando reserva',
  PENDING_PAYMENT: 'Aguardando pagamento',
  CONFIRMED: 'Confirmado',
  CANCELLED: 'Cancelado',
  EXPIRED: 'Expirado',
  FAILED: 'Falha ao criar pedido',
  LEGACY: 'Pedido anterior',
};

const paymentStatusLabels = {
  NOT_STARTED: 'Pagamento ainda não iniciado',
  CREATED: 'Iniciando pagamento',
  PENDING: 'Pagamento aguardando confirmação',
  APPROVED: 'Pagamento aprovado',
  FAILED: 'Pagamento recusado',
  EXPIRED: 'Sessão de pagamento expirada',
  CANCELLED: 'Pagamento cancelado',
  REFUNDED: 'Pagamento estornado',
};

function formatOrderDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Data indisponível' : date.toLocaleString('pt-BR');
}

export function OrdersScreen({ navigation }) {
  const { token } = useAuth();
  const { orders, status, error, refreshOrders } = useOrders();
  const [paymentStatuses, setPaymentStatuses] = useState({});
  const [paymentErrors, setPaymentErrors] = useState({});
  const [pendingActionOrderId, setPendingActionOrderId] = useState(null);
  const activePaymentOrderIdRef = useRef(null);

  const checkPayment = useCallback(async (orderId, pollUntilFinal = false) => {
    if (!token) {
      return;
    }

    setPendingActionOrderId(orderId);
    setPaymentErrors((current) => ({ ...current, [orderId]: '' }));
    try {
      let payment = null;
      for (let attempt = 0; attempt < (pollUntilFinal ? 15 : 1); attempt += 1) {
        if (pollUntilFinal && AppState.currentState !== 'active') {
          break;
        }
        payment = await getPaymentStatus(orderId, token);
        setPaymentStatuses((current) => ({
          ...current,
          [orderId]: payment?.status ?? 'NOT_STARTED',
        }));
        if (!payment || !['CREATED', 'PENDING'].includes(payment.status)) {
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
      await refreshOrders();
    } catch (requestError) {
      setPaymentErrors((current) => ({
        ...current,
        [orderId]: requestError instanceof Error
          ? requestError.message
          : 'Não foi possível consultar o pagamento.',
      }));
    } finally {
      setPendingActionOrderId(null);
    }
  }, [refreshOrders, token]);

  useFocusEffect(useCallback(() => {
    refreshOrders();
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState !== 'active') {
        return;
      }
      refreshOrders();
      if (activePaymentOrderIdRef.current) {
        checkPayment(activePaymentOrderIdRef.current, true);
      }
    });

    return () => {
      activePaymentOrderIdRef.current = null;
      subscription.remove();
    };
  }, [checkPayment, refreshOrders]));

  async function handlePay(orderId) {
    if (!token) {
      setPaymentErrors((current) => ({
        ...current,
        [orderId]: 'Sua sessão expirou. Entre novamente para continuar.',
      }));
      return;
    }

    setPendingActionOrderId(orderId);
    setPaymentErrors((current) => ({ ...current, [orderId]: '' }));
    activePaymentOrderIdRef.current = orderId;
    try {
      const session = await createCheckoutSession(orderId, token);
      await Linking.openURL(session.checkoutUrl);
      setPaymentStatuses((current) => ({ ...current, [orderId]: 'PENDING' }));
    } catch (requestError) {
      activePaymentOrderIdRef.current = null;
      setPaymentErrors((current) => ({
        ...current,
        [orderId]: requestError instanceof Error
          ? requestError.message
          : 'Não foi possível abrir o checkout do Stripe.',
      }));
    } finally {
      setPendingActionOrderId(null);
    }
  }

  const loading = status === 'loading' && orders.length === 0;

  return (
    <View style={styles.screen}>
      <AppHeader
        navigation={navigation}
        onBackPress={() => navigation.goBack()}
        showBack
        showMenu={false}
        title="Meus pedidos"
      />
      {loading ? (
        <View style={styles.centeredState}>
          <ActivityIndicator color={colors.forest} />
          <Text style={styles.stateText}>Carregando seus pedidos...</Text>
        </View>
      ) : orders.length === 0 ? (
        <View style={styles.emptyContainer}>
          {error ? (
            <>
              <Text accessibilityRole="alert" style={styles.errorText}>{error}</Text>
              <Pressable
                accessibilityRole="button"
                disabled={status === 'refreshing'}
                onPress={refreshOrders}
                style={styles.retryButton}
              >
                <Text style={styles.retryButtonText}>
                  {status === 'refreshing' ? 'Atualizando...' : 'Tentar novamente'}
                </Text>
              </Pressable>
            </>
          ) : (
            <EmptyState
              icon="receipt-outline"
              title="Seus pedidos vão aparecer aqui"
              description="Os pedidos concluídos ficarão salvos na sua conta."
            />
          )}
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          {error ? <Text accessibilityRole="alert" style={styles.errorText}>{error}</Text> : null}
          <Pressable
            accessibilityRole="button"
            disabled={status === 'refreshing'}
            onPress={refreshOrders}
            style={styles.refreshButton}
          >
            <Text style={styles.refreshButtonText}>
              {status === 'refreshing' ? 'Atualizando pedidos...' : 'Atualizar pedidos'}
            </Text>
          </Pressable>
          {orders.map((order) => {
            const paymentStatus = paymentStatuses[order.id];
            const isPending = order.status === 'PENDING_PAYMENT';
            const isBusy = pendingActionOrderId === order.id;
            return (
              <View key={order.id} style={styles.orderCard}>
                <Text style={styles.orderTitle}>Pedido #{order.id}</Text>
                <Text style={styles.orderDate}>{formatOrderDate(order.createdAt)}</Text>
                <Text style={styles.status}>
                  {orderStatusLabels[order.status] ?? order.status}
                </Text>
                {paymentStatus ? (
                  <Text style={styles.paymentStatus}>
                    {paymentStatusLabels[paymentStatus] ?? paymentStatus}
                  </Text>
                ) : null}
                {order.items.map((item) => (
                  <View key={item.key} style={styles.itemRow}>
                    <View style={styles.itemDescription}>
                      <Text style={styles.productName}>{item.productName}</Text>
                      <Text style={styles.quantity}>Quantidade: {item.quantity}</Text>
                    </View>
                    <Text style={styles.itemPrice}>
                      {item.lineTotal === null ? '—' : formatCurrency(item.lineTotal)}
                    </Text>
                  </View>
                ))}
                <View style={styles.divider} />
                {order.subtotalAmount !== null ? (
                  <Text style={styles.total}>
                    Subtotal · {formatCurrency(order.subtotalAmount)}
                  </Text>
                ) : null}
                {order.shippingAmount !== null ? (
                  <Text style={styles.total}>
                    Frete · {formatCurrency(order.shippingAmount)}
                  </Text>
                ) : null}
                <Text style={styles.total}>
                  Total · {formatCurrency(order.totalAmount)}
                </Text>
                <Text style={styles.address}>
                  Entrega: {order.address.street}, {order.address.number} · {order.address.neighborhood},{' '}
                  {order.address.city} - {order.address.state} · CEP {order.address.zipCode}
                </Text>

                {isPending ? (
                  <View style={styles.actions}>
                    <Pressable
                      accessibilityRole="button"
                      disabled={isBusy}
                      onPress={() => handlePay(order.id)}
                      style={[styles.actionButton, isBusy && styles.disabledButton]}
                    >
                      <Text style={styles.actionButtonText}>
                        {isBusy ? 'Aguarde...' : 'Pagar com cartão'}
                      </Text>
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      disabled={isBusy}
                      onPress={() => checkPayment(order.id)}
                      style={styles.checkButton}
                    >
                      <Text style={styles.checkButtonText}>Verificar pagamento</Text>
                    </Pressable>
                  </View>
                ) : null}
                {paymentErrors[order.id] ? (
                  <Text accessibilityRole="alert" style={styles.paymentError}>
                    {paymentErrors[order.id]}
                  </Text>
                ) : null}
              </View>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas },
  list: { padding: 18, gap: 12, paddingBottom: 24 },
  emptyContainer: { flex: 1, justifyContent: 'center', paddingHorizontal: 20 },
  centeredState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  stateText: { color: colors.muted, fontSize: 12 },
  errorText: { color: colors.danger, fontSize: 12, lineHeight: 18, textAlign: 'center' },
  retryButton: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    borderRadius: 13,
    backgroundColor: colors.forest,
  },
  retryButtonText: { color: colors.white, fontSize: 12, fontWeight: '800' },
  refreshButton: { alignSelf: 'flex-end', paddingVertical: 8, paddingHorizontal: 5 },
  refreshButtonText: { color: colors.forest, fontSize: 11, fontWeight: '800' },
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
  paymentStatus: { color: colors.forest, fontSize: 11, fontWeight: '700', marginTop: 5 },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, marginTop: 12 },
  itemDescription: { flex: 1 },
  productName: { color: colors.ink, fontSize: 12, fontWeight: '700' },
  quantity: { color: colors.muted, fontSize: 10, marginTop: 3 },
  itemPrice: { color: colors.ink, fontSize: 11, fontWeight: '700' },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 12 },
  total: { color: colors.ink, fontSize: 12, fontWeight: '800', marginBottom: 3 },
  address: { color: colors.muted, fontSize: 10, lineHeight: 15, marginTop: 8 },
  actions: { gap: 8, marginTop: 14 },
  actionButton: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: colors.forest,
  },
  disabledButton: { opacity: 0.6 },
  actionButtonText: { color: colors.white, fontSize: 11, fontWeight: '800' },
  checkButton: {
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  checkButtonText: { color: colors.forest, fontSize: 11, fontWeight: '800' },
  paymentError: { color: colors.danger, fontSize: 10, lineHeight: 15, marginTop: 9 },
});
