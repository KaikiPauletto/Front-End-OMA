import { useEffect, useState } from 'react';
import {
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

export function ProductEditModal({ visible, product, price, onClose, onSave }) {
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [description, setDescription] = useState('');
  const [image, setImage] = useState(null);
  const [priceInput, setPriceInput] = useState('');
  const [selectedSubcategory, setSelectedSubcategory] = useState(null);
  const [selectingSubcategory, setSelectingSubcategory] = useState(false);

  useEffect(() => {
    if (!visible || !product) {
      return;
    }

    setName(product.name ?? '');
    setBrand(product.brand ?? '');
    setModel(product.model ?? '');
    setDescription(product.description ?? '');
    setImage(product.image ?? null);
    setPriceInput(formatPrice(String(Math.round(price * 100))));
    setSelectedSubcategory(getSubcategorySelection(product));
    setSelectingSubcategory(false);
  }, [visible, product, price]);

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
        setImage({ uri: result.assets[0].uri });
      }
    } catch (error) {
      Alert.alert(
        'Não foi possível selecionar a foto',
        error instanceof Error ? error.message : 'Tente novamente.',
      );
    }
  }

  function handleSave() {
    const parsedPrice = parsePrice(priceInput);
    if (
      !name.trim() ||
      !brand.trim() ||
      !model.trim() ||
      !description.trim() ||
      !image ||
      !Number.isFinite(parsedPrice) ||
      parsedPrice <= 0 ||
      !selectedSubcategory
    ) {
      Alert.alert(
        'Dados incompletos',
        'Preencha nome, marca, modelo, descrição, preço e subcategoria, e selecione uma imagem.',
      );
      return;
    }

    onSave({
      name: name.trim(),
      brand: brand.trim(),
      model: model.trim(),
      description: description.trim(),
      price: parsedPrice,
      image,
      category: selectedSubcategory.categoryId,
      subcategory: selectedSubcategory.id,
    });
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
              <ScrollView>
                {categories.map((categoryItem) => (
                  <View key={categoryItem.id}>
                    <Text style={styles.categoryGroupTitle}>{categoryItem.name}</Text>
                    {categoryItem.subcategories.map((subcategory) => (
                      <Pressable
                        key={subcategory.id}
                        onPress={() => {
                          setSelectedSubcategory({
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
              </ScrollView>
            ) : (
              <>
                <ScrollView
                  contentContainerStyle={styles.form}
                  keyboardShouldPersistTaps="handled"
                >
                  <Text style={styles.label}>Imagem</Text>
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

                  <Text style={styles.label}>Nome</Text>
                  <TextInput
                    onChangeText={setName}
                    placeholder="Nome do produto"
                    placeholderTextColor={colors.muted}
                    style={styles.input}
                    value={name}
                  />

                  <Text style={styles.label}>Marca</Text>
                  <TextInput
                    onChangeText={setBrand}
                    placeholder="Marca do produto"
                    placeholderTextColor={colors.muted}
                    style={styles.input}
                    value={brand}
                  />

                  <Text style={styles.label}>Modelo</Text>
                  <TextInput
                    onChangeText={setModel}
                    placeholder="Modelo do produto"
                    placeholderTextColor={colors.muted}
                    style={styles.input}
                    value={model}
                  />

                  <Text style={styles.label}>Preço</Text>
                  <View style={styles.priceInputContainer}>
                    <Text style={styles.currencyPrefix}>R$</Text>
                    <TextInput
                      keyboardType="number-pad"
                      onChangeText={(value) => setPriceInput(formatPrice(value))}
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

                  <Text style={styles.label}>Descrição</Text>
                  <TextInput
                    multiline
                    onChangeText={setDescription}
                    placeholder="Descreva os detalhes do produto"
                    placeholderTextColor={colors.muted}
                    style={[styles.input, styles.descriptionInput]}
                    textAlignVertical="top"
                    value={description}
                  />
                </ScrollView>
                <View style={styles.footer}>
                  <Pressable
                    accessibilityRole="button"
                    onPress={handleSave}
                    style={styles.saveButton}
                  >
                    <Text style={styles.saveButtonText}>Salvar alterações</Text>
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
});
