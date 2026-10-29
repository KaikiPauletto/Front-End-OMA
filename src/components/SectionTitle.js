import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';

export function SectionTitle({ title, action, onActionPress }) {
  return (
    <View style={styles.row}>
      <Text style={styles.title}>{title}</Text>
      {action ? (
        <Pressable disabled={!onActionPress} onPress={onActionPress}>
          <Text style={styles.action}>{action}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  title: { color: colors.ink, fontSize: 20, fontWeight: '800', letterSpacing: -0.3 },
  action: { color: colors.clay, fontSize: 13, fontWeight: '700' },
});
