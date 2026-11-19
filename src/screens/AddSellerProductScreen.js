import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Pressable,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { ApiError } from '../services/apiClient';
import {
  createProduct,
  listCategories,
  listSubcategories,
} from '../services/productService';
import {
  registerInitialInventoryEntry,
  registerProductInventory,
  validateInitialQuantity,
} from '../services/inventoryService';
import { isDefinitivePostStatus } from '../services/postOutcome';
import { colors } from '../theme/colors';

const priceInputFormatter = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const productTypes = [
  {
    value: 'SINGLE_UNIT',
    label: 'Unitário',
    description: 'Uma unidade por produto.',
  },
  {
    value: 'MULTI_UNIT',
    label: 'Quantitativo',
    description: 'Produto vendido em várias unidades.',
  },
];

function formatPriceInput(value) {
  const digits = value.replace(/\D/g, '');
  return digits
    ? priceInputFormatter.format(Number(digits) / 100)
    : '';
}

function parsePrice(value) {
  const normalized = value.replace(/[^\d.,]/g, '');
  const separatorIndex = Math.max(normalized.lastIndexOf(','), normalized.lastIndexOf('.'));
  const integerPart = separatorIndex >= 0
    ? normalized.slice(0, separatorIndex)
    : normalized;
  const fractionalPart = separatorIndex >= 0
    ? normalized.slice(separatorIndex + 1)
    : '';
  const cents = fractionalPart.replace(/\D/g, '');

  if (cents.length > 2) {
    return Number.NaN;
  }

  const amount = `${integerPart.replace(/\D/g, '') || '0'}${cents ? `.${cents}` : ''}`;
  return Number(amount);
}

function getErrorMessage(error, operation = 'o cadastro') {
  if (error instanceof ApiError) {
    if (error.status === 401) {
      return 'Sua sessão expirou. Entre novamente como administrador antes de continuar.';
    }
    if (error.status === 403) {
      return 'Sua conta não tem permissão para concluir esta operação.';
    }
    if (error.status === 400) {
      return `A API rejeitou os dados enviados para ${operation}. Revise as informações.`;
    }
    if (error.status === 404) {
      return `Não foram encontrados os dados necessários para ${operation}.`;
    }
    if (error.status === 409) {
      return `A API recusou ${operation} por conflito. Verifique o estado atual antes de tentar novamente.`;
    }
    if (error.status === 502 || error.status === 503) {
      return `A API não confirmou ${operation}. Verifique manualmente antes de tentar novamente.`;
    }
    return `Não foi possível concluir ${operation} (HTTP ${error.status}).`;
  }
  return `Não foi possível confirmar ${operation} devido a uma falha de comunicação.`;
}

function isDefinitiveRequestRejection(error, operation) {
  return error instanceof ApiError &&
    isDefinitivePostStatus(error.status, operation);
}

function getStageLabel(stage) {
  if (stage === 'creation') {
    return 'criação do produto';
  }
  if (stage === 'registration') {
    return 'registro do estoque';
  }
  return 'entrada da quantidade inicial';
}

export function AddSellerProductScreen({ navigation }) {
  const { token } = useAuth();
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [price, setPrice] = useState('');
  const [model, setModel] = useState('');
  const [selectedSubcategory, setSelectedSubcategory] = useState(null);
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [productType, setProductType] = useState('');
  const [initialQuantity, setInitialQuantity] = useState('');
  const [subcategoryPickerVisible, setSubcategoryPickerVisible] = useState(false);
  const [categoryGroups, setCategoryGroups] = useState([]);
  const [isLoadingSubcategories, setIsLoadingSubcategories] = useState(true);
  const [subcategoryLoadError, setSubcategoryLoadError] = useState('');
  const [catalogReloadKey, setCatalogReloadKey] = useState(0);
  const [submitError, setSubmitError] = useState('');
  const [workflowStatus, setWorkflowStatus] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submitLock = useRef(false);
  const isFormLocked = isSubmitting || Boolean(workflowStatus);

  useEffect(() => {
    let isActive = true;

    async function loadSubcategories() {
      setIsLoadingSubcategories(true);
      setSubcategoryLoadError('');

      try {
        const categories = await listCategories();
        const groups = await Promise.all(categories.map(async (category) => {
          const subcategories = await listSubcategories(category.id);
          return {
            ...category,
            subcategories: subcategories.map((subcategory) => ({
              ...subcategory,
              categoryId: category.id,
              categoryName: category.name,
            })),
          };
        }));

        if (isActive) {
          setCategoryGroups(groups);
          setSelectedSubcategory(null);
        }
      } catch (error) {
        if (isActive) {
          setSubcategoryLoadError(
            getErrorMessage(error, 'o carregamento de categorias e subcategorias'),
          );
        }
      } finally {
        if (isActive) {
          setIsLoadingSubcategories(false);
        }
      }
    }

    loadSubcategories();
    return () => {
      isActive = false;
    };
  }, [catalogReloadKey]);

  function handleFieldChange(setter) {
    return (value) => {
      setter(value);
      setSubmitError('');
    };
  }

  async function handleSubmit() {
    if (submitLock.current) {
      return;
    }

    const parsedPrice = parsePrice(price);
    const subcategoryId = Number(selectedSubcategory?.id);
    const quantityValidation = validateInitialQuantity(initialQuantity, productType);
    if (
      !name.trim() ||
      !brand.trim() ||
      !model.trim() ||
      !description.trim() ||
      !Number.isFinite(parsedPrice) ||
      parsedPrice <= 0 ||
      !Number.isSafeInteger(subcategoryId) ||
      subcategoryId <= 0 ||
      !productTypes.some((type) => type.value === productType)
    ) {
      setSubmitError(
        'Preencha nome, marca, modelo, descrição, preço válido, subcategoria e tipo do produto.',
      );
      return;
    }
    if (quantityValidation.error) {
      setSubmitError(quantityValidation.error);
      return;
    }
    if (typeof token !== 'string' || !token.trim()) {
      setSubmitError('Sua sessão não está válida. Entre novamente como administrador.');
      return;
    }

    submitLock.current = true;
    setIsSubmitting(true);
    setSubmitError('');

    let keepSubmitLocked = false;
    try {
      const createdProduct = await createProduct({
        name: name.trim(),
        brand: brand.trim(),
        model: model.trim(),
        description: description.trim(),
        currency: 'BRL',
        price: parsedPrice,
        image: imageUrl.trim() || null,
        subcategoryId,
        productType,
      }, token);
      const productId = String(createdProduct.id);
      const quantity = quantityValidation.quantity;
      keepSubmitLocked = true;
      setWorkflowStatus({
        status: 'pending',
        stage: 'registration',
        productId,
        productType,
        quantity,
      });

      try {
        await registerProductInventory(productId, productType, token);
      } catch (error) {
        const outcome = isDefinitiveRequestRejection(error, 'inventoryRegistration')
          ? 'failed'
          : 'unknown';
        setWorkflowStatus({
          status: 'partial',
          stage: 'registration',
          outcome,
          productId,
          productType,
          quantity,
        });
        setSubmitError(getErrorMessage(error, 'o registro do estoque'));
        return;
      }

      if (quantity !== '0') {
        setWorkflowStatus({
          status: 'pending',
          stage: 'entry',
          productId,
          productType,
          quantity,
        });

        try {
          await registerInitialInventoryEntry(
            productId,
            productType,
            quantity,
            token,
          );
        } catch (error) {
          const outcome = isDefinitiveRequestRejection(error, 'inventoryEntry')
            ? 'failed'
            : 'unknown';
          setWorkflowStatus({
            status: 'partial',
            stage: 'entry',
            outcome,
            productId,
            productType,
            quantity,
          });
          setSubmitError(getErrorMessage(error, 'a entrada da quantidade inicial'));
          return;
        }
      }

      setWorkflowStatus({
        status: 'complete',
        stage: 'complete',
        productId,
        productType,
        quantity,
      });
    } catch (error) {
      if (isDefinitiveRequestRejection(error, 'productCreation')) {
        setSubmitError(getErrorMessage(error));
      } else {
        keepSubmitLocked = true;
        setWorkflowStatus({
          status: 'partial',
          stage: 'creation',
          outcome: 'unknown',
          productId: null,
          productType,
          quantity: quantityValidation.quantity,
        });
        setSubmitError(
          'A resposta da criação não foi confirmada. O produto pode ter sido criado; não reenvie o cadastro antes de verificar manualmente.',
        );
      }
    } finally {
      if (!keepSubmitLocked) {
        submitLock.current = false;
      }
      setIsSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.screen}
    >
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Voltar"
          onPress={() => navigation.navigate('Home')}
          style={styles.back}
        >
          <Ionicons name="arrow-back" size={21} color={colors.forest} />
        </Pressable>
        <Text style={styles.title}>Adicionar produto</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.form}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.label}>Nome</Text>
        <TextInput
          editable={!isFormLocked}
          onChangeText={handleFieldChange(setName)}
          placeholder="Nome do produto"
          placeholderTextColor={colors.muted}
          style={styles.input}
          value={name}
        />

        <Text style={styles.label}>Marca</Text>
        <TextInput
          editable={!isFormLocked}
          onChangeText={handleFieldChange(setBrand)}
          placeholder="Marca do produto"
          placeholderTextColor={colors.muted}
          style={styles.input}
          value={brand}
        />

        <Text style={styles.label}>Modelo</Text>
        <TextInput
          editable={!isFormLocked}
          onChangeText={handleFieldChange(setModel)}
          placeholder="Modelo do produto"
          placeholderTextColor={colors.muted}
          style={styles.input}
          value={model}
        />

        <Text style={styles.label}>Preço</Text>
        <View style={styles.priceInputContainer}>
          <Text style={styles.currencyPrefix}>R$</Text>
          <TextInput
            editable={!isFormLocked}
            keyboardType="number-pad"
            onChangeText={(value) => handleFieldChange(setPrice)(formatPriceInput(value))}
            placeholder="0,00"
            placeholderTextColor={colors.muted}
            style={styles.priceInput}
            value={price}
          />
        </View>

        <Text style={styles.label}>Subcategoria</Text>
        <Pressable
          accessibilityRole="button"
          disabled={
            isFormLocked ||
            isLoadingSubcategories ||
            categoryGroups.length === 0
          }
          onPress={() => setSubcategoryPickerVisible(true)}
          style={styles.categoryButton}
        >
          <Text style={selectedSubcategory ? styles.categorySelected : styles.categoryPlaceholder}>
            {isLoadingSubcategories
              ? 'Carregando subcategorias...'
              : selectedSubcategory
                ? `${selectedSubcategory.name} (${selectedSubcategory.categoryName})`
                : 'Selecione uma subcategoria'}
          </Text>
          {isLoadingSubcategories
            ? <ActivityIndicator size="small" color={colors.forest} />
            : <Ionicons name="chevron-down" size={18} color={colors.muted} />}
        </Pressable>
        {subcategoryLoadError ? (
          <View style={styles.loadErrorContainer}>
            <Text style={styles.errorText}>{subcategoryLoadError}</Text>
            <Pressable
              accessibilityRole="button"
              disabled={isFormLocked}
              onPress={() => setCatalogReloadKey((key) => key + 1)}
              style={styles.retryButton}
            >
              <Text style={styles.retryText}>Tentar novamente</Text>
            </Pressable>
          </View>
        ) : null}

        <Text style={styles.label}>Tipo do produto</Text>
        <View style={styles.productTypeOptions}>
          {productTypes.map((type) => {
            const isSelected = productType === type.value;
            return (
              <Pressable
                accessibilityRole="radio"
                accessibilityState={{ checked: isSelected }}
                disabled={isFormLocked}
                key={type.value}
                onPress={() => handleFieldChange(setProductType)(type.value)}
                style={[
                  styles.productTypeOption,
                  isSelected && styles.productTypeOptionSelected,
                ]}
              >
                <View style={styles.productTypeHeading}>
                  <Text style={isSelected ? styles.productTypeSelectedLabel : styles.productTypeLabel}>
                    {type.label}
                  </Text>
                  {isSelected ? (
                    <Ionicons name="checkmark-circle" size={18} color={colors.forest} />
                  ) : null}
                </View>
                <Text style={styles.productTypeDescription}>{type.description}</Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.label}>Estoque inicial</Text>
        <TextInput
          editable={!isFormLocked}
          keyboardType="number-pad"
          onChangeText={handleFieldChange(setInitialQuantity)}
          placeholder="Quantidade inteira"
          placeholderTextColor={colors.muted}
          style={styles.input}
          value={initialQuantity}
        />
        <Text style={styles.quantityHint}>
          {productType === 'SINGLE_UNIT'
            ? 'Produto unitário: informe 0 ou 1.'
            : 'Informe uma quantidade inteira de 0 até o limite suportado pela API.'}
        </Text>

        <Text style={styles.label}>URL da imagem (opcional)</Text>
        <TextInput
          autoCapitalize="none"
          autoCorrect={false}
          editable={!isFormLocked}
          keyboardType="url"
          onChangeText={handleFieldChange(setImageUrl)}
          placeholder="https://..."
          placeholderTextColor={colors.muted}
          style={styles.input}
          value={imageUrl}
        />

        <Text style={styles.label}>Informações do produto</Text>
        <TextInput
          editable={!isFormLocked}
          multiline
          onChangeText={handleFieldChange(setDescription)}
          placeholder="Descreva os detalhes do produto"
          placeholderTextColor={colors.muted}
          style={[styles.input, styles.descriptionInput]}
          textAlignVertical="top"
          value={description}
        />

        {submitError ? <Text style={styles.errorText}>{submitError}</Text> : null}
        {workflowStatus ? (
          <View
            style={[
              workflowStatus.status === 'complete'
                ? styles.successContainer
                : styles.partialContainer,
            ]}
          >
            <Text
              style={
                workflowStatus.status === 'complete'
                  ? styles.successText
                  : styles.partialText
              }
            >
              {workflowStatus.status === 'complete'
                ? 'Produto e estoque inicial cadastrados.'
                : workflowStatus.stage === 'creation'
                  ? 'Etapa pendente: criação do produto (resultado não confirmado).'
                  : `Etapa pendente: ${getStageLabel(workflowStatus.stage)}${
                    workflowStatus.outcome === 'unknown'
                      ? ' (resultado não confirmado).'
                      : ' (não concluída).'
                  }`}
            </Text>
            {workflowStatus.productId ? (
              <Text
                style={
                  workflowStatus.status === 'complete'
                    ? styles.successText
                    : styles.partialText
                }
              >
                ID do produto: {workflowStatus.productId}
              </Text>
            ) : null}
            <Text
              style={
                workflowStatus.status === 'complete'
                  ? styles.successText
                  : styles.partialText
              }
            >
              Quantidade inicial: {workflowStatus.quantity}
            </Text>
            {workflowStatus.stage === 'entry' ? (
              <Text style={styles.partialText}>Motivo da entrada: Estoque inicial</Text>
            ) : null}
            {workflowStatus.status !== 'complete' ? (
              <Text style={styles.partialText}>
                Não repita o cadastro nem a movimentação. Faça a conferência manual antes de qualquer nova operação.
              </Text>
            ) : null}
            {workflowStatus.productId ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => navigation.navigate('ProductDetails', {
                  productId: workflowStatus.productId,
                })}
                style={styles.viewProductButton}
              >
                <Text style={styles.viewProductText}>Visualizar produto</Text>
                <Ionicons name="arrow-forward" size={16} color={colors.forest} />
              </Pressable>
            ) : null}
          </View>
        ) : null}
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: isFormLocked }}
          disabled={isFormLocked}
          onPress={handleSubmit}
          style={[
            styles.submit,
            isFormLocked && styles.submitDisabled,
          ]}
        >
          {isSubmitting ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text style={styles.submitText}>
              {workflowStatus?.status === 'complete'
                ? 'Cadastro concluído'
                : workflowStatus
                  ? 'Cadastro bloqueado'
                  : 'Salvar produto'}
            </Text>
          )}
        </Pressable>
      </View>

      <Modal
        animationType="slide"
        onRequestClose={() => setSubcategoryPickerVisible(false)}
        transparent
        visible={subcategoryPickerVisible}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Escolha uma subcategoria</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Fechar subcategorias"
                onPress={() => setSubcategoryPickerVisible(false)}
              >
                <Ionicons name="close" size={24} color={colors.ink} />
              </Pressable>
            </View>
            <ScrollView>
              {categoryGroups.map((category) => (
                <View key={category.id}>
                  <Text style={styles.categoryGroupTitle}>{category.name}</Text>
                  {category.subcategories.map((subcategory) => (
                    <Pressable
                      accessibilityRole="button"
                      disabled={isFormLocked}
                      key={subcategory.id}
                      onPress={() => {
                        handleFieldChange(setSelectedSubcategory)(subcategory);
                        setSubcategoryPickerVisible(false);
                      }}
                      style={styles.categoryOption}
                    >
                      <Text style={styles.categoryOptionText}>{subcategory.name}</Text>
                      {selectedSubcategory?.id === subcategory.id &&
                      selectedSubcategory.categoryId === category.id ? (
                        <Ionicons name="checkmark" size={20} color={colors.forest} />
                      ) : null}
                    </Pressable>
                  ))}
                </View>
              ))}
              {!isLoadingSubcategories &&
              !subcategoryLoadError &&
              categoryGroups.every((category) => category.subcategories.length === 0) ? (
                <Text style={styles.emptySubcategories}>Nenhuma subcategoria disponível.</Text>
              ) : null}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 16 },
  back: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  title: { color: colors.ink, fontSize: 21, fontWeight: '800' },
  form: { paddingHorizontal: 22, paddingTop: 18, paddingBottom: 24 },
  label: { color: colors.ink, fontSize: 12, fontWeight: '700', marginBottom: 7, marginTop: 4 },
  input: {
    minHeight: 48,
    borderRadius: 14,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    paddingHorizontal: 14,
    color: colors.ink,
    marginBottom: 15,
  },
  priceInputContainer: {
    minHeight: 48,
    borderRadius: 14,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  currencyPrefix: { color: colors.muted, fontSize: 14, marginRight: 8 },
  priceInput: { flex: 1, color: colors.ink, paddingVertical: 12 },
  categoryButton: {
    minHeight: 48,
    borderRadius: 14,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  categoryPlaceholder: { color: colors.muted, fontSize: 13 },
  categorySelected: { color: colors.ink, fontSize: 13, fontWeight: '600' },
  productTypeOptions: { gap: 8, marginBottom: 15 },
  productTypeOption: {
    padding: 13,
    borderRadius: 14,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
  },
  productTypeOptionSelected: { borderColor: colors.forest, backgroundColor: colors.sage },
  productTypeHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  productTypeLabel: { color: colors.ink, fontSize: 13, fontWeight: '700' },
  productTypeSelectedLabel: { color: colors.forest, fontSize: 13, fontWeight: '800' },
  productTypeDescription: { color: colors.muted, fontSize: 11, marginTop: 4 },
  quantityHint: { color: colors.muted, fontSize: 11, lineHeight: 16, marginTop: -10, marginBottom: 15 },
  descriptionInput: { minHeight: 118, paddingTop: 13 },
  loadErrorContainer: { marginTop: -8, marginBottom: 12 },
  errorText: { color: colors.danger, fontSize: 12, lineHeight: 18, marginBottom: 12 },
  retryButton: { alignSelf: 'flex-start', marginBottom: 14 },
  retryText: { color: colors.forest, fontSize: 12, fontWeight: '800' },
  successContainer: {
    borderRadius: 14,
    backgroundColor: colors.sage,
    padding: 13,
    marginBottom: 8,
  },
  successText: { color: colors.forest, fontSize: 12, lineHeight: 18, fontWeight: '600' },
  partialContainer: {
    borderRadius: 14,
    backgroundColor: colors.clayLight,
    padding: 13,
    marginBottom: 8,
  },
  partialText: { color: colors.danger, fontSize: 12, lineHeight: 18, fontWeight: '600', marginBottom: 4 },
  viewProductButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    marginTop: 10,
  },
  viewProductText: { color: colors.forest, fontSize: 12, fontWeight: '800' },
  footer: {
    paddingHorizontal: 22,
    paddingTop: 12,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.canvas,
  },
  submit: {
    minHeight: 52,
    borderRadius: 16,
    backgroundColor: colors.forest,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitDisabled: { opacity: 0.7 },
  submitText: { color: colors.white, fontSize: 14, fontWeight: '800' },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
  },
  modalContent: {
    maxHeight: '75%',
    backgroundColor: colors.canvas,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 22,
    paddingTop: 20,
    paddingBottom: 28,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  modalTitle: { color: colors.ink, fontSize: 18, fontWeight: '800' },
  categoryOption: {
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  categoryGroupTitle: {
    color: colors.forest,
    fontSize: 12,
    fontWeight: '800',
    marginTop: 12,
    marginBottom: 4,
  },
  categoryOptionText: { color: colors.ink, fontSize: 14 },
  emptySubcategories: { color: colors.muted, fontSize: 13, paddingVertical: 16 },
});
