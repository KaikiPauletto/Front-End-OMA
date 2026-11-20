import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { AppButton } from './AppButton';
import {
  addNonNegativeInt64,
  compareNonNegativeInt64,
  normalizeNonNegativeInt64,
  normalizePositiveInt64,
} from '../services/int64';
import { colors } from '../theme/colors';

const operations = {
  registration: { title: 'Registrar produto no estoque', button: 'Confirmar registro' },
  entry: { title: 'Registrar entrada', button: 'Confirmar entrada' },
  exit: { title: 'Registrar saída', button: 'Confirmar saída' },
  adjustment: { title: 'Ajustar saldo físico', button: 'Confirmar ajuste' },
  threshold: { title: 'Limite de estoque baixo', button: 'Salvar limite' },
};

function formatQuantity(value) {
  const normalized = normalizeNonNegativeInt64(value);
  return normalized?.replace(/\B(?=(\d{3})+(?!\d))/g, '.') ?? '—';
}

function validateForm(operation, value, reason, inventory, productType) {
  const normalizedReason = reason.trim();
  if (operation === 'registration') {
    return {
      payload: {},
      summary: 'Criar o registro de estoque com saldo físico inicial zero? Esta ação não adiciona unidades.',
    };
  }

  if (['entry', 'exit', 'adjustment'].includes(operation)) {
    if (!normalizedReason || normalizedReason.length > 500) {
      return { error: 'Informe um motivo com até 500 caracteres.' };
    }
  }

  if (operation === 'entry' || operation === 'exit') {
    const quantity = normalizePositiveInt64(value);
    if (!quantity) {
      return { error: 'Informe uma quantidade inteira positiva válida.' };
    }
    if (operation === 'entry') {
      const newQuantity = addNonNegativeInt64(inventory.quantityOnHand, quantity);
      if (newQuantity === null) {
        return { error: 'A soma excede o limite suportado pelo estoque.' };
      }
      if (productType === 'SINGLE_UNIT' && newQuantity !== '1') {
        return { error: 'Produtos unitários podem ter no máximo uma unidade física.' };
      }
    } else if (compareNonNegativeInt64(quantity, inventory.availableQuantity) > 0) {
      return { error: 'A saída não pode exceder a quantidade disponível.' };
    }

    return {
      payload: { quantity, reason: normalizedReason },
      summary: operation === 'entry'
        ? `Adicionar ${formatQuantity(quantity)} unidade(s) ao estoque físico?`
        : `Retirar ${formatQuantity(quantity)} unidade(s) disponíveis? As unidades reservadas serão preservadas.`,
    };
  }

  const normalizedValue = normalizeNonNegativeInt64(value);
  if (normalizedValue === null) {
    return {
      error: operation === 'threshold'
        ? 'Informe um limite inteiro não negativo válido.'
        : 'Informe uma quantidade inteira não negativa válida.',
    };
  }

  if (operation === 'adjustment') {
    if (compareNonNegativeInt64(normalizedValue, inventory.quantityReserved) < 0) {
      return { error: 'O saldo físico não pode ficar abaixo da quantidade reservada.' };
    }
    if (productType === 'SINGLE_UNIT' && normalizedValue !== '0' && normalizedValue !== '1') {
      return { error: 'Produtos unitários podem ter no máximo uma unidade física.' };
    }

    return {
      payload: { newQuantity: normalizedValue, reason: normalizedReason },
      summary: `Definir o estoque físico como ${formatQuantity(normalizedValue)} unidade(s)?`,
    };
  }

  return {
    payload: { threshold: normalizedValue },
    summary: `Definir o limite de estoque baixo como ${formatQuantity(normalizedValue)} unidade(s)?`,
  };
}

export function InventoryOperationModal({
  visible,
  operation,
  inventory,
  productType,
  isSaving,
  error,
  uncertain,
  reconciliationStatus,
  reconciliationError,
  onCancel,
  onConfirm,
  onReconcile,
  onFinishReconciliation,
  onClearError,
}) {
  const [value, setValue] = useState('');
  const [reason, setReason] = useState('');
  const [formError, setFormError] = useState('');
  const [review, setReview] = useState(null);

  useEffect(() => {
    if (visible) {
      setValue('');
      setReason('');
      setFormError('');
      setReview(null);
    }
  }, [visible, operation]);

  if (!operation || !operations[operation]) {
    return null;
  }

  const metadata = operations[operation];

  function handleReview() {
    const result = validateForm(operation, value.trim(), reason, inventory, productType);
    if (result.error) {
      setFormError(result.error);
      return;
    }
    setFormError('');
    setReview(result);
  }

  async function handleConfirm() {
    if (!review || isSaving) {
      return;
    }
    const result = await onConfirm(operation, review.payload);
    if (result?.ok) {
      onCancel();
    }
  }

  return (
    <Modal
      animationType="fade"
      onRequestClose={() => {
        if (!isSaving && !uncertain) {
          onCancel();
        }
      }}
      transparent
      visible={visible}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardAvoiding}
      >
        <View style={styles.backdrop}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.dialog}>
              <Text style={styles.title}>
                {uncertain ? 'Resultado não confirmado' : metadata.title}
              </Text>

              {uncertain ? (
                <>
                  <Text style={styles.description}>
                    A resposta da operação não foi confirmada. Não a envie novamente. Consulte o saldo
                    e o histórico antes de decidir qualquer nova ação.
                  </Text>
                  {reconciliationError ? (
                    <Text style={styles.error}>{reconciliationError}</Text>
                  ) : null}
                  {reconciliationStatus === 'done' ? (
                    <>
                      <Text style={styles.reconciled}>
                        Consulta concluída. A operação original não foi repetida; movimentos iguais
                        ou concorrentes podem impedir uma confirmação conclusiva.
                      </Text>
                      <AppButton
                        title="Concluir conferência"
                        onPress={onFinishReconciliation}
                        style={styles.actionButton}
                      />
                    </>
                  ) : (
                    <AppButton
                      title={reconciliationStatus === 'loading'
                        ? 'Consultando saldo e histórico...'
                        : 'Consultar saldo e histórico'}
                      onPress={onReconcile}
                      disabled={reconciliationStatus === 'loading'}
                      style={styles.actionButton}
                    />
                  )}
                </>
              ) : review ? (
                <>
                  <Text style={styles.description}>{review.summary}</Text>
                  {review.payload.reason ? (
                    <Text style={styles.reason}>Motivo: {review.payload.reason}</Text>
                  ) : null}
                  {error || formError ? (
                    <Text style={styles.error}>{error || formError}</Text>
                  ) : null}
                  {isSaving ? (
                    <Text style={styles.pending}>Enviando operação...</Text>
                  ) : null}
                  <View style={styles.actions}>
                    <AppButton
                      title="Voltar"
                      variant="outline"
                      onPress={() => setReview(null)}
                      disabled={isSaving}
                      style={styles.actionButton}
                    />
                    <AppButton
                      title={isSaving ? 'Enviando...' : metadata.button}
                      onPress={handleConfirm}
                      disabled={isSaving}
                      style={styles.actionButton}
                    />
                  </View>
                </>
              ) : (
                <>
                  <Text style={styles.description}>
                    {operation === 'registration'
                      ? 'O backend consultará o tipo atual do produto. Se o registro compatível já existir, a API o retornará sem alterar o saldo.'
                      : operation === 'entry'
                      ? 'A entrada aumenta a quantidade física.'
                      : operation === 'exit'
                        ? `Disponível ${formatQuantity(inventory.availableQuantity)}; reservado ${formatQuantity(inventory.quantityReserved)}. A saída não consome reservas.`
                        : operation === 'adjustment'
                          ? `O ajuste define o novo saldo físico. O reservado atual é ${formatQuantity(inventory.quantityReserved)}.`
                          : 'O backend determina e retorna o indicador de estoque baixo.'}
                  </Text>
                  {operation !== 'registration' ? (
                    <TextInput
                      accessibilityLabel={operation === 'threshold'
                        ? 'Limite de estoque baixo'
                        : operation === 'adjustment'
                          ? 'Nova quantidade física'
                          : 'Quantidade'}
                      keyboardType="number-pad"
                      onChangeText={(text) => {
                        setValue(text);
                        setFormError('');
                        onClearError();
                      }}
                      placeholder={operation === 'threshold'
                        ? 'Limite'
                        : operation === 'adjustment'
                          ? 'Nova quantidade'
                          : 'Quantidade'}
                      style={styles.input}
                      value={value}
                    />
                  ) : null}
                  {['entry', 'exit', 'adjustment'].includes(operation) ? (
                    <>
                      <TextInput
                        accessibilityLabel="Motivo da movimentação"
                        maxLength={500}
                        multiline
                        onChangeText={(text) => {
                          setReason(text);
                          setFormError('');
                          onClearError();
                        }}
                        placeholder="Motivo"
                        style={[styles.input, styles.reasonInput]}
                        value={reason}
                      />
                      <Text style={styles.characterCount}>{reason.length}/500</Text>
                    </>
                  ) : null}
                  {error || formError ? (
                    <Text style={styles.error}>{error || formError}</Text>
                  ) : null}
                  <View style={styles.actions}>
                    <AppButton
                      title="Cancelar"
                      variant="outline"
                      onPress={onCancel}
                      disabled={isSaving}
                      style={styles.actionButton}
                    />
                    <AppButton
                      title="Revisar"
                      onPress={handleReview}
                      disabled={isSaving}
                      style={styles.actionButton}
                    />
                  </View>
                </>
              )}
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  keyboardAvoiding: { flex: 1 },
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  scrollContent: { flexGrow: 1, justifyContent: 'center' },
  dialog: {
    width: '100%',
    maxWidth: 460,
    alignSelf: 'center',
    borderRadius: 18,
    padding: 22,
    backgroundColor: colors.canvas,
  },
  title: { color: colors.ink, fontSize: 18, fontWeight: '800' },
  description: { color: colors.muted, fontSize: 13, lineHeight: 20, marginTop: 10 },
  input: {
    minHeight: 46,
    marginTop: 14,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    color: colors.ink,
    backgroundColor: colors.surface,
  },
  reasonInput: { minHeight: 86, paddingTop: 12, textAlignVertical: 'top' },
  characterCount: { color: colors.muted, fontSize: 10, textAlign: 'right', marginTop: 4 },
  reason: { color: colors.mutedStrong, fontSize: 12, marginTop: 10 },
  error: { color: colors.danger, fontSize: 12, lineHeight: 18, marginTop: 10 },
  pending: { color: colors.muted, fontSize: 12, marginTop: 10 },
  reconciled: { color: colors.mutedStrong, fontSize: 12, lineHeight: 18, marginTop: 14 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 22 },
  actionButton: { flex: 1, minHeight: 46, paddingHorizontal: 8 },
});
