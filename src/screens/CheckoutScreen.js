import { useEffect, useRef, useState } from 'react';
import {
  AppState,
  Linking,
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
import { ApiError } from '../services/apiClient.js';
import { lookupBrazilianPostalCode } from '../services/cepService';
import {
  createCheckoutSession,
  createOrder,
  getPaymentStatus,
} from '../services/ordersService.js';
import { colors } from '../theme/colors';
import { formatCurrency } from '../utils/formatCurrency';

const addressFields = [
  { key: 'state', label: 'Estado', placeholder: 'Ex.: RS' },
  { key: 'city', label: 'Cidade', placeholder: 'Sua cidade' },
  { key: 'street', label: 'Rua', placeholder: 'Nome da rua' },
  { key: 'number', label: 'Número', placeholder: 'Nº', keyboardType: 'number-pad' },
  { key: 'neighborhood', label: 'Bairro', placeholder: 'Seu bairro' },
];

function formatEstimate(value) {
  return typeof value === 'number' && Number.isFinite(value)
    ? formatCurrency(value)
    : 'Não foi possível estimar';
}

export function CheckoutScreen({ navigation }) {
  const { user, token } = useAuth();
  const { items, subtotal, estimateComplete, clearItems } = useCart();
  const { refreshOrders } = useOrders();
  const [addressVisible, setAddressVisible] = useState(false);
  const [address, setAddress] = useState({
    state: '',
    city: '',
    street: '',
    number: '',
    neighborhood: '',
  });
  const [formError, setFormError] = useState('');
  const [paymentError, setPaymentError] = useState('');
  const [cartClearWarning, setCartClearWarning] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [shippingMessage, setShippingMessage] = useState('');
  const [shippingError, setShippingError] = useState(false);
  const [isLookingUpPostalCode, setIsLookingUpPostalCode] = useState(false);
  const [postalCodeVerified, setPostalCodeVerified] = useState(false);
  const [createdOrder, setCreatedOrder] = useState(null);
  const [paymentStatus, setPaymentStatus] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLaunchingPayment, setIsLaunchingPayment] = useState(false);
  const idempotencyAttemptRef = useRef(null);
  const paymentCheckRef = useRef(false);
  const insets = useSafeAreaInsets();
  const subtotalEstimate = estimateComplete ? formatEstimate(subtotal) : 'Em definição';

  async function launchPayment(order) {
    if (!token || isLaunchingPayment) {
      return;
    }

    setPaymentError('');
    setIsLaunchingPayment(true);
    try {
      const session = await createCheckoutSession(order.id, token);
      await Linking.openURL(session.checkoutUrl);
      setPaymentStatus('PENDING');
    } catch (error) {
      setPaymentError(error instanceof Error
        ? error.message
        : 'Não foi possível abrir o checkout do Stripe.');
    } finally {
      setIsLaunchingPayment(false);
    }
  }

  useEffect(() => {
    if (!createdOrder || !token) {
      return undefined;
    }

    let active = true;
    const subscription = AppState.addEventListener('change', async (nextState) => {
      if (nextState !== 'active' || paymentCheckRef.current) {
        return;
      }

      paymentCheckRef.current = true;
      try {
        for (let attempt = 0; attempt < 15 && active; attempt += 1) {
          const payment = await getPaymentStatus(createdOrder.id, token);
          if (active) {
            setPaymentStatus(payment?.status ?? '');
            setPaymentError('');
          }
          if (!payment || !['CREATED', 'PENDING'].includes(payment.status)) {
            break;
          }
          await new Promise((resolve) => setTimeout(resolve, 2000));
        }
      } catch (error) {
        if (active) {
          setPaymentError(error instanceof Error
            ? error.message
            : 'Não foi possível consultar o pagamento.');
        }
      } finally {
        paymentCheckRef.current = false;
      }
    });

    return () => {
      active = false;
      subscription.remove();
    };
  }, [createdOrder, token]);

  async function calculateShipping(cep = postalCode) {
    setIsLookingUpPostalCode(true);
    setPostalCodeVerified(false);
    setShippingMessage('');
    setShippingError(false);

    try {
      const location = await lookupBrazilianPostalCode(cep);
      setAddress((currentAddress) => ({
        ...currentAddress,
        state: location.state,
        city: location.city,
      }));
      setAddressVisible(true);
      setPostalCodeVerified(true);
      setShippingMessage(
        `CEP localizado: ${location.city} - ${location.state}. O frete será calculado pelo servidor.`,
      );
    } catch (error) {
      setShippingError(true);
      setShippingMessage(
        error instanceof Error
          ? error.message
          : 'Não foi possível consultar o CEP. Tente novamente.',
      );
    } finally {
      setIsLookingUpPostalCode(false);
    }
  }

  function handlePostalCodeChange(value) {
    const digits = value.replace(/\D/g, '').slice(0, 8);
    setPostalCode(digits.length > 5 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : digits);
    setShippingMessage('');
    setShippingError(false);
    setPostalCodeVerified(false);
    setAddress((currentAddress) => ({
      ...currentAddress,
      state: '',
      city: '',
    }));
    if (digits.length === 8) {
      calculateShipping(digits);
    }
  }

  async function finishPurchase() {
    if (!user || user.role !== 'CLIENTE') {
      setFormError('Somente clientes podem finalizar um pedido.');
      return;
    }
    if (!token) {
      setFormError('Sua sessão expirou. Entre novamente para finalizar o pedido.');
      return;
    }

    if (!estimateComplete || subtotal === null) {
      setFormError('Não é possível finalizar sem uma estimativa válida dos produtos.');
      return;
    }

    if (!postalCodeVerified) {
      setFormError('Consulte um CEP válido para calcular o frete antes de continuar.');
      return;
    }

    if (items.some((item) => !item.productAvailable || !item.active || !item.available)) {
      setFormError('Remova ou ajuste os produtos indisponíveis antes de continuar.');
      return;
    }

    const hasCompleteAddress = addressFields.every(({ key }) => address[key].trim());
    if (!addressVisible || !hasCompleteAddress) {
      setFormError('Preencha todos os campos do endereço para continuar.');
      setAddressVisible(true);
      return;
    }

    setFormError('');
    setPaymentError('');
    setIsSubmitting(true);

    const payload = {
      items: items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
      })),
      shippingAddress: {
        zipCode: postalCode.replace(/\D/g, ''),
        street: address.street.trim(),
        number: address.number.trim(),
        neighborhood: address.neighborhood.trim(),
        city: address.city.trim(),
        state: address.state.trim().toUpperCase(),
      },
    };
    const payloadFingerprint = JSON.stringify(payload);
    if (idempotencyAttemptRef.current?.payload !== payloadFingerprint) {
      idempotencyAttemptRef.current = {
        payload: payloadFingerprint,
        key: `oma-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      };
    }

    try {
      const order = await createOrder(
        payload,
        token,
        idempotencyAttemptRef.current.key,
      );
      idempotencyAttemptRef.current = null;
      setCreatedOrder(order);
      const clearResult = await clearItems();
      if (!clearResult.ok) {
        setCartClearWarning(
          'O pedido foi criado, mas não foi possível limpar a sacola. Atualize-a antes de fazer outro pedido.',
        );
      }
      await refreshOrders();
      await launchPayment(order);
    } catch (error) {
      const message = error instanceof ApiError && error.status === 409
        ? 'O estoque mudou antes da confirmação. Atualize a sacola e tente novamente.'
        : error instanceof ApiError && error.status === 422
          ? error.message || 'Um produto não está disponível para venda.'
          : error instanceof Error
            ? error.message
            : 'Não foi possível criar o pedido. Tente novamente.';
      setFormError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (createdOrder) {
    return (
      <View style={styles.successScreen}>
        <View style={styles.successIcon}>
          <Ionicons name="checkmark" size={38} color={colors.forest} />
        </View>
        <Text style={styles.successTitle}>Pedido registrado</Text>
        <Text style={styles.successDescription}>
          Pedido #{createdOrder.id} · {createdOrder.status}
          {'\n'}Total confirmado pelo servidor: {formatCurrency(createdOrder.totalAmount)}
          {'\n'}{paymentStatus
            ? `Pagamento: ${paymentStatus}`
            : 'Aguardando confirmação do pagamento.'}
        </Text>
        {paymentError ? (
          <Text accessibilityRole="alert" style={styles.successError}>{paymentError}</Text>
        ) : null}
        {cartClearWarning ? (
          <Text accessibilityRole="alert" style={styles.successError}>{cartClearWarning}</Text>
        ) : null}
        <Pressable
          accessibilityRole="button"
          disabled={isLaunchingPayment}
          onPress={() => launchPayment(createdOrder)}
          style={styles.successButton}
        >
          <Text style={styles.successButtonText}>
            {isLaunchingPayment ? 'Abrindo pagamento...' : 'Abrir pagamento no Stripe'}
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={() => navigation.navigate('MainTabs', {
            screen: 'Conta',
            params: { screen: 'Pedidos' },
          })}
          style={styles.ordersButton}
        >
          <Text style={styles.ordersButtonText}>Ver meus pedidos</Text>
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
        {items.map((item) => (
          <View key={item.key} style={styles.productRow}>
            <View style={[styles.productArtwork, { backgroundColor: item.product.backdrop || colors.surfaceMuted }]}>
              <ProductImage
                accessibilityLabel={item.product.name || 'Produto'}
                fallbackEmoji={item.product.emoji || '🧉'}
                source={item.product.image}
                style={styles.productImage}
              />
            </View>
            <View style={styles.productInfo}>
              <Text numberOfLines={2} style={styles.productName}>
                {item.product.name || 'Produto removido do catálogo'}
              </Text>
              {item.variant ? <Text style={styles.productVariant}>{item.variant.name}</Text> : null}
              {item.product.brand || item.product.model ? (
                <Text style={styles.productVariant}>
                  {[item.product.brand, item.product.model].filter(Boolean).join(' · ')}
                </Text>
              ) : null}
              <Text style={styles.productQuantity}>Quantidade: {item.quantity}</Text>
            </View>
            <Text style={styles.productTotal}>
              {item.estimatedSubtotal === null
                ? 'Indisponível'
                : formatCurrency(item.estimatedSubtotal)}
            </Text>
          </View>
        ))}

        <View style={styles.priceSummary}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal estimado</Text>
            <Text style={styles.summaryValue}>{subtotalEstimate}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Frete</Text>
            <Text style={styles.shippingValue}>Calculado pelo servidor</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryRow}>
            <Text style={styles.totalLabel}>Total final</Text>
            <Text style={styles.totalValue}>Após validar o pedido</Text>
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
              handlePostalCodeChange(value);
            }}
            editable={!isLookingUpPostalCode}
            placeholder="Digite seu CEP"
            placeholderTextColor={colors.muted}
            style={styles.cepInput}
            value={postalCode}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: isLookingUpPostalCode }}
            disabled={isLookingUpPostalCode}
            onPress={calculateShipping}
            style={styles.calculateButton}
          >
            <Text style={styles.calculateButtonText}>
              {isLookingUpPostalCode ? 'Consultando...' : 'Calcular'}
            </Text>
          </Pressable>
        </View>
        {shippingMessage ? (
          <Text
            accessibilityRole="status"
            style={[
              styles.shippingMessage,
              shippingError && styles.shippingError,
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

        <Text style={[styles.sectionTitle, styles.paymentTitle]}>Pagamento</Text>
        <View style={styles.paymentInfo}>
          <Ionicons name="card-outline" size={22} color={colors.forest} />
          <View style={styles.paymentTextContainer}>
            <Text style={styles.paymentLabel}>Cartão pelo Stripe Checkout</Text>
            <Text style={styles.paymentDescription}>
              O pagamento será feito em uma página segura do Stripe. Os dados do cartão não passam pelo app.
            </Text>
          </View>
        </View>

        <Text style={styles.disclaimer}>
          O servidor confirma preço, frete e disponibilidade antes de criar o pedido.
        </Text>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 14) }]}>
        <View>
          <Text style={styles.footerLabel}>Subtotal estimado</Text>
          <Text style={styles.footerTotal}>{subtotalEstimate}</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          disabled={isSubmitting || isLaunchingPayment}
          onPress={finishPurchase}
          style={styles.finishButton}
        >
          <Text style={styles.finishButtonText}>
            {isSubmitting ? 'Criando pedido...' : 'Finalizar compra'}
          </Text>
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
  paymentInfo: {
    minHeight: 68,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  paymentTextContainer: { flex: 1 },
  paymentLabel: { color: colors.forest, fontSize: 12, fontWeight: '700' },
  paymentDescription: { color: colors.muted, fontSize: 10, lineHeight: 15, marginTop: 4 },
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
  successError: { color: colors.danger, fontSize: 12, lineHeight: 18, textAlign: 'center', marginTop: 12 },
  successButton: {
    minHeight: 50,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    borderRadius: 15,
    backgroundColor: colors.forest,
    marginTop: 24,
  },
  ordersButton: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    marginTop: 10,
  },
  ordersButtonText: { color: colors.forest, fontSize: 12, fontWeight: '800' },
  successButtonText: { color: colors.white, fontSize: 13, fontWeight: '800' },
});
