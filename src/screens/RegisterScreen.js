import { useState } from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
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
        <Text style={styles.title}>Faça parte da roda.</Text>
        <Text style={styles.subtitle}>Crie sua conta para acompanhar teus pedidos e endereços.</Text>

        <View style={styles.accountTypeInfo}>
          <Text style={styles.accountTypeInfoText}>Cadastro de cliente</Text>
        </View>

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
  title: { color: colors.ink, fontSize: 25, fontWeight: '800', textAlign: 'center', marginTop: 18 },
  subtitle: { color: colors.muted, fontSize: 13, lineHeight: 20, textAlign: 'center', marginTop: 8, marginBottom: 24 },
  label: { color: colors.ink, fontSize: 12, fontWeight: '700', marginBottom: 7 },
  accountTypeInfo: {
    minHeight: 45,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.forest,
    backgroundColor: colors.sage,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  accountTypeInfoText: { color: colors.forest, fontSize: 13, fontWeight: '700' },
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
