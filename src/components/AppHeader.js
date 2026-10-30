import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';

export function AppHeader({ navigation, onMenuPress, title = null, showBack = false, tone = 'default' }) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.safeArea, tone === 'forest' && styles.forestSafeArea, { paddingTop: insets.top }]}>
      <View style={styles.content}>
        {showBack ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Voltar"
            onPress={() => navigation?.goBack()}
            hitSlop={10}
            style={styles.sideButton}
          >
            <Ionicons name="arrow-back" size={21} color={colors.forest} />
          </Pressable>
        ) : (
          <Text style={styles.logo}>oma<Text style={styles.logoDot}>.</Text></Text>
        )}

        {title ? <Text numberOfLines={1} style={[styles.title, tone === 'forest' && styles.forestText]}>{title}</Text> : null}

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={showBack ? 'Fechar menu' : 'Abrir categorias'}
          onPress={onMenuPress || (() => (showBack ? navigation?.goBack() : navigation?.navigate('Categorias')))}
          hitSlop={10}
          style={styles.sideButton}
        >
          <Ionicons name={showBack ? 'close-outline' : 'menu-outline'} size={23} color={tone === 'forest' ? colors.white : colors.ink} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: colors.canvas,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(232, 225, 213, 0.55)',
  },
  forestSafeArea: { backgroundColor: colors.forest, borderBottomColor: colors.forest },
  forestText: { color: colors.white },
  content: {
    height: 56,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  logo: {
    color: colors.forest,
    fontFamily: typography.family.display,
    fontSize: 34,
    fontWeight: '900',
    lineHeight: 38,
    letterSpacing: -2,
  },
  logoDot: { color: colors.clay },
  title: {
    flex: 1,
    textAlign: 'center',
    color: colors.forest,
    fontFamily: typography.family.display,
    fontSize: 20,
    fontWeight: '600',
  },
  sideButton: {
    width: 32,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
