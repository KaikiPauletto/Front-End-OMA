import { useEffect, useMemo } from 'react';
import { savePendingPaymentReturn } from '../services/browserSession';
import { parsePaymentReturnParams } from '../services/paymentReturn.js';
import { LoginScreen } from './LoginScreen';

// Retorno do Stripe sem sessão ativa: guarda o pedido da URL e mostra o login
// no próprio lugar (sem redirecionar). Após o login, o RootNavigator abre
// PaymentResult com o mesmo order_id.
export function PaymentReturnGateScreen({ navigation, route }) {
  const parsed = useMemo(() => parsePaymentReturnParams(route.params), [route.params]);

  useEffect(() => {
    if (parsed.ok) {
      savePendingPaymentReturn({
        result: parsed.result,
        orderId: parsed.orderId,
        sessionId: parsed.sessionId,
      });
    }
  }, [parsed]);

  return (
    <LoginScreen
      navigation={navigation}
      route={{
        ...route,
        params: parsed.ok ? { paymentReturnOrderId: parsed.orderId } : {},
      }}
    />
  );
}
