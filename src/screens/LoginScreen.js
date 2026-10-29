import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

export function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  function handleSubmit() {
    if (!email.trim() || !password) {
      Alert.alert('Dados incompletos', 'Informe seu e-mail e sua senha.');
      return;
    }

    Alert.alert(
      'Acesso ainda não conectado',
      'O login será ativado quando a API de autenticação estiver disponível.',
    );
  }

  return (
    <View style={styles.screen}>
      <Pressable onPress={() => navigation.goBack()} style={styles.back}>
        <Ionicons name="arrow-back" size={21} color={colors.forest} />
      </Pressable>
      <Text style={styles.brand}>oma<Text style={styles.brandDot}>.</Text></Text>
      <Text style={styles.title}>Que bom te ver.</Text>
      <Text style={styles.subtitle}>Entre para acompanhar teus pedidos e continuar teu mate.</Text>

      <Text style={styles.label}>E-mail</Text>
      <TextInput
        autoCapitalize="none"
        keyboardType="email-address"
        onChangeText={setEmail}
        placeholder="voce@email.com"
        placeholderTextColor={colors.muted}
        style={styles.input}
        value={email}
      />
      <Text style={styles.label}>Senha</Text>
      <TextInput
        onChangeText={setPassword}
        placeholder="Sua senha"
        placeholderTextColor={colors.muted}
        secureTextEntry
        style={styles.input}
        value={password}
      />
      <Pressable onPress={handleSubmit} style={styles.submit}>
        <Text style={styles.submitText}>Entrar</Text>
      </Pressable>
      <Pressable
        onPress={() =>
          Alert.alert(
            'Google ainda não conectado',
            'A autenticação será configurada quando os dados do provedor estiverem disponíveis.',
          )
        }
        style={styles.googleButton}
      >
        <Text style={styles.googleText}>Continuar com Google</Text>
      </Pressable>
      <Pressable onPress={() => navigation.navigate('Register')} style={styles.registerLink}>
        <Text style={styles.registerText}>Ainda não tem conta? <Text style={styles.registerAction}>Criar conta</Text></Text>
      </Pressable>
      <Text style={styles.footnote}>
        Esta tela é apenas a estrutura visual. As credenciais ainda não são enviadas nem armazenadas.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas, paddingHorizontal: 25, justifyContent: 'center' },
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
  brand: { color: colors.forest, fontSize: 39, fontWeight: '900', letterSpacing: -2, textAlign: 'center' },
  brandDot: { color: colors.clay },
  title: { color: colors.ink, fontSize: 26, fontWeight: '800', textAlign: 'center', marginTop: 20 },
  subtitle: { color: colors.muted, fontSize: 13, lineHeight: 20, textAlign: 'center', marginTop: 8, marginBottom: 29 },
  label: { color: colors.ink, fontSize: 12, fontWeight: '700', marginBottom: 7 },
  input: {
    height: 50,
    borderRadius: 14,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    paddingHorizontal: 14,
    color: colors.ink,
    marginBottom: 17,
  },
  submit: {
    height: 51,
    borderRadius: 15,
    backgroundColor: colors.forest,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 5,
  },
  submitText: { color: colors.white, fontSize: 14, fontWeight: '800' },
  googleButton: {
    height: 49,
    borderRadius: 15,
    borderColor: colors.border,
    borderWidth: 1,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  googleText: { color: colors.ink, fontSize: 13, fontWeight: '700' },
  registerLink: { alignItems: 'center', marginTop: 19 },
  registerText: { color: colors.muted, fontSize: 12 },
  registerAction: { color: colors.forest, fontWeight: '800' },
  footnote: { color: colors.muted, textAlign: 'center', fontSize: 10, lineHeight: 16, marginTop: 18 },
});
