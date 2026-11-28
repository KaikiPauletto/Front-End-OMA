import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppHeader } from '../components/AppHeader';
import { SimulatedPaymentNotice } from '../components/SimulatedPaymentNotice';
import { useAuth } from '../contexts/AuthContext';
import { useOrders } from '../contexts/OrdersContext';
import { clearPendingPaymentReturn, savePendingPaymentReturn } from '../services/browserSession';
import { getPaymentStatus } from '../services/ordersService.js';
import {
  describePaymentStatus,
  parsePaymentReturnParams,
  pollPaymentStatus,
} from '../services/paymentReturn.js';
import { colors } from '../theme/colors';
import { formatCurrency } from '../utils/formatCurrency';

const ORDERS_ROUTE = {
  index: 0,
  routes: [{
    name: 'MainTabs',
    state: {
      routes: [{
        name: 'Conta',
        state: { index: 1, routes: [{ name: 'ContaHome' }, { name: 'Pedidos' }] },
      }],
    },
  }],
};

const visuals = {
  checking: { icon: 'time-outline', color: colors.forest },
  pending: { icon: 'time-outline', color: colors.gold },
  approved: { icon: 'checkmark-circle', color: colors.forest },
  failed: { icon: 'close-circle', color: colors.danger },
  cancel: { icon: 'arrow-undo-circle-outline', color: colors.clay },
  error: { icon: 'alert-circle', color: colors.danger },
  unauthorized: { icon: 'lock-closed-outline', color: colors.danger },
};

// Tela de retorno do Stripe: payment/success|cancel?order_id=<id>&session_id=<id>.
// O pedido é lido da URL, não do estado em memória, para funcionar após o reload.
export function PaymentResultScreen({ navigation, route }) {
  const { token, signOut } = useAuth();
  const { refreshOrders } = useOrders();
  const parsed = parsePaymentReturnParams(route.params);
  const orderId = parsed.ok ? parsed.orderId : null;
  const isSuccessReturn = parsed.ok && parsed.result === 'success';
  const [view, setView] = useState(() => (
    !parsed.ok
      ? { kind: 'error', title: 'Não foi possível validar', message: parsed.message }
      : parsed.result === 'cancel'
        ? {
          kind: 'cancel',
          title: 'Pagamento não concluído',
          message: 'Você saiu do Stripe antes de pagar. O pedido continua aguardando pagamento em Meus pedidos.',
        }
        : { kind: 'checking', title: 'Validando pagamento', message: 'Consultando o pagamento no servidor...' }
  ));
  const [payment, setPayment] = useState(null);
  const [isPolling, setIsPolling] = useState(false);
  const [pollKey, setPollKey] = useState(0);
  const refreshOrdersRef = useRef(refreshOrders);
  refreshOrdersRef.current = refreshOrders;

  useEffect(() => {
    clearPendingPaymentReturn();
  }, []);

  useEffect(() => {
    if (!isSuccessReturn || !token) {
      return undefined;
    }

    let active = true;
    setIsPolling(true);

    pollPaymentStatus({
      orderId,
      getStatus: (id) => getPaymentStatus(id, token),
      isActive: () => active,
      onUpdate: ({ payment: nextPayment, description, error }) => {
        if (!active) {
          return;
        }
        if (nextPayment) {
          setPayment(nextPayment);
        }
        if (description) {
          setView(description);
        } else if (error) {
          setView((current) => ({
            ...current,
            message: 'Falha ao consultar o pagamento. Tentando de novo...',
          }));
        }
      },
    }).then((result) => {
      if (!active) {
        return;
      }
      setIsPolling(false);
      if (result.outcome === 'approved') {
        refreshOrdersRef.current?.();
      } else if (result.outcome === 'unauthorized') {
        setView({
          kind: 'unauthorized',
          title: 'Sessão expirada',
          message: 'Entre novamente para confirmar o pagamento deste pedido.',
        });
      } else if (result.outcome === 'error') {
        setView({
          kind: 'error',
          title: 'Não foi possível validar',
          message: 'O servidor não respondeu à consulta do pagamento. Tente verificar novamente.',
        });
      } else if (result.outcome === 'timeout') {
        setView({
          ...describePaymentStatus(result.status),
          message: 'O Stripe ainda não confirmou o pagamento. A confirmação chega pelo webhook e pode levar alguns instantes.',
        });
      }
    });

    return () => {
      active = false;
    };
  }, [isSuccessReturn, orderId, pollKey, token]);

  const goToOrders = useCallback(() => {
    navigation.reset(ORDERS_ROUTE);
  }, [navigation]);

  const signInAgain = useCallback(async () => {
    await signOut();
    // signOut limpa o retorno pendente; grava de novo para voltar aqui após o login.
    if (parsed.ok) {
      savePendingPaymentReturn({
        result: parsed.result,
        orderId: parsed.orderId,
        sessionId: parsed.sessionId,
      });
    }
  }, [parsed.ok, parsed.orderId, parsed.result, parsed.sessionId, signOut]);

  const visual = visuals[view.kind] ?? visuals.checking;
  const isUnauthorized = view.kind === 'unauthorized';
  const isErrorView = ['error', 'failed', 'unauthorized'].includes(view.kind);
  const canRetry = isSuccessReturn && !isPolling && !isUnauthorized &&
    view.kind !== 'approved' && view.kind !== 'failed';

  return (
    <View style={styles.screen}>
      <AppHeader navigation={navigation} showMenu={false} title="Pagamento" />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          {view.kind === 'checking' ? (
            <ActivityIndicator size="large" color={visual.color} />
          ) : (
            <Ionicons name={visual.icon} size={54} color={visual.color} />
          )}
          <Text accessibilityRole="header" style={styles.title}>{view.title}</Text>
          {orderId ? <Text style={styles.order}>Pedido #{orderId}</Text> : null}
          <Text
            accessibilityLiveRegion="polite"
            accessibilityRole={isErrorView ? 'alert' : undefined}
            style={[styles.message, isErrorView && styles.errorMessage]}
          >
            {view.message}
          </Text>
          {payment && Number.isFinite(payment.amount) && payment.currency === 'BRL' ? (
            <Text style={styles.amount}>{formatCurrency(payment.amount)}</Text>
          ) : null}
          <SimulatedPaymentNotice provider={payment?.provider} style={styles.notice} />
          {isPolling && view.kind !== 'checking' ? (
            <View style={styles.pollingRow}>
              <ActivityIndicator size="small" color={colors.muted} />
              <Text style={styles.pollingText}>Verificando a cada 2 segundos...</Text>
            </View>
          ) : null}
        </View>

        {canRetry ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              setView({ kind: 'checking', title: 'Validando pagamento', message: 'Consultando o pagamento no servidor...' });
              setPollKey((key) => key + 1);
            }}
            style={styles.secondaryButton}
          >
            <Text style={styles.secondaryButtonText}>Verificar novamente</Text>
          </Pressable>
        ) : null}
        {isUnauthorized ? (
          <Pressable accessibilityRole="button" onPress={signInAgain} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>Entrar novamente</Text>
          </Pressable>
        ) : (
          <Pressable accessibilityRole="button" onPress={goToOrders} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>Ver meus pedidos</Text>
          </Pressable>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas },
  content: { padding: 20, gap: 14, flexGrow: 1, justifyContent: 'center' },
  card: {
    alignItems: 'center',
    gap: 8,
    padding: 24,
    borderRadius: 18,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  title: { color: colors.ink, fontSize: 20, fontWeight: '800', marginTop: 6, textAlign: 'center' },
  order: { color: colors.muted, fontSize: 12, fontWeight: '700' },
  message: { color: colors.mutedStrong, fontSize: 13, lineHeight: 19, textAlign: 'center' },
  errorMessage: { color: colors.danger },
  amount: { color: colors.forest, fontSize: 16, fontWeight: '800', marginTop: 4 },
  notice: { textAlign: 'center' },
  pollingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  pollingText: { color: colors.muted, fontSize: 11 },
  primaryButton: {
    minHeight: 46,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 13,
    backgroundColor: colors.forest,
  },
  primaryButtonText: { color: colors.white, fontSize: 13, fontWeight: '800' },
  secondaryButton: {
    minHeight: 46,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 13,
    borderWidth: 1,
    borderColor: colors.forest,
  },
  secondaryButtonText: { color: colors.forest, fontSize: 13, fontWeight: '800' },
});
