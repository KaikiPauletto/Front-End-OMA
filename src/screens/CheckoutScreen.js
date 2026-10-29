import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useCart } from '../contexts/CartContext';
import { colors } from '../theme/colors';

export function CheckoutScreen({ navigation }) {
  const { items } = useCart();

  if (items.length === 0) {
    return (
      <View style={styles.container}>
        <Pressable onPress={() => navigation.goBack()} style={styles.back}>
          <Ionicons name="arrow-back" size={21} color={colors.forest} />
        </Pressable>
        <Text style={styles.title}>Sua sacola está vazia</Text>
        <Text style={styles.description}>Adicione produtos antes de iniciar o checkout.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Pressable onPress={() => navigation.goBack()} style={styles.back}>
        <Ionicons name="arrow-back" size={21} color={colors.forest} />
      </Pressable>
      <View style={styles.iconCircle}>
        <Ionicons name="construct-outline" size={33} color={colors.forest} />
      </View>
      <Text style={styles.title}>Checkout conectado em breve</Text>
      <Text style={styles.description}>
        Endereço, frete, reserva de estoque e pagamento dependem da integração com o backend.
        Nenhum pedido ou pagamento será confirmado nesta versão.
      </Text>
      <View style={styles.notice}>
        <Ionicons name="shield-checkmark-outline" size={19} color={colors.forest} />
        <Text style={styles.noticeText}>
          Preços, disponibilidade e aprovação do pagamento serão validados pelo sistema.
        </Text>
      </View>
      <Pressable onPress={() => navigation.navigate('Login')} style={styles.loginButton}>
        <Text style={styles.loginButtonText}>Entrar ou criar conta</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', paddingHorizontal: 28, backgroundColor: colors.canvas },
  back: {
    position: 'absolute',
    top: 54,
    left: 22,
    width: 43,
    height: 43,
    borderRadius: 15,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircle: {
    width: 75,
    height: 75,
    borderRadius: 38,
    backgroundColor: colors.sage,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 22,
  },
  title: { color: colors.ink, fontSize: 23, fontWeight: '800', textAlign: 'center' },
  description: { color: colors.muted, fontSize: 14, lineHeight: 22, textAlign: 'center', marginTop: 12 },
  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 25,
    padding: 15,
    borderRadius: 16,
    backgroundColor: colors.sage,
  },
  noticeText: { flex: 1, color: colors.forest, fontSize: 11, lineHeight: 17, fontWeight: '600' },
  loginButton: {
    alignItems: 'center',
    paddingVertical: 15,
    marginTop: 16,
    backgroundColor: colors.forest,
    borderRadius: 15,
  },
  loginButtonText: { color: colors.white, fontSize: 13, fontWeight: '800' },
});
