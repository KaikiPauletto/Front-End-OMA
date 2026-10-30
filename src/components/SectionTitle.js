import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';

export function SectionTitle({ title, action, onActionPress }) {
  return (
    <View style={styles.row}>
      <Text style={styles.title}>{title}</Text>
      {action ? (
        <Pressable
          disabled={!onActionPress}
          onPress={onActionPress}
          style={styles.actionButton}
        >
          <Text style={styles.action}>{action}</Text>
          <Ionicons name="chevron-forward" size={11} color={colors.forest} />
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
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  title: {
    color: colors.ink,
    fontFamily: typography.family.display,
    fontSize: 18,
    fontWeight: '400',
  },
  actionButton: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  action: {
    color: colors.forest,
    fontFamily: typography.family.body,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
});
