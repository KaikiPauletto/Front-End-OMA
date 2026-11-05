import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppHeader } from '../components/AppHeader';
import { colors } from '../theme/colors';

export function AnalyticsScreen({ navigation }) {
  return (
    <View style={styles.screen}>
      <AppHeader navigation={navigation} showMenu={false} title="Analytics" />
      <View style={styles.content}>
        <View style={styles.icon}>
          <Ionicons name="bar-chart-outline" size={30} color={colors.forest} />
        </View>
        <Text style={styles.title}>Em manutenção</Text>
        <Text style={styles.description}>
          Os gráficos de análise das vendas serão exibidos aqui em breve.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingBottom: 48,
  },
  icon: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: colors.sage,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  title: { color: colors.ink, fontSize: 20, fontWeight: '800', textAlign: 'center' },
  description: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
    marginTop: 8,
  },
});
