import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

export function WelcomeScreen({ navigation }) {
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

          <Pressable
            accessibilityRole="button"
            onPress={() => navigation.navigate('Register')}
            style={styles.registerButton}
          >
            <Text style={styles.registerButtonText}>CRIAR CONTA</Text>
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
  registerButton: {
    height: 52,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: colors.forest,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
  },
  registerButtonText: {
    color: colors.forest,
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  demoNotice: {
    position: 'absolute',
    bottom: 24,
    alignSelf: 'center',
    color: colors.muted,
    fontSize: 10,
  },
});
