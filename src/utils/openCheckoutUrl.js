import { Linking, Platform } from 'react-native';

// Na web, abre o Stripe na mesma aba: a sessão fica no sessionStorage da aba,
// e o redirecionamento de volta (/payment/success) precisa encontrá-la.
// No celular, abre o navegador do sistema como antes.
export function openCheckoutUrl(url) {
  if (Platform.OS === 'web') {
    return Linking.openURL(url, '_self');
  }
  return Linking.openURL(url);
}
