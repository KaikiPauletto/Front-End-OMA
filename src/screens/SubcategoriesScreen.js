import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { AppHeader } from '../components/AppHeader';
import { useAuth } from '../contexts/AuthContext';
import {
  createSubcategory,
  listCategories,
  listSubcategories,
  setSubcategoryActive,
  updateSubcategory,
} from '../services/productService';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';

export function SubcategoriesScreen({ navigation, route }) {
  const categoryId = String(route.params?.categoryId ?? '');
  const { user, token } = useAuth();
  const isAdministrator = user?.role === 'ADMINISTRADOR';
  const [category, setCategory] = useState(null);
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [editorVisible, setEditorVisible] = useState(false);
  const [editingSubcategory, setEditingSubcategory] = useState(null);
  const [subcategoryName, setSubcategoryName] = useState('');
  const [targetCategoryId, setTargetCategoryId] = useState(categoryId);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [changingId, setChangingId] = useState('');
  const [pendingStatusSubcategory, setPendingStatusSubcategory] = useState(null);
  const [statusError, setStatusError] = useState('');
  const hasBeenFocused = useRef(false);

  useFocusEffect(useCallback(() => {
    if (hasBeenFocused.current) {
      setReloadKey((key) => key + 1);
    } else {
      hasBeenFocused.current = true;
    }
  }, []));

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');

    Promise.all([
      listCategories(isAdministrator ? token : undefined),
      listSubcategories(categoryId, isAdministrator ? token : undefined),
    ])
      .then(([categoryList, categorySubcategories]) => {
        if (!active) {
          return;
        }

        const foundCategory = categoryList.find((item) => item.id === categoryId);
        if (!foundCategory) {
          setCategory(null);
          setCategories(categoryList);
          setSubcategories([]);
          setError('Categoria não encontrada.');
          return;
        }
        setCategory(foundCategory);
        setCategories(categoryList);
        setSubcategories(categorySubcategories);
      })
      .catch((loadError) => {
        if (active) {
          setError(loadError instanceof Error
            ? loadError.message
            : 'Não foi possível carregar as subcategorias.');
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [categoryId, isAdministrator, token, reloadKey]);

  const activeCategories = categories.filter((item) => item.active !== false);

  function openEditor(subcategory = null) {
    setEditingSubcategory(subcategory);
    setSubcategoryName(subcategory?.name ?? '');
    setTargetCategoryId(subcategory?.categoryId ?? categoryId);
    setFormError('');
    setEditorVisible(true);
  }

  async function saveSubcategory() {
    const name = subcategoryName.trim();
    if (!name || name.length > 180) {
      setFormError('Informe um nome com até 180 caracteres.');
      return;
    }
    if (!targetCategoryId || !activeCategories.some((item) => item.id === targetCategoryId)) {
      setFormError('Selecione uma categoria ativa.');
      return;
    }
    if (saving) {
      return;
    }

    setSaving(true);
    setFormError('');
    try {
      if (editingSubcategory) {
        await updateSubcategory(editingSubcategory.id, targetCategoryId, name, token);
      } else {
        await createSubcategory(targetCategoryId, name, token);
      }
      setEditorVisible(false);
      setEditingSubcategory(null);
      setReloadKey((key) => key + 1);
    } catch (saveError) {
      setFormError(saveError instanceof Error
        ? saveError.message
        : 'Não foi possível salvar a subcategoria.');
    } finally {
      setSaving(false);
    }
  }

  async function changeSubcategoryStatus(subcategory) {
    const activating = subcategory.active === false;
    if (activating && category.active === false) {
      setStatusError('Ative a categoria antes de ativar esta subcategoria.');
      return;
    }

    setChangingId(subcategory.id);
    setStatusError('');
    try {
      await setSubcategoryActive(subcategory.id, activating, token);
      setReloadKey((key) => key + 1);
    } catch (statusError) {
      setStatusError(statusError instanceof Error
        ? statusError.message
        : 'Não foi possível alterar a subcategoria.');
    } finally {
      setChangingId('');
    }
  }

  function confirmSubcategoryStatus(subcategory) {
    setStatusError('');
    setPendingStatusSubcategory(subcategory);
  }

  if (loading || error || !category) {
    return (
      <View style={styles.screen}>
        <AppHeader navigation={navigation} title={category?.name ?? 'Categorias'} showBack />
        {loading ? (
          <ActivityIndicator style={styles.state} color={colors.forest} />
        ) : (
          <View style={styles.state}>
            <Text style={styles.empty}>{error || 'Categoria não encontrada.'}</Text>
            {error && error !== 'Categoria não encontrada.' ? (
              <Pressable onPress={() => setReloadKey((key) => key + 1)}>
                <Text style={styles.retry}>Tentar novamente</Text>
              </Pressable>
            ) : null}
          </View>
        )}
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <AppHeader navigation={navigation} title={category.name} showBack />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.intro}>
          <View style={styles.iconCircle}>
            <Ionicons name="grid-outline" size={22} color={colors.forest} />
          </View>
          <Text style={styles.heading}>{category.name}</Text>
          {isAdministrator && category.active === false ? (
            <Text style={styles.inactiveLabel}>Categoria inativa</Text>
          ) : null}
        </View>

        {!isAdministrator && category.active !== false ? (
          <Pressable
            style={styles.allCard}
            onPress={() => navigation.navigate('Produtos', { categoryId: category.id })}
          >
            <Text style={styles.allTitle}>Ver todos de {category.name}</Text>
            <Ionicons name="arrow-forward" size={18} color={colors.forest} />
          </Pressable>
        ) : null}

        {isAdministrator ? (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: category.active === false }}
            disabled={category.active === false}
            onPress={() => openEditor()}
            style={[styles.addButton, category.active === false && styles.disabledButton]}
          >
            <Ionicons name="add-circle-outline" size={19} color={colors.white} />
            <Text style={styles.addButtonText}>Nova subcategoria</Text>
          </Pressable>
        ) : (
          <Text style={styles.sectionLabel}>ESCOLHA UM TIPO</Text>
        )}

        {isAdministrator && category.active === false ? (
          <Text style={styles.notice}>
            Ative esta categoria para criar subcategorias ou reativar as existentes.
          </Text>
        ) : null}
        {statusError ? <Text style={styles.statusError}>{statusError}</Text> : null}

        {subcategories.length === 0 ? (
          <Text style={styles.emptyList}>Nenhuma subcategoria encontrada.</Text>
        ) : subcategories.map((subcategory) => (
          <View
            key={subcategory.id}
            style={[styles.subcategoryCard, subcategory.active === false && styles.inactiveCard]}
          >
            <Pressable
              accessibilityRole={isAdministrator ? 'button' : undefined}
              accessibilityLabel={isAdministrator ? `Editar ${subcategory.name}` : `Ver produtos de ${subcategory.name}`}
              onPress={() => {
                if (isAdministrator) {
                  openEditor(subcategory);
                } else {
                  navigation.navigate('Produtos', {
                    categoryId: category.id,
                    subcategoryId: subcategory.id,
                  });
                }
              }}
              style={({ pressed }) => [styles.subcategoryMain, pressed && styles.pressed]}
            >
              <View style={styles.bullet} />
              <View style={styles.subcategoryCopy}>
                <Text style={styles.subcategoryName}>{subcategory.name}</Text>
                {isAdministrator ? (
                  <Text style={[styles.status, subcategory.active === false && styles.inactiveStatus]}>
                    {subcategory.active === false ? 'Inativa' : 'Ativa'}
                  </Text>
                ) : null}
              </View>
              {isAdministrator
                ? <Ionicons name="create-outline" size={18} color={colors.forest} />
                : <Ionicons name="chevron-forward" size={17} color={colors.muted} />}
            </Pressable>
            {isAdministrator ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${subcategory.active === false ? 'Ativar' : 'Desativar'} subcategoria ${subcategory.name}`}
                accessibilityState={{ disabled: changingId === subcategory.id }}
                disabled={changingId === subcategory.id}
                onPress={() => confirmSubcategoryStatus(subcategory)}
                style={styles.statusButton}
              >
                {changingId === subcategory.id ? (
                  <ActivityIndicator size="small" color={colors.forest} />
                ) : (
                  <>
                    <Ionicons
                      name={subcategory.active === false ? 'checkmark-circle-outline' : 'remove-circle-outline'}
                      size={17}
                      color={subcategory.active === false ? colors.forest : colors.clay}
                    />
                    <Text style={[styles.actionText, subcategory.active !== false && styles.deactivateText]}>
                      {subcategory.active === false ? 'Ativar' : 'Desativar'}
                    </Text>
                  </>
                )}
              </Pressable>
            ) : null}
          </View>
        ))}
      </ScrollView>

      <Modal
        visible={editorVisible}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!saving) {
            setEditorVisible(false);
            setEditingSubcategory(null);
          }
        }}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              {editingSubcategory ? 'Editar subcategoria' : 'Nova subcategoria'}
            </Text>
            <TextInput
              autoFocus
              editable={!saving}
              maxLength={180}
              onChangeText={(value) => {
                setSubcategoryName(value);
                setFormError('');
              }}
              onSubmitEditing={saveSubcategory}
              placeholder="Nome da subcategoria"
              placeholderTextColor={colors.muted}
              returnKeyType="done"
              style={styles.input}
              value={subcategoryName}
            />
            <Text style={styles.pickerLabel}>Categoria</Text>
            <ScrollView style={styles.categoryOptions} nestedScrollEnabled>
              {activeCategories.map((item) => (
                <Pressable
                  key={item.id}
                  disabled={saving}
                  onPress={() => {
                    setTargetCategoryId(item.id);
                    setFormError('');
                  }}
                  style={[
                    styles.categoryOption,
                    targetCategoryId === item.id && styles.selectedCategoryOption,
                  ]}
                >
                  <Text style={[
                    styles.categoryOptionText,
                    targetCategoryId === item.id && styles.selectedCategoryOptionText,
                  ]}>
                    {item.name}
                  </Text>
                  {targetCategoryId === item.id
                    ? <Ionicons name="checkmark" size={17} color={colors.forest} />
                    : null}
                </Pressable>
              ))}
            </ScrollView>
            {activeCategories.length === 0 ? (
              <Text style={styles.formError}>Não há categorias ativas para associar.</Text>
            ) : null}
            {formError ? <Text style={styles.formError}>{formError}</Text> : null}
            <View style={styles.modalActions}>
              <Pressable
                disabled={saving}
                onPress={() => {
                  setEditorVisible(false);
                  setEditingSubcategory(null);
                }}
                style={styles.cancelButton}
              >
                <Text style={styles.cancelText}>Cancelar</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{
                  disabled: saving || activeCategories.length === 0,
                  busy: saving,
                }}
                disabled={saving || activeCategories.length === 0}
                onPress={saveSubcategory}
                style={[
                  styles.saveButton,
                  (saving || activeCategories.length === 0) && styles.disabledButton,
                ]}
              >
                {saving
                  ? <ActivityIndicator size="small" color={colors.white} />
                  : <Text style={styles.saveText}>Salvar</Text>}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={Boolean(pendingStatusSubcategory)}
        transparent
        animationType="fade"
        onRequestClose={() => setPendingStatusSubcategory(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              {pendingStatusSubcategory?.active === false
                ? 'Ativar subcategoria?'
                : 'Desativar subcategoria?'}
            </Text>
            <Text style={styles.confirmationText}>
              {pendingStatusSubcategory?.active === false
                ? `A subcategoria "${pendingStatusSubcategory.name}" voltará a aparecer no catálogo.`
                : `A subcategoria "${pendingStatusSubcategory?.name}" e seus produtos deixarão de aparecer no catálogo.`}
            </Text>
            <View style={styles.modalActions}>
              <Pressable
                onPress={() => setPendingStatusSubcategory(null)}
                style={styles.cancelButton}
              >
                <Text style={styles.cancelText}>Cancelar</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ busy: changingId === pendingStatusSubcategory?.id }}
                disabled={changingId === pendingStatusSubcategory?.id}
                onPress={() => {
                  const subcategory = pendingStatusSubcategory;
                  setPendingStatusSubcategory(null);
                  if (subcategory) {
                    changeSubcategoryStatus(subcategory);
                  }
                }}
                style={[
                  styles.confirmButton,
                  changingId === pendingStatusSubcategory?.id && styles.disabledButton,
                ]}
              >
                {changingId === pendingStatusSubcategory?.id
                  ? <ActivityIndicator size="small" color={colors.white} />
                  : (
                    <Text style={styles.saveText}>
                      {pendingStatusSubcategory?.active === false ? 'Ativar' : 'Desativar'}
                    </Text>
                  )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas },
  content: { paddingHorizontal: 18, paddingBottom: 28 },
  intro: { alignItems: 'center', paddingTop: 25, paddingBottom: 18 },
  iconCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: colors.sage,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 11,
  },
  heading: { color: colors.ink, fontFamily: typography.family.display, fontSize: 25 },
  inactiveLabel: { color: colors.clay, fontSize: 11, fontWeight: '700', marginTop: 5 },
  allCard: {
    minHeight: 52,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.sage,
    borderRadius: 9,
    paddingHorizontal: 15,
    marginBottom: 25,
  },
  allTitle: { color: colors.forest, fontWeight: '700', fontSize: 12 },
  sectionLabel: {
    color: colors.muted,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.2,
    marginBottom: 10,
  },
  addButton: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.forest,
    borderRadius: 9,
    marginBottom: 14,
  },
  addButtonText: { color: colors.white, fontSize: 13, fontWeight: '700' },
  notice: { color: colors.muted, fontSize: 11, lineHeight: 16, marginBottom: 12, textAlign: 'center' },
  statusError: { color: colors.clay, fontSize: 12, textAlign: 'center', paddingVertical: 10 },
  subcategoryCard: {
    paddingHorizontal: 13,
    paddingVertical: 8,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: '#EFEAE4',
    borderRadius: 9,
    marginBottom: 8,
  },
  inactiveCard: { opacity: 0.78 },
  subcategoryMain: { minHeight: 42, flexDirection: 'row', alignItems: 'center' },
  pressed: { opacity: 0.8 },
  bullet: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.clay, marginRight: 11 },
  subcategoryCopy: { flex: 1 },
  subcategoryName: { color: colors.ink, fontSize: 13, fontWeight: '600' },
  status: { color: colors.forest, fontSize: 10, marginTop: 3 },
  inactiveStatus: { color: colors.clay },
  statusButton: {
    minHeight: 30,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 5,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginTop: 5,
    paddingTop: 5,
  },
  actionText: { color: colors.forest, fontSize: 11, fontWeight: '700' },
  deactivateText: { color: colors.clay },
  empty: { padding: 24, color: colors.muted, textAlign: 'center' },
  emptyList: { padding: 16, color: colors.muted, fontSize: 12, textAlign: 'center' },
  state: { alignItems: 'center', paddingVertical: 28, paddingHorizontal: 20 },
  retry: { color: colors.forest, fontSize: 12, fontWeight: '700', marginTop: 10 },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'center',
    padding: 22,
    backgroundColor: 'rgba(20, 25, 18, 0.42)',
  },
  modalCard: {
    maxHeight: '85%',
    padding: 20,
    backgroundColor: colors.white,
    borderRadius: 14,
  },
  modalTitle: { color: colors.ink, fontSize: 18, fontWeight: '700', marginBottom: 15 },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    color: colors.ink,
    fontSize: 14,
  },
  pickerLabel: { color: colors.ink, fontSize: 12, fontWeight: '700', marginTop: 16, marginBottom: 7 },
  categoryOptions: { maxHeight: 170 },
  categoryOption: {
    minHeight: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 10,
    borderRadius: 7,
  },
  selectedCategoryOption: { backgroundColor: colors.sage },
  categoryOptionText: { color: colors.ink, fontSize: 12 },
  selectedCategoryOptionText: { color: colors.forest, fontWeight: '700' },
  formError: { color: colors.clay, fontSize: 11, marginTop: 9 },
  confirmationText: { color: colors.muted, fontSize: 13, lineHeight: 19 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 20 },
  cancelButton: { minHeight: 42, justifyContent: 'center', paddingHorizontal: 12 },
  cancelText: { color: colors.muted, fontSize: 12, fontWeight: '700' },
  saveButton: {
    minWidth: 90,
    minHeight: 42,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    backgroundColor: colors.forest,
    borderRadius: 8,
  },
  saveText: { color: colors.white, fontSize: 12, fontWeight: '700' },
  confirmButton: {
    minWidth: 100,
    minHeight: 42,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    backgroundColor: colors.clay,
    borderRadius: 8,
  },
  disabledButton: { opacity: 0.7 },
});
