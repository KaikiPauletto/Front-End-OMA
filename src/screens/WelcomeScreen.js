import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

export function WelcomeScreen({ navigation }) {
  function handleGoogleAccess() {
    Alert.alert(
      'Google ainda não conectado',
      'A autenticação com Google será disponibilizada quando a integração estiver pronta.',
    );
  }

  return (
    <View style={styles.screen}>
      <View style={styles.content}>
        <View style={styles.logoContainer}>
          <Text style={styles.brand}>oma<Text style={styles.brandDot}>.</Text></Text>
          <Ionicons name="leaf" size={23} color={colors.clay} />
        </View>

        <View style={styles.heading}>
          <Text style={styles.title}>Buenas!</Text>
          <Text style={styles.title}>Seja bem-vindo(a)!</Text>
        </View>

        <View style={styles.actions}>
          <Pressable
            accessibilityRole="button"
            onPress={() => navigation.navigate('Login')}
            style={styles.primaryButton}
          >
            <Text style={styles.primaryButtonText}>ENTRAR</Text>
          </Pressable>

          <View style={styles.dividerRow}>
            <View style={styles.divider} />
            <Text style={styles.dividerText}>OU</Text>
            <View style={styles.divider} />
          </View>

          <Pressable
            accessibilityRole="button"
            onPress={handleGoogleAccess}
            style={styles.googleButton}
          >
            <Ionicons name="logo-google" size={16} color="#4285F4" />
            <Text style={styles.googleText}>Continue com Google</Text>
          </Pressable>
        </View>
      </View>

      <Text style={styles.demoNotice}>Aplicativo em modo de demonstração</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.canvas,
    paddingHorizontal: 22,
    justifyContent: 'center',
  },
  content: {
    width: '100%',
    alignItems: 'center',
  },
  logoContainer: {
    width: 112,
    height: 112,
    borderRadius: 24,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 82,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 3,
  },
  brand: {
    color: colors.forest,
    fontSize: 36,
    fontWeight: '900',
    letterSpacing: -2,
  },
  brandDot: { color: colors.clay },
  heading: {
    alignItems: 'center',
    marginBottom: 58,
  },
  title: {
    color: colors.ink,
    fontSize: 25,
    lineHeight: 34,
    fontWeight: '800',
    textAlign: 'center',
  },
  actions: { width: '100%' },
  primaryButton: {
    height: 54,
    borderRadius: 28,
    backgroundColor: colors.forest,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 25,
    marginBottom: 25,
  },
  divider: { flex: 1, height: 1, backgroundColor: colors.border },
  dividerText: { color: colors.muted, fontSize: 10 },
  googleButton: {
    height: 52,
    borderRadius: 28,
    backgroundColor: '#F0EEE9',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  googleText: { color: colors.ink, fontSize: 12, fontWeight: '600' },
  demoNotice: {
    position: 'absolute',
    bottom: 24,
    alignSelf: 'center',
    color: colors.muted,
    fontSize: 10,
  },
});
