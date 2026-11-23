import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { ProductImage } from './ProductImage';
import { categories } from '../data/categories';
import {
  listCategories,
  listSubcategories,
  normalizeProductImageUrl,
} from '../services/productService';
import { colors } from '../theme/colors';

const priceFormatter = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function formatPrice(value) {
  const digits = value.replace(/\D/g, '');
  return digits ? priceFormatter.format(Number(digits) / 100) : '';
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

  return Number(`${integerPart.replace(/\D/g, '') || '0'}${cents ? `.${cents}` : ''}`);
}

function getSubcategorySelection(product) {
  const category = categories.find((item) => item.id === product.category);
  const subcategory = category?.subcategories.find(
    (item) => item.id === product.subcategory,
  );
  return subcategory
    ? { ...subcategory, categoryId: category.id, categoryName: category.name }
    : null;
}

function getSaveErrorMessage(error) {
  return error instanceof Error
    ? error.message
    : 'Não foi possível salvar as alterações. Tente novamente.';
}

export function ProductEditModal({
  visible,
  product,
  price,
  currency = 'BRL',
  remote = false,
  onClose,
  onSave,
}) {
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [description, setDescription] = useState('');
  const [image, setImage] = useState(null);
  const [imageUrl, setImageUrl] = useState('');
  const [imageAsset, setImageAsset] = useState(null);
  const [priceInput, setPriceInput] = useState('');
  const [selectedSubcategory, setSelectedSubcategory] = useState(null);
  const [selectingSubcategory, setSelectingSubcategory] = useState(false);
  const [categoryGroups, setCategoryGroups] = useState([]);
  const [isLoadingSubcategories, setIsLoadingSubcategories] = useState(false);
  const [subcategoryLoadError, setSubcategoryLoadError] = useState('');
  const [categoryReloadKey, setCategoryReloadKey] = useState(0);
  const [submitError, setSubmitError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const saveLock = useRef(false);

  useEffect(() => {
    if (!visible || !product) {
      return;
    }

    setName(product.name ?? '');
    setBrand(product.brand ?? '');
    setModel(product.model ?? '');
    setDescription(product.description ?? '');
    setImage(product.image ?? null);
    const currentImageUrl = typeof product.image === 'string'
      ? product.image
      : product.image?.uri;
    setImageUrl(
      !Array.isArray(product.images) || product.images.length === 0
        ? currentImageUrl ?? ''
        : '',
    );
    setImageAsset(null);
    setPriceInput(formatPrice(String(Math.round(price * 100))));
    setSelectedSubcategory(remote ? null : getSubcategorySelection(product));
    setSelectingSubcategory(false);
    setSubmitError('');
  }, [visible, product, price, remote]);

  useEffect(() => {
    if (!visible || !product || !remote) {
      setCategoryGroups([]);
      setIsLoadingSubcategories(false);
      setSubcategoryLoadError('');
      return undefined;
    }

    let isActive = true;
    setIsLoadingSubcategories(true);
    setSubcategoryLoadError('');

    async function loadSubcategories() {
      try {
        const categoriesFromApi = await listCategories();
        const groups = await Promise.all(categoriesFromApi.map(async (category) => {
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
          const selectedId = String(product.subcategoryId ?? product.subcategory ?? '');
          const currentSubcategory = groups
            .flatMap((category) => category.subcategories)
            .find((subcategory) => subcategory.id === selectedId);
          setSelectedSubcategory(currentSubcategory ?? null);
        }
      } catch (error) {
        if (isActive) {
          setSubcategoryLoadError(getSaveErrorMessage(error));
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
  }, [visible, product, remote, categoryReloadKey]);

  const displayedCategoryGroups = remote ? categoryGroups : categories;
  const currencyPrefix = currency === 'BRL' ? 'R$' : currency;

  function handleFieldChange(setter) {
    return (value) => {
      setter(value);
      setSubmitError('');
    };
  }

  async function handleSelectImage() {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          'Permissão necessária',
          'Permita o acesso às fotos para anexar uma imagem ao produto.',
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setImageAsset(result.assets[0]);
        setImage({ uri: result.assets[0].uri });
        setImageUrl('');
      }
    } catch (error) {
      Alert.alert(
        'Não foi possível selecionar a foto',
        error instanceof Error ? error.message : 'Tente novamente.',
      );
    }
  }

  async function handleSave() {
    if (saveLock.current) {
      return;
    }

    let normalizedImageUrl;
    try {
      normalizedImageUrl = normalizeProductImageUrl(imageUrl);
    } catch (error) {
      setSubmitError(error.message);
      return;
    }

    const parsedPrice = parsePrice(priceInput);
    const subcategoryId = Number(selectedSubcategory?.id);
    const invalidFields = (
      !name.trim() ||
      !brand.trim() ||
      !model.trim() ||
      !description.trim() ||
      !Number.isFinite(parsedPrice) ||
      parsedPrice <= 0 ||
      !selectedSubcategory ||
      (remote && (
        !currency.trim() ||
        !Number.isSafeInteger(subcategoryId) ||
        subcategoryId <= 0
      )) ||
      (!remote && !image)
    );

    if (invalidFields) {
      const message = remote
        ? 'Preencha nome, marca, modelo, descrição, preço válido e subcategoria.'
        : 'Preencha nome, marca, modelo, descrição, preço e subcategoria, e selecione uma imagem.';
      if (remote) {
        setSubmitError(message);
      } else {
        Alert.alert('Dados incompletos', message);
      }
      return;
    }

    const editedProduct = {
      name: name.trim(),
      brand: brand.trim(),
      model: model.trim(),
      description: description.trim(),
      price: parsedPrice,
      ...(remote
        ? {
          currency: currency.trim(),
          subcategoryId,
          ...(!Array.isArray(product.images) || product.images.length === 0
            ? { image: normalizedImageUrl }
            : {}),
        }
        : {
          image: normalizedImageUrl ? { uri: normalizedImageUrl } : image,
          category: selectedSubcategory.categoryId,
          subcategory: selectedSubcategory.id,
        }),
    };

    saveLock.current = true;
    setIsSaving(true);
    setSubmitError('');
    try {
      await onSave(editedProduct, remote ? imageAsset : null);
    } catch (error) {
      setSubmitError(getSaveErrorMessage(error));
    } finally {
      saveLock.current = false;
      setIsSaving(false);
    }
  }

  return (
    <Modal
      animationType="slide"
      onRequestClose={onClose}
      transparent
      visible={visible}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardAvoiding}
      >
        <View style={styles.backdrop}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              {selectingSubcategory ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Voltar para edição do produto"
                  onPress={() => setSelectingSubcategory(false)}
                  style={styles.headerButton}
                >
                  <Ionicons name="arrow-back" size={20} color={colors.forest} />
                </Pressable>
              ) : null}
              <Text style={styles.modalTitle}>
                {selectingSubcategory ? 'Escolha uma subcategoria' : 'Editar produto'}
              </Text>
              {!selectingSubcategory ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Fechar edição"
                  onPress={onClose}
                  style={styles.headerButton}
                >
                  <Ionicons name="close" size={23} color={colors.ink} />
                </Pressable>
              ) : null}
            </View>

            {selectingSubcategory ? (
              <>
                {isLoadingSubcategories ? (
                  <ActivityIndicator color={colors.forest} style={styles.loadingIndicator} />
                ) : null}
                {subcategoryLoadError ? (
                  <View>
                    <Text style={styles.errorText}>{subcategoryLoadError}</Text>
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => setCategoryReloadKey((key) => key + 1)}
                      style={styles.retryButton}
                    >
                      <Text style={styles.retryText}>Tentar novamente</Text>
                    </Pressable>
                  </View>
                ) : null}
                <ScrollView>
                  {displayedCategoryGroups.map((categoryItem) => (
                    <View key={categoryItem.id}>
                      <Text style={styles.categoryGroupTitle}>{categoryItem.name}</Text>
                      {categoryItem.subcategories.map((subcategory) => (
                        <Pressable
                          accessibilityRole="button"
                          key={subcategory.id}
                          onPress={() => {
                            handleFieldChange(setSelectedSubcategory)({
                              ...subcategory,
                              categoryId: categoryItem.id,
                              categoryName: categoryItem.name,
                            });
                            setSelectingSubcategory(false);
                          }}
                          style={styles.subcategoryOption}
                        >
                          <Text style={styles.subcategoryText}>{subcategory.name}</Text>
                          {selectedSubcategory?.id === subcategory.id &&
                          selectedSubcategory.categoryId === categoryItem.id ? (
                            <Ionicons name="checkmark" size={20} color={colors.forest} />
                          ) : null}
                        </Pressable>
                      ))}
                    </View>
                  ))}
                  {!isLoadingSubcategories &&
                  !subcategoryLoadError &&
                  displayedCategoryGroups.every((category) => category.subcategories.length === 0) ? (
                    <Text style={styles.emptySubcategories}>Nenhuma subcategoria disponível.</Text>
                  ) : null}
                </ScrollView>
              </>
            ) : (
              <>
                <ScrollView
                  contentContainerStyle={styles.form}
                  keyboardShouldPersistTaps="handled"
                >
                  {remote ? (
                    <>
                      <Text style={styles.label}>URL da imagem (opcional)</Text>
                      <TextInput
                        autoCapitalize="none"
                        autoCorrect={false}
                        editable={!product.images?.length}
                        keyboardType="url"
                        onChangeText={(value) => {
                          setImageUrl(value);
                          setImageAsset(null);
                          setImage(value.trim() ? { uri: value.trim() } : null);
                          setSubmitError('');
                        }}
                        placeholder="https://exemplo.com/imagem.jpg"
                        placeholderTextColor={colors.muted}
                        style={styles.input}
                        value={imageUrl}
                      />
                      {product.images?.length ? (
                        <Text style={styles.imageHint}>
                          Este produto já possui imagens anexadas; a URL legada não as substitui.
                        </Text>
                      ) : (
                        <Text style={styles.imageHint}>Ou anexe uma imagem do dispositivo:</Text>
                      )}
                      <Pressable
                        accessibilityRole="button"
                        onPress={handleSelectImage}
                        style={styles.imagePicker}
                      >
                        {image ? (
                          <ProductImage
                            source={image}
                            style={styles.preview}
                            resizeMode="cover"
                            accessibilityLabel={name || 'Imagem do produto'}
                          />
                        ) : (
                          <>
                            <Ionicons name="camera-outline" size={26} color={colors.forest} />
                            <Text style={styles.imagePickerText}>Selecionar imagem do dispositivo</Text>
                          </>
                        )}
                      </Pressable>
                    </>
                  ) : (
                    <>
                      <Text style={styles.label}>URL da imagem</Text>
                      <TextInput
                        autoCapitalize="none"
                        autoCorrect={false}
                        keyboardType="url"
                        onChangeText={(value) => {
                          setImageUrl(value);
                          setImageAsset(null);
                          setImage(value.trim() ? { uri: value.trim() } : null);
                          setSubmitError('');
                        }}
                        placeholder="https://exemplo.com/imagem.jpg"
                        placeholderTextColor={colors.muted}
                        style={styles.input}
                        value={imageUrl}
                      />
                      <Text style={styles.imageHint}>Ou anexe uma imagem do dispositivo:</Text>
                      <Pressable
                        accessibilityRole="button"
                        onPress={handleSelectImage}
                        style={styles.imagePicker}
                      >
                        {image ? (
                          <ProductImage
                            source={image}
                            style={styles.preview}
                            resizeMode="cover"
                            accessibilityLabel={name || 'Imagem do produto'}
                          />
                        ) : (
                          <>
                            <Ionicons name="camera-outline" size={26} color={colors.forest} />
                            <Text style={styles.imagePickerText}>Selecionar imagem</Text>
                          </>
                        )}
                      </Pressable>
                    </>
                  )}

                  <Text style={styles.label}>Nome</Text>
                  <TextInput
                    onChangeText={handleFieldChange(setName)}
                    placeholder="Nome do produto"
                    placeholderTextColor={colors.muted}
                    style={styles.input}
                    value={name}
                  />

                  <Text style={styles.label}>Marca</Text>
                  <TextInput
                    onChangeText={handleFieldChange(setBrand)}
                    placeholder="Marca do produto"
                    placeholderTextColor={colors.muted}
                    style={styles.input}
                    value={brand}
                  />

                  <Text style={styles.label}>Modelo</Text>
                  <TextInput
                    onChangeText={handleFieldChange(setModel)}
                    placeholder="Modelo do produto"
                    placeholderTextColor={colors.muted}
                    style={styles.input}
                    value={model}
                  />

                  <Text style={styles.label}>Preço</Text>
                  <View style={styles.priceInputContainer}>
                    <Text style={styles.currencyPrefix}>{currencyPrefix}</Text>
                    <TextInput
                      keyboardType="number-pad"
                      onChangeText={(value) => handleFieldChange(setPriceInput)(formatPrice(value))}
                      placeholder="0,00"
                      placeholderTextColor={colors.muted}
                      style={styles.priceInput}
                      value={priceInput}
                    />
                  </View>

                  <Text style={styles.label}>Subcategoria</Text>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => setSelectingSubcategory(true)}
                    style={styles.subcategoryButton}
                  >
                    <Text style={selectedSubcategory ? styles.selectedText : styles.placeholderText}>
                      {selectedSubcategory
                        ? `${selectedSubcategory.name} (${selectedSubcategory.categoryName})`
                        : 'Selecione uma subcategoria'}
                    </Text>
                    <Ionicons name="chevron-down" size={18} color={colors.muted} />
                  </Pressable>
                  {remote && subcategoryLoadError ? (
                    <Text style={styles.errorText}>{subcategoryLoadError}</Text>
                  ) : null}

                  <Text style={styles.label}>Descrição</Text>
                  <TextInput
                    multiline
                    onChangeText={handleFieldChange(setDescription)}
                    placeholder="Descreva os detalhes do produto"
                    placeholderTextColor={colors.muted}
                    style={[styles.input, styles.descriptionInput]}
                    textAlignVertical="top"
                    value={description}
                  />
                  {submitError ? <Text style={styles.errorText}>{submitError}</Text> : null}
                </ScrollView>
                <View style={styles.footer}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ disabled: isSaving }}
                    disabled={isSaving}
                    onPress={handleSave}
                    style={[styles.saveButton, isSaving && styles.disabledButton]}
                  >
                    {isSaving ? (
                      <ActivityIndicator color={colors.white} />
                    ) : (
                      <Text style={styles.saveButtonText}>Salvar alterações</Text>
                    )}
                  </Pressable>
                </View>
              </>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  keyboardAvoiding: { flex: 1 },
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  modalContent: {
    maxHeight: '92%',
    backgroundColor: colors.canvas,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 22,
    paddingTop: 16,
    paddingBottom: 20,
  },
  modalHeader: {
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  modalTitle: { flex: 1, color: colors.ink, fontSize: 18, fontWeight: '800' },
  headerButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  form: { paddingBottom: 18 },
  label: { color: colors.ink, fontSize: 12, fontWeight: '700', marginBottom: 7, marginTop: 4 },
  imagePicker: {
    height: 120,
    borderRadius: 14,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.forestLight,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 13,
    overflow: 'hidden',
  },
  imagePickerText: { color: colors.forest, fontSize: 12, fontWeight: '700', marginTop: 7 },
  imageHint: { color: colors.muted, fontSize: 11, marginTop: -4, marginBottom: 8 },
  preview: { width: '100%', height: '100%' },
  input: {
    minHeight: 46,
    borderRadius: 13,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    paddingHorizontal: 13,
    color: colors.ink,
    marginBottom: 12,
  },
  priceInputContainer: {
    minHeight: 46,
    borderRadius: 13,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    paddingHorizontal: 13,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  currencyPrefix: { color: colors.muted, fontSize: 14, marginRight: 8 },
  priceInput: { flex: 1, color: colors.ink, paddingVertical: 11 },
  subcategoryButton: {
    minHeight: 46,
    borderRadius: 13,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    paddingHorizontal: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  placeholderText: { color: colors.muted, fontSize: 13 },
  selectedText: { color: colors.ink, fontSize: 13, fontWeight: '600' },
  descriptionInput: { minHeight: 90, paddingTop: 12 },
  footer: { paddingTop: 8 },
  saveButton: {
    minHeight: 50,
    borderRadius: 15,
    backgroundColor: colors.forest,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabledButton: { opacity: 0.7 },
  saveButtonText: { color: colors.white, fontSize: 14, fontWeight: '800' },
  categoryGroupTitle: {
    color: colors.forest,
    fontSize: 12,
    fontWeight: '800',
    marginTop: 12,
    marginBottom: 4,
  },
  subcategoryOption: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  subcategoryText: { color: colors.ink, fontSize: 14 },
  loadingIndicator: { paddingVertical: 12 },
  errorText: { color: colors.danger, fontSize: 12, lineHeight: 18, marginBottom: 10 },
  retryButton: { alignSelf: 'flex-start', marginBottom: 12 },
  retryText: { color: colors.forest, fontSize: 12, fontWeight: '800' },
  emptySubcategories: { color: colors.muted, fontSize: 13, paddingVertical: 16 },
});
