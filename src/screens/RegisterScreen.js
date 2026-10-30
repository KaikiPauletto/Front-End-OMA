import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { DEMO_MODE } from '../config/appConfig';
import { enterDemoMode } from '../utils/enterDemoMode';

export function RegisterScreen({ navigation }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  function handleSubmit() {
    if (DEMO_MODE) {
      enterDemoMode(navigation);
      return;
    }

    if (!name.trim() || !email.trim() || !password) {
      Alert.alert('Dados incompletos', 'Preencha os campos para continuar.');
      return;
    }

    Alert.alert(
      'Cadastro ainda não conectado',
      'A conta será criada quando os campos obrigatórios e o contrato da API forem definidos.',
    );
  }

  return (
    <View style={styles.screen}>
      <Pressable onPress={() => navigation.goBack()} style={styles.back}>
        <Ionicons name="arrow-back" size={21} color={colors.forest} />
      </Pressable>
      <Text style={styles.brand}>oma<Text style={styles.brandDot}>.</Text></Text>
      <Text style={styles.title}>Faça parte da roda.</Text>
      <Text style={styles.subtitle}>Crie sua conta para acompanhar teus pedidos e endereços.</Text>

      <Text style={styles.label}>Nome</Text>
      <TextInput
        autoCapitalize="words"
        onChangeText={setName}
        placeholder="Como podemos te chamar?"
        placeholderTextColor={colors.muted}
        style={styles.input}
        value={name}
      />
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
        placeholder="Crie uma senha"
        placeholderTextColor={colors.muted}
        secureTextEntry
        style={styles.input}
        value={password}
      />
      <Pressable onPress={handleSubmit} style={styles.submit}>
        <Text style={styles.submitText}>Criar conta</Text>
      </Pressable>
      <Text style={styles.footnote}>
        {DEMO_MODE
          ? 'Modo demonstração: continuar não cria uma conta nem envia os dados.'
          : 'O cadastro será habilitado após a definição dos campos e integração com o backend.'}
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
  title: { color: colors.ink, fontSize: 25, fontWeight: '800', textAlign: 'center', marginTop: 18 },
  subtitle: { color: colors.muted, fontSize: 13, lineHeight: 20, textAlign: 'center', marginTop: 8, marginBottom: 24 },
  label: { color: colors.ink, fontSize: 12, fontWeight: '700', marginBottom: 7 },
  input: {
    height: 49,
    borderRadius: 14,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    paddingHorizontal: 14,
    color: colors.ink,
    marginBottom: 14,
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
  footnote: { color: colors.muted, textAlign: 'center', fontSize: 10, lineHeight: 16, marginTop: 17 },
});
