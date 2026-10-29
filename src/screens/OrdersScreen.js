import { Pressable, StyleSheet, Text, View } from 'react-native';
import { EmptyState } from '../components/EmptyState';
import { colors } from '../theme/colors';

export function OrdersScreen({ navigation }) {
  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Meus pedidos</Text>
      <EmptyState
        icon="receipt-outline"
        title="Seus pedidos vão aparecer aqui"
        description="Entre na sua conta para acompanhar cada etapa da entrega."
      />
      <Pressable onPress={() => navigation.navigate('Login')} style={styles.button}>
        <Text style={styles.buttonText}>Entrar na minha conta</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas, paddingTop: 20 },
  title: { color: colors.ink, fontSize: 26, fontWeight: '800', paddingHorizontal: 22 },
  button: {
    alignSelf: 'center',
    marginTop: 2,
    backgroundColor: colors.forest,
    paddingHorizontal: 22,
    paddingVertical: 14,
    borderRadius: 15,
  },
  buttonText: { color: colors.white, fontSize: 13, fontWeight: '800' },
});
