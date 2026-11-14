import { StyleSheet, Text, View } from 'react-native';
import { AppButton } from './AppButton';
import { colors } from '../theme/colors';

export function ProductAdminActions({ active, error, onEdit, onToggleActive }) {
  const actionTextStyle = { fontSize: 10, fontWeight: '800', textTransform: 'none' };

  return (
    <View style={styles.container}>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <View style={styles.actions}>
        <AppButton
          title="Editar produto"
          icon="create-outline"
          onPress={onEdit}
          style={styles.action}
          textStyle={actionTextStyle}
        />
        <AppButton
          title={active ? 'Desativar produto' : 'Ativar produto'}
          icon={active ? 'ban-outline' : 'checkmark-circle-outline'}
          onPress={onToggleActive}
          variant={active ? 'danger' : 'primary'}
          style={styles.action}
          textStyle={actionTextStyle}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  actions: { flexDirection: 'row', gap: 10 },
  action: { flex: 1, minHeight: 49, borderRadius: 15, paddingHorizontal: 5 },
  error: { color: colors.danger, fontSize: 12, marginBottom: 8 },
});
