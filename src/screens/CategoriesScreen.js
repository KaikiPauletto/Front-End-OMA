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
  createCategory,
  listCategories,
  setCategoryActive,
  updateCategory,
} from '../services/productService';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';

export function CategoriesScreen({ navigation }) {
  const { user, token } = useAuth();
  const isAdministrator = user?.role === 'ADMINISTRADOR';
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [editingCategory, setEditingCategory] = useState(null);
  const [editorVisible, setEditorVisible] = useState(false);
  const [categoryName, setCategoryName] = useState('');
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [changingId, setChangingId] = useState('');
  const [pendingStatusCategory, setPendingStatusCategory] = useState(null);
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

    listCategories(isAdministrator ? token : undefined)
      .then((result) => {
        if (active) {
          setCategories(result);
        }
      })
      .catch((loadError) => {
        if (active) {
          setError(loadError instanceof Error
            ? loadError.message
            : 'Não foi possível carregar as categorias.');
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
  }, [isAdministrator, token, reloadKey]);

  function openEditor(category = null) {
    setEditingCategory(category);
    setCategoryName(category?.name ?? '');
    setFormError('');
    setEditorVisible(true);
  }

  async function saveCategory() {
    const name = categoryName.trim();
    if (!name || name.length > 180) {
      setFormError('Informe um nome com até 180 caracteres.');
      return;
    }
    if (saving) {
      return;
    }

    setSaving(true);
    setFormError('');
    try {
      if (editingCategory) {
        await updateCategory(editingCategory.id, name, token);
      } else {
        await createCategory(name, token);
      }
      setEditorVisible(false);
      setEditingCategory(null);
      setReloadKey((key) => key + 1);
    } catch (saveError) {
      setFormError(saveError instanceof Error
        ? saveError.message
        : 'Não foi possível salvar a categoria.');
    } finally {
      setSaving(false);
    }
  }

  async function changeCategoryStatus(category) {
    setChangingId(category.id);
    setStatusError('');
    try {
      await setCategoryActive(category.id, category.active === false, token);
      setReloadKey((key) => key + 1);
    } catch (statusError) {
      setStatusError(statusError instanceof Error
        ? statusError.message
        : 'Não foi possível alterar a categoria.');
    } finally {
      setChangingId('');
    }
  }

  function confirmCategoryStatus(category) {
    setStatusError('');
    setPendingStatusCategory(category);
  }

  return (
    <View style={styles.screen}>
      <AppHeader
        navigation={navigation}
        title={isAdministrator ? 'Gerenciar categorias' : 'Categorias'}
        showBack
        showMenu={false}
        tone="forest"
      />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.intro}>
          <Text style={styles.eyebrow}>{isAdministrator ? 'ADMINISTRAÇÃO' : 'EXPLORAR'}</Text>
          <Text style={styles.heading}>
            {isAdministrator
              ? 'Organize as categorias e seus tipos de produto.'
              : 'Encontre o essencial para a sua mateada.'}
          </Text>
          <View style={styles.rule} />
        </View>

        {isAdministrator ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => openEditor()}
            style={styles.addButton}
          >
            <Ionicons name="add-circle-outline" size={19} color={colors.white} />
            <Text style={styles.addButtonText}>Nova categoria</Text>
          </Pressable>
        ) : null}

        {loading ? (
          <ActivityIndicator style={styles.state} color={colors.forest} />
        ) : error ? (
          <View style={styles.state}>
            <Text style={styles.stateText}>{error}</Text>
            <Pressable onPress={() => setReloadKey((key) => key + 1)}>
              <Text style={styles.retry}>Tentar novamente</Text>
            </Pressable>
          </View>
        ) : categories.length === 0 ? (
          <Text style={styles.empty}>Nenhuma categoria encontrada.</Text>
        ) : categories.map((category) => (
          <View key={category.id} style={[styles.categoryCard, category.active === false && styles.inactiveCard]}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Abrir subcategorias de ${category.name}`}
              onPress={() => navigation.navigate('Subcategorias', { categoryId: category.id })}
              style={({ pressed }) => [styles.categoryMain, pressed && styles.pressed]}
            >
              <View style={styles.iconCircle}>
                <Ionicons name="grid-outline" size={21} color={colors.forest} />
              </View>
              <View style={styles.categoryCopy}>
                <Text style={styles.categoryName}>{category.name}</Text>
                {isAdministrator ? (
                  <Text style={[styles.status, category.active === false && styles.inactiveStatus]}>
                    {category.active === false ? 'Inativa' : 'Ativa'} · Gerenciar subcategorias
                  </Text>
                ) : null}
              </View>
              <Ionicons name="chevron-forward" size={19} color={colors.muted} />
            </Pressable>
            {isAdministrator ? (
              <View style={styles.actions}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Editar categoria ${category.name}`}
                  onPress={() => openEditor(category)}
                  style={styles.actionButton}
                >
                  <Ionicons name="create-outline" size={17} color={colors.forest} />
                  <Text style={styles.actionText}>Editar</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${category.active === false ? 'Ativar' : 'Desativar'} categoria ${category.name}`}
                  accessibilityState={{ disabled: changingId === category.id }}
                  disabled={changingId === category.id}
                  onPress={() => confirmCategoryStatus(category)}
                  style={styles.actionButton}
                >
                  {changingId === category.id ? (
                    <ActivityIndicator size="small" color={colors.forest} />
                  ) : (
                    <>
                      <Ionicons
                        name={category.active === false ? 'checkmark-circle-outline' : 'remove-circle-outline'}
                        size={17}
                        color={category.active === false ? colors.forest : colors.clay}
                      />
                      <Text style={[styles.actionText, category.active !== false && styles.deactivateText]}>
                        {category.active === false ? 'Ativar' : 'Desativar'}
                      </Text>
                    </>
                  )}
                </Pressable>
              </View>
            ) : null}
          </View>
        ))}
        {statusError ? <Text style={styles.statusError}>{statusError}</Text> : null}
      </ScrollView>

      <Modal
        visible={editorVisible}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!saving) {
            setEditorVisible(false);
            setEditingCategory(null);
          }
        }}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              {editingCategory ? 'Editar categoria' : 'Nova categoria'}
            </Text>
            <TextInput
              autoFocus
              editable={!saving}
              maxLength={180}
              onChangeText={(value) => {
                setCategoryName(value);
                setFormError('');
              }}
              onSubmitEditing={saveCategory}
              placeholder="Nome da categoria"
              placeholderTextColor={colors.muted}
              returnKeyType="done"
              style={styles.input}
              value={categoryName}
            />
            {formError ? <Text style={styles.formError}>{formError}</Text> : null}
            <View style={styles.modalActions}>
              <Pressable
                disabled={saving}
                onPress={() => {
                  setEditorVisible(false);
                  setEditingCategory(null);
                }}
                style={styles.cancelButton}
              >
                <Text style={styles.cancelText}>Cancelar</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ disabled: saving, busy: saving }}
                disabled={saving}
                onPress={saveCategory}
                style={[styles.saveButton, saving && styles.disabledButton]}
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
        visible={Boolean(pendingStatusCategory)}
        transparent
        animationType="fade"
        onRequestClose={() => setPendingStatusCategory(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              {pendingStatusCategory?.active === false ? 'Ativar categoria?' : 'Desativar categoria?'}
            </Text>
            <Text style={styles.confirmationText}>
              {pendingStatusCategory?.active === false
                ? `A categoria "${pendingStatusCategory.name}" voltará a aparecer no catálogo.`
                : `A categoria "${pendingStatusCategory?.name}" e seus produtos deixarão de aparecer no catálogo.`}
            </Text>
            <View style={styles.modalActions}>
              <Pressable
                onPress={() => setPendingStatusCategory(null)}
                style={styles.cancelButton}
              >
                <Text style={styles.cancelText}>Cancelar</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ busy: changingId === pendingStatusCategory?.id }}
                disabled={changingId === pendingStatusCategory?.id}
                onPress={() => {
                  const category = pendingStatusCategory;
                  setPendingStatusCategory(null);
                  if (category) {
                    changeCategoryStatus(category);
                  }
                }}
                style={[styles.confirmButton, changingId === pendingStatusCategory?.id && styles.disabledButton]}
              >
                {changingId === pendingStatusCategory?.id
                  ? <ActivityIndicator size="small" color={colors.white} />
                  : (
                    <Text style={styles.saveText}>
                      {pendingStatusCategory?.active === false ? 'Ativar' : 'Desativar'}
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
  content: { paddingHorizontal: 22, paddingBottom: 28 },
  intro: { alignItems: 'center', paddingTop: 25, paddingBottom: 21 },
  eyebrow: {
    color: colors.muted,
    fontFamily: typography.family.bodyMedium,
    fontSize: 12,
    letterSpacing: 1.6,
  },
  heading: {
    color: colors.ink,
    fontFamily: typography.family.body,
    fontSize: 15,
    textAlign: 'center',
    marginTop: 10,
  },
  rule: { width: 54, height: 1, backgroundColor: colors.border, marginTop: 16 },
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
  categoryCard: {
    backgroundColor: colors.white,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: '#EFEAE4',
    paddingHorizontal: 13,
    paddingVertical: 11,
    marginBottom: 10,
  },
  inactiveCard: { opacity: 0.78 },
  categoryMain: { minHeight: 54, flexDirection: 'row', alignItems: 'center' },
  pressed: { opacity: 0.82, transform: [{ scale: 0.995 }] },
  iconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.sage,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryCopy: { flex: 1, marginLeft: 13 },
  categoryName: {
    color: colors.ink,
    fontFamily: typography.family.display,
    fontSize: 20,
    fontWeight: '600',
  },
  status: { color: colors.forest, fontSize: 10, marginTop: 3 },
  inactiveStatus: { color: colors.clay },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginTop: 8,
    paddingTop: 7,
    gap: 18,
  },
  actionButton: { minHeight: 28, flexDirection: 'row', alignItems: 'center', gap: 5 },
  actionText: { color: colors.forest, fontSize: 11, fontWeight: '700' },
  deactivateText: { color: colors.clay },
  state: { alignItems: 'center', paddingVertical: 28, paddingHorizontal: 20 },
  stateText: { color: colors.muted, fontSize: 12, textAlign: 'center' },
  empty: { color: colors.muted, fontSize: 12, textAlign: 'center', paddingVertical: 24 },
  retry: { color: colors.forest, fontSize: 12, fontWeight: '700', marginTop: 10 },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'center',
    padding: 22,
    backgroundColor: 'rgba(20, 25, 18, 0.42)',
  },
  modalCard: {
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
  formError: { color: colors.clay, fontSize: 11, marginTop: 9 },
  statusError: {
    color: colors.clay,
    fontSize: 12,
    textAlign: 'center',
    paddingVertical: 12,
  },
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
  confirmationText: { color: colors.muted, fontSize: 13, lineHeight: 19 },
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
