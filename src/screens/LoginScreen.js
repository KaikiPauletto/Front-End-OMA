import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BrandLogo } from '../components/BrandLogo';
import { colors } from '../theme/colors';
import { useAuth } from '../contexts/AuthContext';
import { getAuthErrorMessage } from '../services/authService';

export function LoginScreen({ navigation, route }) {
  const [email, setEmail] = useState(route?.params?.registeredEmail ?? '');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const submitLock = useRef(false);
  const { signIn } = useAuth();
  const registrationMessage = route?.params?.registrationSucceeded
    ? 'Conta criada com sucesso. Faça login para continuar.'
    : '';

  async function handleSubmit() {
    if (submitLock.current) {
      return;
    }

    if (!email.trim() || !password) {
      setErrorMessage('Informe seu e-mail e sua senha.');
      return;
    }

    setErrorMessage('');
    submitLock.current = true;
    setIsSubmitting(true);
    try {
      await signIn(email.trim(), password);
      setPassword('');
    } catch (error) {
      setErrorMessage(getAuthErrorMessage(error, 'signin'));
    } finally {
      submitLock.current = false;
      setIsSubmitting(false);
    }
  }

  return (
    <View style={styles.screen}>
      <Pressable onPress={() => navigation.popTo('Welcome')} style={styles.back}>
        <Ionicons name="arrow-back" size={21} color={colors.forest} />
      </Pressable>
      <ScrollView
        contentContainerStyle={styles.formContent}
        keyboardShouldPersistTaps="handled"
      >
        <BrandLogo variant="auth" style={styles.brandLogo} />
        <Text style={styles.title}>Que bom te ver.</Text>
        <Text style={styles.subtitle}>Entre para acompanhar teus pedidos e continuar teu mate.</Text>

        {registrationMessage ? (
          <Text accessibilityLiveRegion="polite" style={styles.success}>
            {registrationMessage}
          </Text>
        ) : null}

        <Text style={styles.label}>E-mail</Text>
        <TextInput
          autoCapitalize="none"
          keyboardType="email-address"
          onChangeText={(value) => {
            setEmail(value);
            setErrorMessage('');
          }}
          placeholder="voce@email.com"
          placeholderTextColor={colors.muted}
          editable={!isSubmitting}
          style={styles.input}
          value={email}
        />
        <Text style={styles.label}>Senha</Text>
        <TextInput
          onChangeText={(value) => {
            setPassword(value);
            setErrorMessage('');
          }}
          placeholder="Sua senha"
          placeholderTextColor={colors.muted}
          secureTextEntry
          editable={!isSubmitting}
          style={styles.input}
          value={password}
        />
        {errorMessage ? (
          <Text accessibilityLiveRegion="polite" style={styles.error}>
            {errorMessage}
          </Text>
        ) : null}
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: isSubmitting, busy: isSubmitting }}
          disabled={isSubmitting}
          onPress={handleSubmit}
          style={[styles.submit, isSubmitting && styles.submitDisabled]}
        >
          {isSubmitting ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text style={styles.submitText}>Entrar</Text>
          )}
        </Pressable>
        <Text style={styles.footnote}>Entre com o e-mail e a senha da sua conta OMA.</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas, paddingHorizontal: 25 },
  formContent: { flexGrow: 1, justifyContent: 'center', paddingTop: 32, paddingBottom: 24 },
  back: {
    position: 'absolute',
    zIndex: 1,
    top: 54,
    left: 22,
    width: 43,
    height: 43,
    borderRadius: 15,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandLogo: {
    alignSelf: 'center',
    marginBottom: 8,
  },
  title: { color: colors.ink, fontSize: 26, fontWeight: '800', textAlign: 'center', marginTop: 20 },
  subtitle: { color: colors.muted, fontSize: 13, lineHeight: 20, textAlign: 'center', marginTop: 8, marginBottom: 29 },
  label: { color: colors.ink, fontSize: 12, fontWeight: '700', marginBottom: 7 },
  error: {
    color: colors.clay,
    fontSize: 12,
    lineHeight: 18,
    marginTop: -7,
    marginBottom: 12,
  },
  success: {
    color: colors.forest,
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    marginBottom: 14,
  },
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
  submitDisabled: { opacity: 0.7 },
  submitText: { color: colors.white, fontSize: 14, fontWeight: '800' },
  footnote: { color: colors.muted, textAlign: 'center', fontSize: 10, lineHeight: 16, marginTop: 22 },
});
