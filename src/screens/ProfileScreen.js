import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

const options = [
  { icon: 'receipt-outline', label: 'Meus pedidos', destination: 'Pedidos' },
  { icon: 'location-outline', label: 'Endereços', destination: 'Login' },
  { icon: 'help-circle-outline', label: 'Ajuda e suporte', destination: null },
];

export function ProfileScreen({ navigation }) {
  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Minha conta</Text>
      <View style={styles.profileCard}>
        <View style={styles.avatar}>
          <Ionicons name="person-outline" size={26} color={colors.forest} />
        </View>
        <View style={styles.profileCopy}>
          <Text style={styles.profileTitle}>Entre para continuar</Text>
          <Text style={styles.profileDescription}>Acesse seus pedidos e dados de entrega.</Text>
        </View>
        <Pressable onPress={() => navigation.navigate('Login')} style={styles.loginButton}>
          <Text style={styles.loginText}>Entrar</Text>
        </Pressable>
      </View>
      <View style={styles.menu}>
        {options.map((option) => (
          <Pressable
            key={option.label}
            onPress={() => {
              if (option.destination) {
                navigation.navigate(option.destination);
              } else {
                Alert.alert('Em breve', 'As informações de suporte serão adicionadas.');
              }
            }}
            style={styles.option}
          >
            <Ionicons name={option.icon} size={20} color={colors.forest} />
            <Text style={styles.optionText}>{option.label}</Text>
            <Ionicons name="chevron-forward" size={17} color={colors.muted} />
          </Pressable>
        ))}
      </View>
      <Text style={styles.version}>OMA · Artigos gaúchos</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas, padding: 22, paddingTop: 20 },
  title: { color: colors.ink, fontSize: 26, fontWeight: '800' },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    padding: 15,
    borderRadius: 18,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.sage,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileCopy: { flex: 1, marginHorizontal: 10 },
  profileTitle: { color: colors.ink, fontSize: 12, fontWeight: '800' },
  profileDescription: { color: colors.muted, fontSize: 10, lineHeight: 15, marginTop: 3 },
  loginButton: { backgroundColor: colors.forest, borderRadius: 12, paddingHorizontal: 13, paddingVertical: 9 },
  loginText: { color: colors.white, fontSize: 11, fontWeight: '800' },
  menu: {
    marginTop: 19,
    paddingHorizontal: 15,
    backgroundColor: colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
  },
  option: {
    minHeight: 55,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  optionText: { flex: 1, color: colors.ink, fontSize: 12, fontWeight: '600' },
  version: { marginTop: 'auto', color: colors.muted, textAlign: 'center', fontSize: 10, paddingBottom: 5 },
});
