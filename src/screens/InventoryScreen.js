import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { AppButton } from '../components/AppButton';
import { AppHeader } from '../components/AppHeader';
import { EmptyState } from '../components/EmptyState';
import { useAuth } from '../contexts/AuthContext';
import { ApiError } from '../services/apiClient';
import {
  listInventory,
  listInventoryMovements,
} from '../services/inventoryService';
import { getAdminProductById } from '../services/productService';
import {
  normalizeNonNegativeInt64,
  normalizePositiveInt64,
  normalizeSignedInt64,
} from '../services/int64';
import { colors } from '../theme/colors';

const PAGE_SIZE = 20;
const productTypeOptions = [
  { value: 'all', label: 'Todos' },
  { value: 'SINGLE_UNIT', label: 'Unitários' },
  { value: 'MULTI_UNIT', label: 'Por quantidade' },
];
const lowStockOptions = [
  { value: 'all', label: 'Todos' },
  { value: 'true', label: 'Estoque baixo' },
  { value: 'false', label: 'Sem alerta' },
];
const movementTypeOptions = [
  { value: 'all', label: 'Todos os movimentos' },
  { value: 'ENTRY', label: 'Entrada' },
  { value: 'MANUAL_EXIT', label: 'Saída manual' },
  { value: 'ADJUSTMENT', label: 'Ajuste' },
  { value: 'RESERVATION_CONFIRMATION', label: 'Confirmação de reserva' },
];
const movementTypeLabels = Object.fromEntries(
  movementTypeOptions
    .filter((option) => option.value !== 'all')
    .map((option) => [option.value, option.label]),
);

function formatQuantity(value) {
  const normalized = normalizeNonNegativeInt64(value);
  return normalized?.replace(/\B(?=(\d{3})+(?!\d))/g, '.') ?? '—';
}

function formatDelta(value) {
  const normalized = normalizeSignedInt64(value);
  if (normalized === null) {
    return '—';
  }
  const negative = normalized.startsWith('-');
  const digits = negative ? normalized.slice(1) : normalized;
  return `${negative ? '−' : '+'}${digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;
}

function formatTimestamp(value) {
  const timestamp = new Date(value);
  return Number.isNaN(timestamp.getTime())
    ? 'Data indisponível'
    : timestamp.toLocaleString('pt-BR');
}

function getLoadError(error, label) {
  if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
    return error.status === 401
      ? 'Sua sessão de administrador expirou. Entre novamente.'
      : 'Sua conta não tem autorização para consultar o inventário.';
  }
  if (error instanceof ApiError) {
    return `Não foi possível carregar ${label} (HTTP ${error.status}).`;
  }
  return 'Falha de comunicação. Verifique a conexão e tente novamente.';
}

function FilterChip({ label, selected, onPress }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.filterChip, selected && styles.selectedFilterChip]}
    >
      <Text style={[styles.filterChipText, selected && styles.selectedFilterChipText]}>
        {label}
      </Text>
    </Pressable>
  );
}

function InventoryCard({ item, productName, onPress }) {
  const productId = normalizePositiveInt64(item.productId);
  const name = productName?.trim() || `Produto ${productId}`;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Estoque de ${name}, ID ${productId}`}
      onPress={onPress}
      style={styles.card}
    >
      <View style={styles.cardHeader}>
        <View style={styles.productIdentifier}>
          <Text numberOfLines={2} style={styles.productName}>{name}</Text>
          <Text style={styles.productId}>ID {productId}</Text>
          <Text style={styles.productType}>
            {item.productType === 'SINGLE_UNIT' ? 'Unitário' : 'Por quantidade'}
          </Text>
        </View>
        <View style={[
          styles.stockBadge,
          item.lowStock ? styles.lowStockBadge : styles.normalStockBadge,
        ]}
        >
          <Text style={[
            styles.stockBadgeText,
            item.lowStock ? styles.lowStockText : styles.normalStockText,
          ]}
          >
            {item.lowStock ? 'Estoque baixo' : 'Normal'}
          </Text>
        </View>
      </View>
      <View style={styles.quantityGrid}>
        {[
          ['Físico', item.quantityOnHand],
          ['Reservado', item.quantityReserved],
          ['Disponível', item.availableQuantity],
          ['Limite baixo', item.lowStockThreshold],
        ].map(([label, quantity]) => (
          <View key={label} style={styles.quantityItem}>
            <Text style={styles.quantityLabel}>{label}</Text>
            <Text style={styles.quantityValue}>{formatQuantity(quantity)}</Text>
          </View>
        ))}
      </View>
      <View style={styles.cardFooter}>
        <Text style={styles.updatedAt}>Atualizado {formatTimestamp(item.updatedAt)}</Text>
        <Ionicons name="chevron-forward" size={18} color={colors.muted} />
      </View>
    </Pressable>
  );
}

function MovementCard({ item, productName, onPress }) {
  const productId = normalizePositiveInt64(item.productId);
  const name = productName?.trim() || `Produto ${productId}`;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${movementTypeLabels[item.movementType]} de ${name}, ID ${productId}`}
      onPress={onPress}
      style={styles.card}
    >
      <View style={styles.cardHeader}>
        <View style={styles.productIdentifier}>
          <Text style={styles.productType}>{movementTypeLabels[item.movementType]}</Text>
          <Text numberOfLines={2} style={styles.productName}>{name}</Text>
          <Text style={styles.productId}>ID {productId}</Text>
        </View>
        <Text style={[
          styles.movementDelta,
          normalizeSignedInt64(item.quantityDelta)?.startsWith('-')
            ? styles.negativeDelta
            : styles.positiveDelta,
        ]}
        >
          {formatDelta(item.quantityDelta)}
        </Text>
      </View>
      <Text style={styles.movementReason}>{item.reason?.trim() || 'Sem motivo informado'}</Text>
      <View style={styles.cardFooter}>
        <Text style={styles.updatedAt}>{formatTimestamp(item.createdAt)}</Text>
        {item.orderId || item.reservationId ? (
          <Text style={styles.relatedId}>
            {item.orderId ? `Pedido ${formatQuantity(item.orderId)}` : ''}
            {item.orderId && item.reservationId ? ' · ' : ''}
            {item.reservationId ? `Reserva ${formatQuantity(item.reservationId)}` : ''}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

export function InventoryScreen({ navigation }) {
  const { user, token } = useAuth();
  const isAdministrator = user?.role === 'ADMINISTRADOR';
  const [view, setView] = useState('inventory');
  const [productType, setProductType] = useState('all');
  const [lowStock, setLowStock] = useState('all');
  const [movementType, setMovementType] = useState('all');
  const [productIdInput, setProductIdInput] = useState('');
  const [fromInput, setFromInput] = useState('');
  const [toInput, setToInput] = useState('');
  const [appliedMovementFilters, setAppliedMovementFilters] = useState({});
  const [items, setItems] = useState([]);
  const [productNames, setProductNames] = useState({});
  const [loadingProductNames, setLoadingProductNames] = useState(false);
  const [productNameError, setProductNameError] = useState(false);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterError, setFilterError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const productNamesCache = useRef(new Map());
  const requestVersion = useRef(0);
  const hasBeenFocused = useRef(false);

  useFocusEffect(useCallback(() => {
    if (hasBeenFocused.current) {
      requestVersion.current += 1;
      productNamesCache.current.clear();
      setProductNames({});
      setProductNameError(false);
      setReloadKey((key) => key + 1);
    } else {
      hasBeenFocused.current = true;
    }

    return () => {
      requestVersion.current += 1;
    };
  }, []));

  useEffect(() => {
    let active = true;
    const version = requestVersion.current + 1;
    requestVersion.current = version;
    setItems([]);
    setPage(0);
    setTotalPages(0);
    setTotalElements(0);
    setError('');

    if (!isAdministrator || typeof token !== 'string' || !token.trim()) {
      setError('Entre com uma conta de administrador para consultar o inventário.');
      setLoading(false);
      return () => {
        active = false;
      };
    }

    setLoading(true);
    const request = view === 'inventory'
      ? listInventory({
        productType: productType === 'all' ? undefined : productType,
        lowStock: lowStock === 'all' ? undefined : lowStock === 'true',
        page,
        size: PAGE_SIZE,
        token,
      })
      : listInventoryMovements(token, {
        ...appliedMovementFilters,
        page,
        size: PAGE_SIZE,
      });

    request
      .then((result) => {
        if (active && requestVersion.current === version) {
          setItems(result.items);
          setPage(result.page);
          setTotalPages(result.totalPages);
          setTotalElements(result.totalElements);
        }
      })
      .catch((loadError) => {
        if (active && requestVersion.current === version) {
          setError(getLoadError(
            loadError,
            view === 'inventory' ? 'os estoques' : 'as movimentações',
          ));
        }
      })
      .finally(() => {
        if (active && requestVersion.current === version) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [
    isAdministrator,
    token,
    view,
    productType,
    lowStock,
    appliedMovementFilters,
    page,
    reloadKey,
  ]);

  useEffect(() => {
    let active = true;
    const productIds = [...new Set(items.map((item) => String(item.productId)))];
    const missingProductIds = productIds.filter((productId) => (
      !productNamesCache.current.has(productId)
    ));

    if (!token || missingProductIds.length === 0) {
      setLoadingProductNames(false);
      setProductNameError(false);
      return () => {
        active = false;
      };
    }

    setLoadingProductNames(true);
    setProductNameError(false);

    Promise.allSettled(missingProductIds.map((productId) => (
      getAdminProductById(productId, token)
    )))
      .then((results) => {
        if (!active) {
          return;
        }

        const resolvedNames = {};
        let failedLookup = false;
        results.forEach((result, index) => {
          const productId = missingProductIds[index];
          if (result.status === 'fulfilled') {
            productNamesCache.current.set(productId, result.value.name);
            resolvedNames[productId] = result.value.name;
          } else {
            failedLookup = true;
          }
        });

        if (Object.keys(resolvedNames).length > 0) {
          setProductNames((current) => ({ ...current, ...resolvedNames }));
        }
        setProductNameError(failedLookup);
      })
      .finally(() => {
        if (active) {
          setLoadingProductNames(false);
        }
      });

    return () => {
      active = false;
    };
  }, [items, token]);

  function chooseView(nextView) {
    if (nextView === view) {
      return;
    }
    requestVersion.current += 1;
    setPage(0);
    setView(nextView);
  }

  function applyMovementFilters() {
    const productId = productIdInput.trim();
    if (productId && !normalizePositiveInt64(productId)) {
      setFilterError('O ID do produto deve ser um inteiro positivo válido.');
      return;
    }
    if (fromInput && (Number.isNaN(Date.parse(fromInput)) || !fromInput.includes('T'))) {
      setFilterError('A data inicial deve usar o formato ISO-8601, por exemplo 2026-11-20T00:00:00Z.');
      return;
    }
    if (toInput && (Number.isNaN(Date.parse(toInput)) || !toInput.includes('T'))) {
      setFilterError('A data final deve usar o formato ISO-8601, por exemplo 2026-11-20T23:59:59Z.');
      return;
    }

    requestVersion.current += 1;
    setFilterError('');
    setPage(0);
    setAppliedMovementFilters({
      productId: productId || undefined,
      movementType: movementType === 'all' ? undefined : movementType,
      from: fromInput.trim() || undefined,
      to: toInput.trim() || undefined,
    });
  }

  function retry() {
    requestVersion.current += 1;
    productNamesCache.current.clear();
    setProductNames({});
    setProductNameError(false);
    setReloadKey((key) => key + 1);
  }

  function openProduct(productId) {
    navigation.navigate('ProductDetails', {
      productId: normalizePositiveInt64(productId),
      source: 'admin',
    });
  }

  const canGoBack = page > 0;
  const canGoForward = page + 1 < totalPages;
  const title = view === 'inventory' ? 'Estoque' : 'Movimentações';

  return (
    <View style={styles.screen}>
      <AppHeader navigation={navigation} showBack showMenu={false} title={title} />
      <View style={styles.viewToggle}>
        <FilterChip
          label="Estoques"
          selected={view === 'inventory'}
          onPress={() => chooseView('inventory')}
        />
        <FilterChip
          label="Movimentações"
          selected={view === 'movements'}
          onPress={() => chooseView('movements')}
        />
      </View>

      {view === 'inventory' ? (
        <View style={styles.filters}>
          <Text style={styles.filterLabel}>Tipo de produto</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
            {productTypeOptions.map((option) => (
              <FilterChip
                key={option.value}
                label={option.label}
                selected={productType === option.value}
                onPress={() => {
                  requestVersion.current += 1;
                  setPage(0);
                  setProductType(option.value);
                }}
              />
            ))}
          </ScrollView>
          <Text style={[styles.filterLabel, styles.secondFilterLabel]}>Indicador de estoque</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
            {lowStockOptions.map((option) => (
              <FilterChip
                key={option.value}
                label={option.label}
                selected={lowStock === option.value}
                onPress={() => {
                  requestVersion.current += 1;
                  setPage(0);
                  setLowStock(option.value);
                }}
              />
            ))}
          </ScrollView>
        </View>
      ) : (
        <View style={styles.filters}>
          <Text style={styles.filterLabel}>Filtros de movimentação</Text>
          <TextInput
            accessibilityLabel="Filtrar por ID do produto"
            keyboardType="number-pad"
            onChangeText={setProductIdInput}
            placeholder="ID do produto (opcional)"
            style={styles.input}
            value={productIdInput}
          />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
            {movementTypeOptions.map((option) => (
              <FilterChip
                key={option.value}
                label={option.label}
                selected={movementType === option.value}
                onPress={() => setMovementType(option.value)}
              />
            ))}
          </ScrollView>
          <View style={styles.dateFields}>
            <TextInput
              accessibilityLabel="Data inicial ISO-8601"
              onChangeText={setFromInput}
              placeholder="De: 2026-11-20T00:00:00Z"
              style={[styles.input, styles.dateInput]}
              value={fromInput}
            />
            <TextInput
              accessibilityLabel="Data final ISO-8601"
              onChangeText={setToInput}
              placeholder="Até: 2026-11-20T23:59:59Z"
              style={[styles.input, styles.dateInput]}
              value={toInput}
            />
          </View>
          {filterError ? <Text style={styles.filterError}>{filterError}</Text> : null}
          <AppButton
            title="Aplicar filtros"
            onPress={applyMovementFilters}
            size="small"
            style={styles.applyFilters}
          />
        </View>
      )}

      <View style={styles.resultsHeader}>
        <Text style={styles.resultCount}>
          {loading
            ? 'Carregando...'
            : `${formatQuantity(totalElements)} ${view === 'inventory' ? 'estoques' : 'movimentações'}`}
        </Text>
        <Pressable accessibilityRole="button" onPress={retry} style={styles.refreshButton}>
          <Ionicons name="refresh-outline" size={17} color={colors.forest} />
          <Text style={styles.refreshText}>Atualizar</Text>
        </Pressable>
      </View>
      {loadingProductNames ? (
        <Text style={styles.productNameStatus}>Carregando nomes dos produtos...</Text>
      ) : null}
      {productNameError ? (
        <Text style={styles.productNameWarning}>
          Alguns nomes não puderam ser carregados; exibindo os IDs correspondentes.
        </Text>
      ) : null}

      {error ? (
        <View style={styles.stateWrap}>
          <EmptyState
            icon="cloud-offline-outline"
            title="Não foi possível carregar"
            description={error}
          />
          <AppButton title="Tentar novamente" onPress={retry} style={styles.retryButton} />
        </View>
      ) : loading ? (
        <View style={styles.loadingState}>
          <ActivityIndicator color={colors.forest} />
          <Text style={styles.stateText}>Carregando {view === 'inventory' ? 'estoques' : 'movimentações'}...</Text>
        </View>
      ) : items.length === 0 ? (
        <View style={styles.stateWrap}>
          <EmptyState
            icon={view === 'inventory' ? 'file-tray-outline' : 'swap-vertical-outline'}
            title={view === 'inventory' ? 'Nenhum estoque registrado' : 'Nenhuma movimentação encontrada'}
            description={view === 'inventory'
              ? 'O inventário lista somente produtos já registrados. Acesse Vendas para escolher um produto e registrar seu estoque.'
              : 'Não há movimentações para os filtros selecionados.'}
          />
          {view === 'inventory' ? (
            <AppButton
              title="Ir para Vendas"
              onPress={() => navigation.navigate('Vendas')}
              style={styles.retryButton}
            />
          ) : null}
        </View>
      ) : (
        <FlatList
          data={items}
          extraData={productNames}
          keyExtractor={(item) => (
            view === 'inventory'
              ? `inventory-${normalizePositiveInt64(item.productId)}`
              : `movement-${normalizePositiveInt64(item.id)}`
          )}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => view === 'inventory'
            ? (
              <InventoryCard
                item={item}
                productName={productNames[String(item.productId)]}
                onPress={() => openProduct(item.productId)}
              />
            )
            : (
              <MovementCard
                item={item}
                productName={productNames[String(item.productId)]}
                onPress={() => openProduct(item.productId)}
              />
            )}
        />
      )}

      {!loading && !error && totalPages > 1 ? (
        <View style={styles.pagination}>
          <Pressable
            accessibilityRole="button"
            disabled={!canGoBack}
            onPress={() => setPage((current) => Math.max(0, current - 1))}
            style={[styles.pageButton, !canGoBack && styles.disabledPageButton]}
          >
            <Text style={styles.pageButtonText}>Anterior</Text>
          </Pressable>
          <Text style={styles.pageLabel}>{page + 1} / {totalPages}</Text>
          <Pressable
            accessibilityRole="button"
            disabled={!canGoForward}
            onPress={() => setPage((current) => current + 1)}
            style={[styles.pageButton, !canGoForward && styles.disabledPageButton]}
          >
            <Text style={styles.pageButtonText}>Próxima</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas },
  viewToggle: { flexDirection: 'row', gap: 8, paddingHorizontal: 18, paddingTop: 14 },
  filterChip: {
    minHeight: 34,
    justifyContent: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
  },
  selectedFilterChip: { borderColor: colors.forest, backgroundColor: colors.sage },
  filterChipText: { color: colors.mutedStrong, fontSize: 10, fontWeight: '700' },
  selectedFilterChipText: { color: colors.forest },
  filters: { paddingHorizontal: 18, paddingTop: 12, gap: 8 },
  filterLabel: { color: colors.mutedStrong, fontSize: 10, fontWeight: '800' },
  secondFilterLabel: { marginTop: 2 },
  chipRow: { flexDirection: 'row', gap: 7, paddingRight: 18 },
  input: {
    minHeight: 42,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 11,
    color: colors.ink,
    backgroundColor: colors.surface,
    fontSize: 11,
  },
  dateFields: { flexDirection: 'row', gap: 8 },
  dateInput: { flex: 1, minWidth: 0 },
  filterError: { color: colors.danger, fontSize: 11, lineHeight: 16 },
  applyFilters: { alignSelf: 'flex-start', minHeight: 38 },
  resultsHeader: {
    minHeight: 43,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 6,
  },
  resultCount: { color: colors.muted, fontSize: 11 },
  refreshButton: { flexDirection: 'row', alignItems: 'center', gap: 4, padding: 8 },
  refreshText: { color: colors.forest, fontSize: 10, fontWeight: '700' },
  list: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 18, gap: 10 },
  card: {
    borderRadius: 15,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    backgroundColor: colors.surface,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  productIdentifier: { flex: 1 },
  productName: { color: colors.ink, fontSize: 12, fontWeight: '800' },
  productId: { color: colors.muted, fontSize: 10, fontWeight: '700', marginTop: 3 },
  productType: { color: colors.muted, fontSize: 10, marginTop: 3 },
  productNameStatus: { color: colors.muted, fontSize: 10, paddingHorizontal: 20, paddingBottom: 6 },
  productNameWarning: { color: colors.danger, fontSize: 10, paddingHorizontal: 20, paddingBottom: 6 },
  stockBadge: { borderRadius: 10, paddingHorizontal: 9, paddingVertical: 6 },
  lowStockBadge: { backgroundColor: colors.clayLight },
  normalStockBadge: { backgroundColor: colors.sage },
  stockBadgeText: { fontSize: 9, fontWeight: '800' },
  lowStockText: { color: colors.danger },
  normalStockText: { color: colors.forest },
  quantityGrid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 12 },
  quantityItem: { width: '50%', paddingVertical: 6 },
  quantityLabel: { color: colors.muted, fontSize: 9 },
  quantityValue: { color: colors.ink, fontSize: 13, fontWeight: '800', marginTop: 2 },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 10,
    marginTop: 7,
  },
  updatedAt: { color: colors.muted, fontSize: 9, flex: 1 },
  relatedId: { color: colors.mutedStrong, fontSize: 9, textAlign: 'right' },
  movementDelta: { fontSize: 16, fontWeight: '800' },
  positiveDelta: { color: colors.forest },
  negativeDelta: { color: colors.danger },
  movementReason: { color: colors.mutedStrong, fontSize: 11, lineHeight: 17, marginTop: 9 },
  stateWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18 },
  loadingState: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  stateText: { color: colors.muted, fontSize: 12, marginTop: 9 },
  retryButton: { minWidth: 180, marginBottom: 25 },
  pagination: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  pageButton: { minWidth: 82, minHeight: 36, alignItems: 'center', justifyContent: 'center' },
  disabledPageButton: { opacity: 0.4 },
  pageButtonText: { color: colors.forest, fontSize: 11, fontWeight: '800' },
  pageLabel: { color: colors.muted, fontSize: 11, fontWeight: '700' },
});
