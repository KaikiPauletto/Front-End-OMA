import { useState } from 'react';
import {
  Alert,
  Image,
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
import * as ImagePicker from 'expo-image-picker';
import { useSellerProducts } from '../contexts/SellerProductsContext';
import { categories } from '../data/categories';
import { colors } from '../theme/colors';

const priceInputFormatter = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

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

export function AddSellerProductScreen({ navigation }) {
  const { addProduct } = useSellerProducts();
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [price, setPrice] = useState('');
  const [quantity, setQuantity] = useState('');
  const [model, setModel] = useState('');
  const [selectedSubcategory, setSelectedSubcategory] = useState(null);
  const [description, setDescription] = useState('');
  const [image, setImage] = useState(null);
  const [subcategoryPickerVisible, setSubcategoryPickerVisible] = useState(false);

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

  function handleSubmit() {
    const parsedQuantity = Number(quantity);
    const parsedPrice = parsePrice(price);
    if (
      !image ||
      !name.trim() ||
      !brand.trim() ||
      !Number.isFinite(parsedPrice) ||
      parsedPrice <= 0 ||
      !quantity.trim() ||
      !Number.isInteger(parsedQuantity) ||
      parsedQuantity < 0 ||
      !model.trim() ||
      !selectedSubcategory ||
      !description.trim()
    ) {
      Alert.alert(
        'Dados incompletos',
        'Anexe uma foto e preencha nome, marca, preço, quantidade, modelo, subcategoria e informações do produto.',
      );
      return;
    }

    addProduct({
      name: name.trim(),
      brand: brand.trim(),
      price: parsedPrice,
      quantity: parsedQuantity,
      model: model.trim(),
      category: selectedSubcategory.categoryId,
      subcategory: selectedSubcategory.id,
      description: description.trim(),
      image,
    });
    navigation.navigate('Vendas');
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
        <Text style={styles.label}>Foto do produto</Text>
        <Pressable
          accessibilityRole="button"
          onPress={handleSelectImage}
          style={styles.imagePicker}
        >
          {image ? (
            <Image source={image} style={styles.preview} resizeMode="cover" />
          ) : (
            <>
              <Ionicons name="camera-outline" size={28} color={colors.forest} />
              <Text style={styles.imagePickerText}>Anexar foto</Text>
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

        <Text style={styles.label}>Preço</Text>
        <View style={styles.priceInputContainer}>
          <Text style={styles.currencyPrefix}>R$</Text>
          <TextInput
            keyboardType="number-pad"
            onChangeText={(value) => setPrice(formatPriceInput(value))}
            placeholder="0,00"
            placeholderTextColor={colors.muted}
            style={styles.priceInput}
            value={price}
          />
        </View>

        <Text style={styles.label}>Quantidade</Text>
        <TextInput
          keyboardType="number-pad"
          onChangeText={(value) => setQuantity(value.replace(/[^0-9]/g, ''))}
          placeholder="Quantidade disponível"
          placeholderTextColor={colors.muted}
          style={styles.input}
          value={quantity}
        />

        <Text style={styles.label}>Modelo</Text>
        <TextInput
          onChangeText={setModel}
          placeholder="Modelo do produto"
          placeholderTextColor={colors.muted}
          style={styles.input}
          value={model}
        />

        <Text style={styles.label}>Subcategoria</Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => setSubcategoryPickerVisible(true)}
          style={styles.categoryButton}
        >
          <Text style={selectedSubcategory ? styles.categorySelected : styles.categoryPlaceholder}>
            {selectedSubcategory
              ? `${selectedSubcategory.name} (${selectedSubcategory.categoryName})`
              : 'Selecione uma subcategoria'}
          </Text>
          <Ionicons name="chevron-down" size={18} color={colors.muted} />
        </Pressable>

        <Text style={styles.label}>Informações do produto</Text>
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
          onPress={handleSubmit}
          style={styles.submit}
        >
          <Text style={styles.submitText}>Salvar produto</Text>
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
                        setSubcategoryPickerVisible(false);
                      }}
                      style={styles.categoryOption}
                    >
                      <Text style={styles.categoryOptionText}>{subcategory.name}</Text>
                      {selectedSubcategory?.id === subcategory.id &&
                      selectedSubcategory.categoryId === categoryItem.id ? (
                        <Ionicons name="checkmark" size={20} color={colors.forest} />
                      ) : null}
                    </Pressable>
                  ))}
                </View>
              ))}
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
  imagePicker: {
    height: 148,
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.forestLight,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 17,
    overflow: 'hidden',
  },
  imagePickerText: { color: colors.forest, fontSize: 12, fontWeight: '700', marginTop: 7 },
  preview: { width: '100%', height: '100%' },
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
  descriptionInput: { minHeight: 118, paddingTop: 13 },
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
});
