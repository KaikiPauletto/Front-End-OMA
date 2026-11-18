import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { useAuth } from '../contexts/AuthContext';
import { getAuthErrorMessage } from '../services/authService';

export function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submitLock = useRef(false);
  const { signIn } = useAuth();

  async function handleSubmit() {
    if (submitLock.current) {
      return;
    }

    if (!email.trim() || !password) {
      Alert.alert('Dados incompletos', 'Informe seu e-mail e sua senha.');
      return;
    }

    submitLock.current = true;
    setIsSubmitting(true);
    try {
      await signIn(email.trim(), password);
      setPassword('');
    } catch (error) {
      Alert.alert('Não foi possível entrar', getAuthErrorMessage(error, 'signin'));
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
        <Image
          accessibilityLabel="Logo OMA"
          resizeMode="contain"
          source={require('../assets/oma-logo.png')}
          style={styles.brandLogo}
        />
        <Text style={styles.title}>Que bom te ver.</Text>
        <Text style={styles.subtitle}>Entre para acompanhar teus pedidos e continuar teu mate.</Text>

        <Text style={styles.label}>E-mail</Text>
        <TextInput
          autoCapitalize="none"
          keyboardType="email-address"
          onChangeText={setEmail}
          placeholder="voce@email.com"
          placeholderTextColor={colors.muted}
          editable={!isSubmitting}
          style={styles.input}
          value={email}
        />
        <Text style={styles.label}>Senha</Text>
        <TextInput
          onChangeText={setPassword}
          placeholder="Sua senha"
          placeholderTextColor={colors.muted}
          secureTextEntry
          editable={!isSubmitting}
          style={styles.input}
          value={password}
        />
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
    width: 174,
    height: 174,
    alignSelf: 'center',
    marginBottom: 8,
  },
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
  submitDisabled: { opacity: 0.7 },
  submitText: { color: colors.white, fontSize: 14, fontWeight: '800' },
  footnote: { color: colors.muted, textAlign: 'center', fontSize: 10, lineHeight: 16, marginTop: 22 },
});
