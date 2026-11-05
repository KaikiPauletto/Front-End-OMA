import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { colors } from '../theme/colors';

const options = [
  { icon: 'receipt-outline', label: 'Meus pedidos', destination: 'Pedidos' },
  { icon: 'location-outline', label: 'Endereços', destination: null },
  { icon: 'help-circle-outline', label: 'Ajuda e suporte', destination: null },
];

export function ProfileScreen({ navigation }) {
  const { user, signOut } = useAuth();
  const isAdministrator = user?.role === 'ADMINISTRADOR';
  const profileOptions = isAdministrator
    ? []
    : options;

  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Minha conta</Text>
      <View style={styles.profileCard}>
        <View style={styles.avatar}>
          <Ionicons name="person-outline" size={26} color={colors.forest} />
        </View>
        <View style={styles.profileCopy}>
          <Text style={styles.profileTitle}>{user?.email}</Text>
          <Text style={styles.profileDescription}>
            {isAdministrator ? 'Vendedor' : 'Cliente'}
          </Text>
        </View>
      </View>
      {profileOptions.length > 0 ? (
        <View style={styles.menu}>
          {profileOptions.map((option) => (
            <Pressable
              key={option.label}
              onPress={() => {
                if (option.destination) {
                  navigation.navigate(option.destination);
                } else {
                  Alert.alert('Em breve', 'Esta opção será disponibilizada futuramente.');
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
      ) : null}
      <Pressable accessibilityRole="button" onPress={signOut} style={styles.logoutButton}>
        <Text style={styles.logoutText}>Sair da conta</Text>
      </Pressable>
      {!isAdministrator ? <Text style={styles.version}>OMA · Artigos gaúchos</Text> : null}
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
  logoutButton: {
    alignItems: 'center',
    marginTop: 16,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  logoutText: { color: colors.clay, fontSize: 12, fontWeight: '800' },
  version: { marginTop: 'auto', color: colors.muted, textAlign: 'center', fontSize: 10, paddingBottom: 5 },
});
