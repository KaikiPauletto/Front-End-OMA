import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { AppHeader } from '../components/AppHeader';
import { useAuth } from '../contexts/AuthContext';
import { ApiError } from '../services/apiClient';
import {
  getAdminAnalytics,
  InvalidAnalyticsResponseError,
} from '../services/analyticsService';
import { colors } from '../theme/colors';

function formatCurrency(value) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

function formatDate(value, options) {
  const date = new Date(`${value}T12:00:00`);
  return Number.isNaN(date.getTime())
    ? ''
    : date.toLocaleDateString('pt-BR', options);
}

function getLoadError(error) {
  if (error instanceof ApiError && error.status === 401) {
    return 'Sua sessão de administrador expirou. Entre novamente.';
  }
  if (error instanceof ApiError && error.status === 403) {
    return 'Sua conta não tem autorização para consultar o analytics.';
  }
  if (error instanceof ApiError) {
    return `Não foi possível carregar o analytics (HTTP ${error.status}).`;
  }
  if (error instanceof InvalidAnalyticsResponseError) {
    return 'A API retornou dados de analytics em um formato inválido.';
  }
  return 'Falha de comunicação. Verifique a conexão e tente novamente.';
}

function MetricCard({ label, value, icon }) {
  return (
    <View style={styles.metricCard}>
      <View style={styles.metricIcon}>
        <Ionicons name={icon} size={17} color={colors.forest} />
      </View>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text numberOfLines={1} adjustsFontSizeToFit style={styles.metricValue}>{value}</Text>
    </View>
  );
}

function SalesTrendChart({ points }) {
  const maxRevenue = Math.max(0, ...points.map((point) => point.revenue));
  const chartMax = maxRevenue || 1;

  return (
    <View style={styles.card}>
      <Text style={styles.sectionTitle}>Evolução das vendas</Text>
      <Text style={styles.sectionDescription}>Faturamento mensal · últimos cinco anos</Text>
      {points.length === 0 ? (
        <Text style={styles.emptyChart}>Sem dados de vendas no período.</Text>
      ) : (
        <>
          <Text style={styles.chartScale}>{formatCurrency(maxRevenue)}</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.trendChart}
          >
            {points.map((point, index) => {
              const label = index % 6 === 0 || index === points.length - 1
                ? formatDate(point.periodStart, { month: '2-digit', year: '2-digit' })
                : '';
              const height = point.revenue > 0
                ? Math.max(4, (point.revenue / chartMax) * 104)
                : 2;
              return (
                <View key={point.periodStart} style={styles.trendColumn}>
                  <View style={styles.trendBarArea}>
                    <View style={[styles.trendBar, { height }]} />
                  </View>
                  <Text style={styles.trendLabel}>{label}</Text>
                </View>
              );
            })}
          </ScrollView>
        </>
      )}
    </View>
  );
}

function RankingChart({ title, items, type }) {
  const maxValue = Math.max(0, ...items.map((item) => (
    type === 'categories' ? item.revenue : item.units
  )));
  const chartMax = maxValue || 1;

  return (
    <View style={styles.card}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {items.length === 0 ? (
        <Text style={styles.emptyChart}>Sem dados de vendas no período.</Text>
      ) : items.map((item, index) => {
        const value = type === 'categories' ? item.revenue : item.units;
        const label = type === 'categories' ? item.categoryName : item.productName;
        const detail = type === 'categories'
          ? formatCurrency(item.revenue)
          : `${item.units} ${item.units === 1 ? 'unidade' : 'unidades'} · ${formatCurrency(item.revenue)}`;
        return (
          <View key={`${label}-${index}`} style={styles.rankingItem}>
            <View style={styles.rankingLabels}>
              <Text numberOfLines={1} style={styles.rankingName}>{label}</Text>
              <Text style={styles.rankingValue}>{detail}</Text>
            </View>
            <View style={styles.rankingTrack}>
              <View
                style={[
                  styles.rankingBar,
                  { width: `${Math.max(2, (value / chartMax) * 100)}%` },
                ]}
              />
            </View>
          </View>
        );
      })}
    </View>
  );
}

export function AnalyticsScreen({ navigation }) {
  const { token } = useAuth();
  const [analytics, setAnalytics] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  const loadAnalytics = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage('');
    try {
      setAnalytics(await getAdminAnalytics(token));
    } catch (error) {
      setErrorMessage(getLoadError(error));
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useFocusEffect(useCallback(() => {
    loadAnalytics();
  }, [loadAnalytics]));

  return (
    <View style={styles.screen}>
      <AppHeader
        navigation={navigation}
        onBackPress={() => navigation.navigate('Home')}
        showBack
        showMenu={false}
        title="Analytics"
      />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={(
          <RefreshControl
            refreshing={isLoading && Boolean(analytics)}
            onRefresh={loadAnalytics}
            tintColor={colors.forest}
          />
        )}
      >
        {isLoading && !analytics ? (
          <View style={styles.loading}>
            <ActivityIndicator size="large" color={colors.forest} />
            <Text style={styles.loadingText}>Carregando dados de vendas...</Text>
          </View>
        ) : null}
        {errorMessage ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>{errorMessage}</Text>
            <Pressable
              accessibilityRole="button"
              onPress={loadAnalytics}
              style={styles.retryButton}
            >
              <Text style={styles.retryText}>Tentar novamente</Text>
            </Pressable>
          </View>
        ) : null}
        {analytics ? (
          <>
            <Text style={styles.pageDescription}>
              Vendas de {formatDate(analytics.period.from, { day: '2-digit', month: '2-digit', year: 'numeric' })}
              {' a '}
              {formatDate(analytics.period.to, { day: '2-digit', month: '2-digit', year: 'numeric' })}
            </Text>
            <View style={styles.metricsGrid}>
              <MetricCard
                label="Faturamento"
                value={formatCurrency(analytics.overview.totalRevenue)}
                icon="cash-outline"
              />
              <MetricCard
                label="Pedidos confirmados"
                value={String(analytics.overview.confirmedOrders)}
                icon="receipt-outline"
              />
              <MetricCard
                label="Ticket médio"
                value={formatCurrency(analytics.overview.averageTicket)}
                icon="trending-up-outline"
              />
              <MetricCard
                label="Unidades vendidas"
                value={String(analytics.overview.unitsSold)}
                icon="cube-outline"
              />
            </View>
            <SalesTrendChart points={analytics.sales} />
            <RankingChart
              title="Categorias com maior faturamento"
              items={analytics.overview.topCategories}
              type="categories"
            />
            <RankingChart
              title="Produtos mais vendidos"
              items={analytics.overview.topProducts}
              type="products"
            />
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas },
  content: {
    padding: 18,
    paddingBottom: 32,
  },
  pageDescription: { color: colors.muted, fontSize: 12, marginBottom: 12 },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 12,
  },
  metricCard: {
    width: '48%',
    minHeight: 112,
    padding: 12,
    borderRadius: 14,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  metricIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.sage,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  metricLabel: { color: colors.muted, fontSize: 10, fontWeight: '600' },
  metricValue: { color: colors.ink, fontSize: 15, fontWeight: '800', marginTop: 5 },
  card: {
    padding: 15,
    marginBottom: 12,
    borderRadius: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionTitle: { color: colors.ink, fontSize: 14, fontWeight: '800' },
  sectionDescription: { color: colors.muted, fontSize: 10, marginTop: 4 },
  chartScale: { color: colors.muted, fontSize: 10, marginTop: 14 },
  trendChart: { height: 142, alignItems: 'flex-end', paddingTop: 8 },
  trendColumn: { width: 38, height: 132, alignItems: 'center', justifyContent: 'flex-end' },
  trendBarArea: {
    height: 108,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'flex-end',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  trendBar: { width: 15, borderTopLeftRadius: 4, borderTopRightRadius: 4, backgroundColor: colors.forest },
  trendLabel: { height: 16, color: colors.muted, fontSize: 8, marginTop: 5 },
  emptyChart: { color: colors.muted, fontSize: 12, marginTop: 14 },
  rankingItem: { marginTop: 15 },
  rankingLabels: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  rankingName: { flex: 1, color: colors.ink, fontSize: 11, fontWeight: '600' },
  rankingValue: { color: colors.muted, fontSize: 10, textAlign: 'right' },
  rankingTrack: {
    height: 8,
    overflow: 'hidden',
    marginTop: 7,
    borderRadius: 4,
    backgroundColor: colors.surfaceMuted,
  },
  rankingBar: { height: '100%', borderRadius: 4, backgroundColor: colors.forest },
  loading: { minHeight: 280, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { color: colors.muted, fontSize: 12 },
  errorCard: {
    padding: 16,
    marginBottom: 14,
    borderRadius: 14,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  errorText: { color: colors.danger, fontSize: 12, lineHeight: 18 },
  retryButton: { alignSelf: 'flex-start', marginTop: 10, paddingVertical: 6 },
  retryText: { color: colors.forest, fontSize: 12, fontWeight: '800' },
});
