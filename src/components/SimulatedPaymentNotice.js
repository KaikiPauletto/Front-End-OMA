import { StyleSheet, Text } from 'react-native';
import { colors } from '../theme/colors';

// Aviso exibido somente quando o backend informa provider "simulated".
export function SimulatedPaymentNotice({ provider, style }) {
  if (provider !== 'simulated') {
    return null;
  }
  return (
    <Text style={[styles.notice, style]}>
      Pagamento simulado (ambiente de demonstração)
    </Text>
  );
}

const styles = StyleSheet.create({
  notice: { color: colors.editorial, fontSize: 11, lineHeight: 16 },
});
