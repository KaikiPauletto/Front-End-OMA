import { useEffect, useState } from 'react';
import { Modal, StyleSheet, Text, View } from 'react-native';
import { AppButton } from './AppButton';
import { colors } from '../theme/colors';

export function ProductDeactivationModal({ visible, onCancel, onConfirm }) {
  const [error, setError] = useState('');

  useEffect(() => {
    if (visible) {
      setError('');
    }
  }, [visible]);

  function handleConfirm() {
    if (!onConfirm()) {
      setError('Não foi possível desativar o produto. Tente novamente.');
    }
  }

  return (
    <Modal
      animationType="fade"
      onRequestClose={onCancel}
      transparent
      visible={visible}
    >
      <View style={styles.backdrop}>
        <View style={styles.dialog}>
          <Text style={styles.title}>Desativar produto?</Text>
          <Text style={styles.message}>
            O produto ficará indisponível para os clientes. Deseja realmente desativá-lo?
          </Text>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <View style={styles.actions}>
            <AppButton
              title="Cancelar"
              variant="outline"
              onPress={onCancel}
              style={styles.action}
              textStyle={styles.buttonText}
            />
            <AppButton
              title="Sim, desativar"
              variant="danger"
              onPress={handleConfirm}
              style={styles.action}
              textStyle={styles.buttonText}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  dialog: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 18,
    padding: 22,
    backgroundColor: colors.canvas,
  },
  title: { color: colors.ink, fontSize: 18, fontWeight: '800' },
  message: { color: colors.muted, fontSize: 13, lineHeight: 20, marginTop: 10 },
  error: { color: colors.danger, fontSize: 12, marginTop: 10 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 22 },
  action: { flex: 1, minHeight: 46, paddingHorizontal: 6 },
  buttonText: { fontSize: 10, fontWeight: '800', textTransform: 'none' },
});
