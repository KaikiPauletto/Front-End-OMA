import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ProductImage } from '../components/ProductImage';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import { useOrders } from '../contexts/OrdersContext';
import { colors } from '../theme/colors';
import { formatCurrency } from '../utils/formatCurrency';

const addressFields = [
  { key: 'state', label: 'Estado', placeholder: 'Ex.: RS' },
  { key: 'city', label: 'Cidade', placeholder: 'Sua cidade' },
  { key: 'street', label: 'Rua', placeholder: 'Nome da rua' },
  { key: 'number', label: 'Número', placeholder: 'Nº', keyboardType: 'number-pad' },
  { key: 'neighborhood', label: 'Bairro', placeholder: 'Seu bairro' },
];

const paymentOptions = [
  { id: 'pix', label: 'Pix', icon: 'qr-code-outline' },
  { id: 'boleto', label: 'Boleto', icon: 'barcode-outline' },
];

export function CheckoutScreen({ navigation }) {
  const { user } = useAuth();
  const { items, subtotal, clearCart } = useCart();
  const { addOrder } = useOrders();
  const [addressVisible, setAddressVisible] = useState(false);
  const [address, setAddress] = useState({
    state: '',
    city: '',
    street: '',
    number: '',
    neighborhood: '',
  });
  const [paymentMethod, setPaymentMethod] = useState('pix');
  const [formError, setFormError] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [shippingMessage, setShippingMessage] = useState('');
  const [purchaseComplete, setPurchaseComplete] = useState(false);
  const insets = useSafeAreaInsets();

  function calculateShipping() {
    const digits = postalCode.replace(/\D/g, '');
    if (digits.length !== 8) {
      setShippingMessage('Informe um CEP válido com 8 números.');
      return;
    }

    setShippingMessage('CEP informado. O cálculo do frete estará disponível após a integração.');
  }

  function finishPurchase() {
    if (!user || user.role !== 'CLIENTE') {
      setFormError('Somente clientes podem finalizar um pedido.');
      return;
    }

    const hasCompleteAddress = addressFields.every(({ key }) => address[key].trim());
    if (!addressVisible || !hasCompleteAddress) {
      setFormError('Preencha todos os campos do endereço para continuar.');
      setAddressVisible(true);
      return;
    }

    const result = addOrder({ items, subtotal, address, postalCode });
    if (!result.ok) {
      setFormError('Não foi possível registrar o pedido demonstrativo.');
      return;
    }

    setFormError('');
    clearCart();
    setPurchaseComplete(true);
  }

  if (purchaseComplete) {
    return (
      <View style={styles.successScreen}>
        <View style={styles.successIcon}>
          <Ionicons name="checkmark" size={38} color={colors.forest} />
        </View>
        <Text style={styles.successTitle}>Pedido demonstrativo registrado</Text>
        <Text style={styles.successDescription}>
          Status: AGUARDANDO_PAGAMENTO.
          {'\n'}Registro pendente: nenhum pagamento foi processado e nenhum frete ou baixa de estoque foi confirmado.
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => navigation.navigate('MainTabs', { screen: 'Home' })}
          style={styles.successButton}
        >
          <Text style={styles.successButtonText}>Voltar para a loja</Text>
        </Pressable>
      </View>
    );
  }

  if (items.length === 0) {
    return (
      <View style={styles.emptyScreen}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Voltar"
          onPress={() => navigation.goBack()}
          style={[styles.backButton, { top: insets.top + 12 }]}
        >
          <Ionicons name="arrow-back" size={21} color={colors.forest} />
        </Pressable>
        <Ionicons name="bag-handle-outline" size={40} color={colors.forest} />
        <Text style={styles.emptyTitle}>Sua sacola está vazia</Text>
        <Text style={styles.emptyDescription}>Adicione produtos antes de iniciar o checkout.</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.screen}
    >
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Voltar para a sacola"
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={21} color={colors.forest} />
        </Pressable>
        <Text style={styles.headerTitle}>Finalizar compra</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.sectionTitle}>Resumo do pedido</Text>
        <Text style={styles.pendingNotice}>
          Pedido demonstrativo: pagamento e frete ainda não foram confirmados.
        </Text>
        {items.map((item) => (
          <View key={item.key} style={styles.productRow}>
            <View style={[styles.productArtwork, { backgroundColor: item.product.backdrop || colors.surfaceMuted }]}>
              <ProductImage
                accessibilityLabel={item.product.name}
                fallbackEmoji={item.product.emoji || '🧉'}
                source={item.product.image}
                style={styles.productImage}
              />
            </View>
            <View style={styles.productInfo}>
              <Text numberOfLines={2} style={styles.productName}>{item.product.name}</Text>
              {item.variant ? <Text style={styles.productVariant}>{item.variant.name}</Text> : null}
              <Text style={styles.productQuantity}>Quantidade: {item.quantity}</Text>
            </View>
            <Text style={styles.productTotal}>
              {formatCurrency(item.unitPrice * item.quantity)}
            </Text>
          </View>
        ))}

        <View style={styles.priceSummary}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal dos produtos</Text>
            <Text style={styles.summaryValue}>{formatCurrency(subtotal)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Frete</Text>
            <Text style={styles.shippingValue}>Calculado após integração</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryRow}>
            <Text style={styles.totalLabel}>Total dos produtos</Text>
            <Text style={styles.totalValue}>{formatCurrency(subtotal)}</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Calcular Frete</Text>
        <View style={styles.shippingCalculator}>
          <TextInput
            accessibilityLabel="CEP"
            autoComplete="postal-code"
            keyboardType="number-pad"
            maxLength={9}
            onChangeText={(value) => {
              const digits = value.replace(/\D/g, '').slice(0, 8);
              setPostalCode(digits.length > 5 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : digits);
              setShippingMessage('');
            }}
            placeholder="Digite seu CEP"
            placeholderTextColor={colors.muted}
            style={styles.cepInput}
            value={postalCode}
          />
          <Pressable
            accessibilityRole="button"
            onPress={calculateShipping}
            style={styles.calculateButton}
          >
            <Text style={styles.calculateButtonText}>Calcular</Text>
          </Pressable>
        </View>
        {shippingMessage ? (
          <Text
            accessibilityRole="status"
            style={[
              styles.shippingMessage,
              postalCode.replace(/\D/g, '').length !== 8 && styles.shippingError,
            ]}
          >
            {shippingMessage}
          </Text>
        ) : null}

        <View style={styles.sectionHeading}>
          <Text style={styles.sectionTitle}>Endereço de entrega</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded: addressVisible }}
          onPress={() => setAddressVisible((visible) => !visible)}
          style={styles.addressButton}
        >
          <Ionicons name="location-outline" size={19} color={colors.forest} />
          <Text style={styles.addressButtonText}>
            {addressVisible ? 'Ocultar endereço' : 'Adicionar endereço'}
          </Text>
          <Ionicons
            name={addressVisible ? 'chevron-up' : 'chevron-down'}
            size={18}
            color={colors.forest}
          />
        </Pressable>

        {addressVisible ? (
          <View style={styles.addressForm}>
            {addressFields.map((field) => (
              <View key={field.key} style={styles.field}>
                <Text style={styles.fieldLabel}>{field.label}</Text>
                <TextInput
                  accessibilityLabel={field.label}
                  autoCapitalize={field.key === 'state' ? 'characters' : 'words'}
                  keyboardType={field.keyboardType || 'default'}
                  onChangeText={(value) =>
                    setAddress((currentAddress) => ({
                      ...currentAddress,
                      [field.key]: value,
                    }))
                  }
                  placeholder={field.placeholder}
                  placeholderTextColor={colors.muted}
                  style={styles.input}
                  value={address[field.key]}
                />
              </View>
            ))}
          </View>
        ) : null}
        {formError ? <Text accessibilityRole="alert" style={styles.formError}>{formError}</Text> : null}

        <Text style={[styles.sectionTitle, styles.paymentTitle]}>Forma de pagamento</Text>
        <View style={styles.paymentOptions}>
          {paymentOptions.map((option) => {
            const isSelected = paymentMethod === option.id;
            return (
              <Pressable
                key={option.id}
                accessibilityRole="radio"
                accessibilityState={{ checked: isSelected }}
                onPress={() => setPaymentMethod(option.id)}
                style={[styles.paymentOption, isSelected && styles.paymentOptionSelected]}
              >
                <Ionicons
                  name={option.icon}
                  size={21}
                  color={isSelected ? colors.forest : colors.muted}
                />
                <Text style={[styles.paymentLabel, isSelected && styles.paymentLabelSelected]}>
                  {option.label}
                </Text>
                <Ionicons
                  name={isSelected ? 'radio-button-on' : 'radio-button-off'}
                  size={19}
                  color={isSelected ? colors.forest : colors.muted}
                />
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.disclaimer}>
          Checkout demonstrativo: valores e disponibilidade ainda serão confirmados pelo sistema.
        </Text>
        <Text style={styles.disclaimer}>
          Ao finalizar, será criado um pedido pendente. Nenhum pagamento ou baixa de estoque será realizado.
        </Text>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 14) }]}>
        <View>
          <Text style={styles.footerLabel}>Total dos produtos</Text>
          <Text style={styles.footerTotal}>{formatCurrency(subtotal)}</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={finishPurchase}
          style={styles.finishButton}
        >
          <Text style={styles.finishButtonText}>Finalizar compra</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas },
  header: {
    minHeight: 62,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { color: colors.ink, fontSize: 18, fontWeight: '800' },
  headerSpacer: { width: 42 },
  content: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 24 },
  sectionTitle: { color: colors.ink, fontSize: 17, fontWeight: '800', marginBottom: 12 },
  pendingNotice: { color: colors.clay, fontSize: 11, lineHeight: 16, marginBottom: 14 },
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    marginBottom: 9,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  productArtwork: {
    width: 62,
    height: 66,
    borderRadius: 11,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  productImage: { width: '100%', height: '100%' },
  productInfo: { flex: 1, marginHorizontal: 10 },
  productName: { color: colors.ink, fontSize: 12, fontWeight: '700', lineHeight: 17 },
  productVariant: { color: colors.muted, fontSize: 10, marginTop: 3 },
  productQuantity: { color: colors.muted, fontSize: 10, marginTop: 4 },
  productTotal: { color: colors.forest, fontSize: 12, fontWeight: '800' },
  priceSummary: {
    padding: 15,
    marginTop: 3,
    marginBottom: 24,
    borderRadius: 15,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: 5,
    gap: 12,
  },
  summaryLabel: { color: colors.muted, fontSize: 11 },
  summaryValue: { color: colors.ink, fontSize: 12, fontWeight: '700' },
  shippingValue: { color: colors.muted, fontSize: 10, textAlign: 'right' },
  summaryDivider: { height: 1, backgroundColor: colors.border, marginVertical: 9 },
  totalLabel: { color: colors.ink, fontSize: 12, fontWeight: '800' },
  totalValue: { color: colors.forest, fontSize: 14, fontWeight: '800' },
  shippingCalculator: {
    flexDirection: 'row',
    gap: 9,
    marginBottom: 8,
  },
  cepInput: {
    flex: 1,
    minHeight: 46,
    paddingHorizontal: 13,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    color: colors.ink,
    fontSize: 13,
  },
  calculateButton: {
    minWidth: 96,
    minHeight: 46,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderRadius: 13,
    backgroundColor: colors.forest,
  },
  calculateButtonText: { color: colors.white, fontSize: 12, fontWeight: '800' },
  shippingMessage: { color: colors.forest, fontSize: 11, lineHeight: 16, marginBottom: 12 },
  shippingError: { color: colors.danger },
  sectionHeading: { marginTop: 2 },
  addressButton: {
    minHeight: 49,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingHorizontal: 13,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  addressButtonText: { flex: 1, color: colors.forest, fontSize: 12, fontWeight: '700' },
  addressForm: {
    padding: 13,
    marginTop: 10,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  field: { marginBottom: 11 },
  fieldLabel: { color: colors.ink, fontSize: 11, fontWeight: '700', marginBottom: 6 },
  input: {
    minHeight: 44,
    paddingHorizontal: 12,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.canvas,
    color: colors.ink,
    fontSize: 13,
  },
  paymentTitle: { marginTop: 24 },
  paymentOptions: { flexDirection: 'row', gap: 11 },
  paymentOption: {
    flex: 1,
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  paymentOptionSelected: { borderColor: colors.forest, backgroundColor: colors.sage },
  paymentLabel: { color: colors.mutedStrong, fontSize: 12, fontWeight: '700' },
  paymentLabelSelected: { color: colors.forest },
  disclaimer: { color: colors.muted, fontSize: 10, lineHeight: 15, marginTop: 18 },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 12,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  footerLabel: { color: colors.muted, fontSize: 10 },
  footerTotal: { color: colors.forest, fontSize: 18, fontWeight: '800', marginTop: 2 },
  finishButton: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 17,
    borderRadius: 14,
    backgroundColor: colors.forest,
  },
  finishButtonText: { color: colors.white, fontSize: 12, fontWeight: '800' },
  emptyScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    backgroundColor: colors.canvas,
  },
  emptyTitle: { color: colors.ink, fontSize: 21, fontWeight: '800', marginTop: 15 },
  emptyDescription: { color: colors.muted, fontSize: 13, lineHeight: 20, textAlign: 'center', marginTop: 8 },
  formError: { color: colors.danger, fontSize: 11, lineHeight: 16, marginTop: 10 },
  successScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    backgroundColor: colors.canvas,
  },
  successIcon: {
    width: 76,
    height: 76,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 38,
    backgroundColor: colors.sage,
    marginBottom: 22,
  },
  successTitle: { color: colors.ink, fontSize: 22, fontWeight: '800', textAlign: 'center' },
  successDescription: { color: colors.muted, fontSize: 13, lineHeight: 20, textAlign: 'center', marginTop: 11 },
  successButton: {
    minHeight: 50,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    borderRadius: 15,
    backgroundColor: colors.forest,
    marginTop: 24,
  },
  successButtonText: { color: colors.white, fontSize: 13, fontWeight: '800' },
});
