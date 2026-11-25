import { useState } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { colors } from '../theme/colors';

const MAX_PRODUCT_IMAGES = 8;

export function ProductImagesPicker({
  selectedAssets,
  onChange,
  existingCount = 0,
  disabled = false,
}) {
  const [error, setError] = useState('');
  const remainingCount = Math.max(
    0,
    MAX_PRODUCT_IMAGES - existingCount - selectedAssets.length,
  );

  async function selectImages() {
    if (disabled || remainingCount === 0) {
      return;
    }

    setError('');
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setError('Permita o acesso às fotos para selecionar imagens.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        selectionLimit: remainingCount,
        orderedSelection: true,
        quality: 0.8,
      });

      if (result.canceled) {
        return;
      }

      const assets = (result.assets ?? []).filter((asset) => typeof asset?.uri === 'string');
      const acceptedAssets = assets.slice(0, remainingCount);
      onChange([...selectedAssets, ...acceptedAssets]);
      if (assets.length > acceptedAssets.length) {
        setError(`O limite é de ${MAX_PRODUCT_IMAGES} imagens por produto.`);
      }
    } catch (selectionError) {
      setError(selectionError instanceof Error
        ? selectionError.message
        : 'Não foi possível selecionar as imagens.');
    }
  }

  function removeImage(uri) {
    onChange(selectedAssets.filter((asset) => asset.uri !== uri));
    setError('');
  }

  return (
    <View style={styles.container}>
      <Text style={styles.counter}>
        Imagens: {existingCount + selectedAssets.length}/{MAX_PRODUCT_IMAGES}
      </Text>
      <Text style={styles.hint}>
        {existingCount === 0
          ? 'A primeira imagem enviada será a principal.'
          : 'As imagens novas serão adicionadas após as imagens atuais.'}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: disabled || remainingCount === 0 }}
        disabled={disabled || remainingCount === 0}
        onPress={selectImages}
        style={[
          styles.pickerButton,
          (disabled || remainingCount === 0) && styles.disabled,
        ]}
      >
        <Ionicons name="images-outline" size={21} color={colors.forest} />
        <Text style={styles.pickerLabel}>
          {remainingCount > 0 ? 'Selecionar imagens' : 'Limite de imagens atingido'}
        </Text>
      </Pressable>
      {selectedAssets.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.previewList}
        >
          {selectedAssets.map((asset, index) => (
            <View key={`${asset.uri}-${index}`} style={styles.previewItem}>
              <Image source={{ uri: asset.uri }} style={styles.preview} resizeMode="cover" />
              <Text style={styles.previewLabel}>
                {existingCount === 0 && index === 0 ? 'Principal' : `Nova ${index + 1}`}
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Remover imagem ${index + 1}`}
                disabled={disabled}
                onPress={() => removeImage(asset.uri)}
                style={styles.removeButton}
              >
                <Ionicons name="close" size={15} color={colors.white} />
              </Pressable>
            </View>
          ))}
        </ScrollView>
      ) : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 15 },
  counter: { color: colors.ink, fontSize: 11, fontWeight: '700', marginBottom: 4 },
  hint: { color: colors.muted, fontSize: 10, lineHeight: 15, marginBottom: 8 },
  pickerButton: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.forestLight,
    backgroundColor: colors.surface,
  },
  pickerLabel: { color: colors.forest, fontSize: 12, fontWeight: '700' },
  disabled: { opacity: 0.55 },
  previewList: { gap: 9, paddingTop: 10, paddingBottom: 2 },
  previewItem: { width: 82, position: 'relative' },
  preview: {
    width: 82,
    height: 82,
    borderRadius: 9,
    backgroundColor: colors.surfaceMuted,
  },
  previewLabel: { color: colors.muted, fontSize: 9, textAlign: 'center', marginTop: 4 },
  removeButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 11,
    backgroundColor: 'rgba(0, 0, 0, 0.68)',
  },
  error: { color: colors.danger, fontSize: 11, lineHeight: 16, marginTop: 7 },
});
