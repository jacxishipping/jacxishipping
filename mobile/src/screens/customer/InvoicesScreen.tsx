import React, { useMemo, useState } from 'react';
import {
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { invoicesApi } from '../../api/invoices';
import { AppTopBar } from '../../components/shared/AppTopBar';
import { AppIcon } from '../../components/shared/AppIcon';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { ListPaginationFooter } from '../../components/shared/ListPaginationFooter';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { ErrorState } from '../../components/shared/ErrorState';
import { EmptyState } from '../../components/shared/EmptyState';
import { InvoiceCard } from '../../components/customer/InvoiceCard';
import { useAppTheme } from '../../hooks/useAppTheme';
import { BorderRadius, Spacing } from '../../constants/spacing';
import { Typography } from '../../constants/typography';
import { MOBILE_LIST_PAGE_SIZE } from '../../constants/pagination';
import { CustomerStackParamList } from '../../navigation/CustomerNavigator';
import { Invoice, InvoiceStatus } from '../../types/invoice';

type NavigationProp = NativeStackNavigationProp<CustomerStackParamList>;

type FilterOption = {
  label: string;
  value: 'all' | 'due' | 'OVERDUE' | 'PAID' | 'DRAFT';
  statusQuery?: InvoiceStatus;
};

const filterOptions: FilterOption[] = [
  { label: 'All', value: 'all' },
  { label: 'Due Now', value: 'due' },
  { label: 'Overdue', value: 'OVERDUE', statusQuery: 'OVERDUE' },
  { label: 'Paid', value: 'PAID', statusQuery: 'PAID' },
  { label: 'Draft', value: 'DRAFT', statusQuery: 'DRAFT' },
];

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount || 0);

const InvoicesScreen: React.FC = () => {
  const { colors } = useAppTheme();
  const navigation = useNavigation<NavigationProp>();
  const [search, setSearch] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<FilterOption['value']>('all');

  const activeStatusQuery = useMemo(() => {
    const matched = filterOptions.find((f) => f.value === selectedFilter);
    return matched?.statusQuery;
  }, [selectedFilter]);

  const query = useInfiniteQuery({
    queryKey: ['customer-invoices', search, activeStatusQuery],
    initialPageParam: 1,
    queryFn: ({ pageParam }) =>
      invoicesApi.getInvoices(
        {
          search: search.trim() || undefined,
          status: activeStatusQuery,
        },
        { page: pageParam, pageSize: MOBILE_LIST_PAGE_SIZE },
      ),
    getNextPageParam: (lastPage, _pages, lastPageParam) =>
      lastPage.pagination.hasMore ? Number(lastPageParam) + 1 : undefined,
  });

  const rawInvoices = useMemo(
    () => query.data?.pages.flatMap((page) => page.invoices) || [],
    [query.data],
  );

  // Client-side filtering for 'due' (unpaid or overdue)
  const invoices = useMemo(() => {
    if (selectedFilter === 'due') {
      return rawInvoices.filter((inv) => inv.status !== 'PAID' && inv.status !== 'CANCELLED');
    }
    return rawInvoices;
  }, [rawInvoices, selectedFilter]);

  const totalInvoices = query.data?.pages[0]?.pagination.total || invoices.length;

  // Overview metrics computed from visible data
  const summaryMetrics = useMemo(() => {
    let totalInvoiced = 0;
    let totalDue = 0;
    let overdueCount = 0;
    let paidCount = 0;

    rawInvoices.forEach((inv) => {
      const invTotal = Number(inv.total || 0);
      const invDue = Number(inv.amountDue ?? (invTotal - Number(inv.amountPaid || 0)));
      totalInvoiced += invTotal;
      totalDue += invDue;
      if (inv.status === 'OVERDUE') overdueCount += 1;
      if (inv.status === 'PAID') paidCount += 1;
    });

    return {
      totalInvoiced,
      totalDue,
      overdueCount,
      paidCount,
      count: rawInvoices.length,
    };
  }, [rawInvoices]);

  const loadMore = () => {
    if (query.hasNextPage && !query.isFetchingNextPage) {
      void query.fetchNextPage();
    }
  };

  const handleOpenInvoice = (invoice: Invoice) => {
    navigation.navigate('InvoiceDetail', { id: invoice.id });
  };

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      <AppTopBar
        section="Invoices & Billing"
        detail="Track balances, line items, and payment history"
      />

      {/* Summary Financial Metric Cards */}
      <View style={styles.metricGrid}>
        <Card style={[styles.metricCard, { borderColor: summaryMetrics.totalDue > 0 ? `${colors.accent}40` : colors.border }]}>
          <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Outstanding Due</Text>
          <Text
            style={[
              styles.metricValuePrimary,
              { color: summaryMetrics.totalDue > 0 ? colors.accent : colors.success },
            ]}
          >
            {formatCurrency(summaryMetrics.totalDue)}
          </Text>
          <Text style={[styles.metricSubtext, { color: colors.textTertiary }]}>
            {summaryMetrics.overdueCount > 0 ? `${summaryMetrics.overdueCount} overdue` : 'Current balance'}
          </Text>
        </Card>

        <Card style={styles.metricCard}>
          <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Total Invoiced</Text>
          <Text style={[styles.metricValuePrimary, { color: colors.textPrimary }]}>
            {formatCurrency(summaryMetrics.totalInvoiced)}
          </Text>
          <Text style={[styles.metricSubtext, { color: colors.textTertiary }]}>
            {summaryMetrics.paidCount} settled
          </Text>
        </Card>
      </View>

      {/* Instant Search Bar */}
      <View style={styles.searchWrapper}>
        <Input
          value={search}
          onChangeText={setSearch}
          placeholder="Search by invoice #, tracking, VIN..."
        />
      </View>

      {/* Status Filter Chips */}
      <View style={styles.filterRow}>
        {filterOptions.map((option) => {
          const isSelected = option.value === selectedFilter;
          return (
            <TouchableOpacity
              key={option.value}
              activeOpacity={0.8}
              onPress={() => setSelectedFilter(option.value)}
              style={[
                styles.filterChip,
                {
                  backgroundColor: isSelected ? `${colors.accent}18` : colors.panel,
                  borderColor: isSelected ? colors.accent : colors.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.filterChipText,
                  { color: isSelected ? colors.accent : colors.textPrimary },
                ]}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.listHeaderRow}>
        <Text style={[styles.listHeaderTitle, { color: colors.textPrimary }]}>
          {selectedFilter === 'all' ? 'All Invoices' : `${filterOptions.find((f) => f.value === selectedFilter)?.label} Invoices`}
        </Text>
        <Text style={[styles.listHeaderCount, { color: colors.textTertiary }]}>
          {invoices.length} {invoices.length === 1 ? 'record' : 'records'}
        </Text>
      </View>
    </View>
  );

  if (query.isLoading && !query.isRefetching) {
    return <LoadingSpinner fullScreen />;
  }

  if (query.error) {
    return <ErrorState message={(query.error as any).message} onRetry={query.refetch} />;
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <FlatList<Invoice>
        data={invoices}
        renderItem={({ item }: { item: Invoice }) => (
          <InvoiceCard
            invoice={item}
            onPress={() => handleOpenInvoice(item)}
          />
        )}
        keyExtractor={(item: Invoice) => item.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={
          <EmptyState
            icon="invoices"
            title="No Invoices Found"
            description={
              search.length > 0 || selectedFilter !== 'all'
                ? 'No invoices match your current search or status filter.'
                : 'You have no registered invoices at this time.'
            }
          />
        }
        ListFooterComponent={
          invoices.length > 0 ? (
            <ListPaginationFooter
              loadedCount={invoices.length}
              totalCount={totalInvoices}
              hasNextPage={query.hasNextPage}
              isFetchingNextPage={query.isFetchingNextPage}
              onLoadMore={loadMore}
            />
          ) : null
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        onRefresh={query.refetch}
        refreshing={query.isRefetching && !query.isFetchingNextPage}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { padding: Spacing.base, paddingBottom: Spacing['4xl'] },
  headerContainer: {
    marginBottom: Spacing.base,
    gap: Spacing.base,
  },
  metricGrid: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  metricCard: {
    flex: 1,
    padding: Spacing.base,
    borderRadius: BorderRadius.xl,
    gap: 2,
  },
  metricLabel: {
    fontSize: Typography.fontSize.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  metricValuePrimary: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
  },
  metricSubtext: {
    fontSize: Typography.fontSize.xs,
    marginTop: 2,
  },
  searchWrapper: {
    marginBottom: 0,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  filterChip: {
    borderWidth: 1,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
  },
  filterChipText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.semibold,
  },
  listHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.xs,
  },
  listHeaderTitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold,
  },
  listHeaderCount: {
    fontSize: Typography.fontSize.xs,
  },
});

export default InvoicesScreen;
