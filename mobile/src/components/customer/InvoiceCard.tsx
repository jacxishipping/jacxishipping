import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Card } from '../ui/Card';
import { StatusBadge } from '../shared/StatusBadge';
import { AppIcon } from '../shared/AppIcon';
import { Invoice } from '../../types/invoice';
import { useAppTheme } from '../../hooks/useAppTheme';
import { Typography } from '../../constants/typography';
import { BorderRadius, Spacing } from '../../constants/spacing';
import { format, isPast } from 'date-fns';

interface InvoiceCardProps {
  invoice: Invoice;
  onPress?: () => void;
  footer?: React.ReactNode;
}

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount || 0);

export const InvoiceCard: React.FC<InvoiceCardProps> = ({ invoice, onPress, footer }) => {
  const { colors } = useAppTheme();

  const total = Number(invoice.total || 0);
  const amountPaid = Number(invoice.amountPaid || 0);
  const amountDue = Number(invoice.amountDue ?? (total - amountPaid));
  const isPaid = invoice.status === 'PAID' || (amountDue <= 0 && total > 0);
  const isOverdue = invoice.status === 'OVERDUE' || (!isPaid && invoice.dueDate ? isPast(new Date(invoice.dueDate)) : false);
  const progressPercent = total > 0 ? Math.min(100, Math.max(0, (amountPaid / total) * 100)) : 0;
  const lineItemCount = invoice.lineItems?.length || 0;

  return (
    <Card
      pressable={Boolean(onPress)}
      onPress={onPress}
      style={StyleSheet.flatten([
        styles.card,
        isOverdue && !isPaid && { borderColor: `${colors.error}60` },
      ])}
    >
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.invoiceNumberRow}>
            <Text style={[styles.invoiceNumber, { color: colors.textPrimary }]}>
              {invoice.invoiceNumber}
            </Text>
            {onPress && (
              <AppIcon name="forward" size={16} color={colors.textTertiary} />
            )}
          </View>
          {invoice.trackingNumber && (
            <View style={styles.trackingRow}>
              <AppIcon name="tracking" size={12} color={colors.accent} />
              <Text style={[styles.tracking, { color: colors.textSecondary }]}>
                {invoice.trackingNumber}
              </Text>
            </View>
          )}
        </View>
        <StatusBadge status={isOverdue && invoice.status !== 'CANCELLED' && !isPaid ? 'OVERDUE' : invoice.status} type="invoice" />
      </View>

      <View style={[styles.amountsContainer, { backgroundColor: colors.surfaceMuted, borderColor: colors.border }]}>
        <View style={styles.amountCol}>
          <Text style={[styles.amountLabel, { color: colors.textSecondary }]}>Total Invoiced</Text>
          <Text style={[styles.amountValue, { color: colors.textPrimary }]}>
            {formatCurrency(total)}
          </Text>
        </View>

        <View style={[styles.amountDivider, { backgroundColor: colors.border }]} />

        <View style={styles.amountCol}>
          <Text style={[styles.amountLabel, { color: colors.textSecondary }]}>
            {isPaid ? 'Status' : 'Balance Due'}
          </Text>
          <Text
            style={[
              styles.amountValue,
              { color: isPaid ? colors.success : isOverdue ? colors.error : colors.accent },
            ]}
          >
            {isPaid ? 'Paid in Full' : formatCurrency(amountDue)}
          </Text>
        </View>
      </View>

      {/* Progress meter */}
      {total > 0 && !isPaid && (
        <View style={styles.progressSection}>
          <View style={styles.progressHeader}>
            <Text style={[styles.progressLabel, { color: colors.textTertiary }]}>
              Payment Progress
            </Text>
            <Text style={[styles.progressValue, { color: colors.textSecondary }]}>
              {formatCurrency(amountPaid)} of {formatCurrency(total)} ({Math.round(progressPercent)}%)
            </Text>
          </View>
          <View style={[styles.progressBarTrack, { backgroundColor: colors.border }]}>
            <View
              style={[
                styles.progressBarFill,
                {
                  width: `${progressPercent}%`,
                  backgroundColor: progressPercent > 0 ? colors.accent : colors.border,
                },
              ]}
            />
          </View>
        </View>
      )}

      <View style={styles.metaRow}>
        <View style={styles.dates}>
          <Text style={[styles.dateText, { color: colors.textTertiary }]}>
            Issued: {invoice.issueDate ? format(new Date(invoice.issueDate), 'MMM d, yyyy') : 'N/A'}
          </Text>
          <Text
            style={[
              styles.dateText,
              { color: isOverdue && !isPaid ? colors.error : colors.textTertiary },
            ]}
          >
            Due: {invoice.dueDate ? format(new Date(invoice.dueDate), 'MMM d, yyyy') : 'N/A'}
          </Text>
        </View>

        {lineItemCount > 0 && (
          <View style={[styles.itemCountBadge, { backgroundColor: `${colors.accent}14` }]}>
            <Text style={[styles.itemCountText, { color: colors.accent }]}>
              {lineItemCount} {lineItemCount === 1 ? 'item' : 'items'}
            </Text>
          </View>
        )}
      </View>

      {onPress && (
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={onPress}
          style={[styles.actionRow, { borderTopColor: colors.border }]}
        >
          <Text style={[styles.actionText, { color: colors.accent }]}>View Detailed Invoice</Text>
          <AppIcon name="forward" size={14} color={colors.accent} />
        </TouchableOpacity>
      )}

      {footer ? <View style={styles.footer}>{footer}</View> : null}
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: Spacing.md,
    borderRadius: BorderRadius.xl,
    padding: Spacing.base,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
  },
  headerLeft: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  invoiceNumberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  invoiceNumber: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold,
  },
  trackingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  tracking: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.medium,
  },
  amountsContainer: {
    flexDirection: 'row',
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  amountCol: {
    flex: 1,
    alignItems: 'center',
  },
  amountDivider: {
    width: 1,
    alignSelf: 'stretch',
    marginHorizontal: Spacing.xs,
  },
  amountLabel: {
    fontSize: Typography.fontSize.xs,
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  amountValue: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold,
  },
  progressSection: {
    marginBottom: Spacing.md,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs,
  },
  progressLabel: {
    fontSize: Typography.fontSize.xs,
  },
  progressValue: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.medium,
  },
  progressBarTrack: {
    height: 5,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dates: {
    flex: 1,
    flexDirection: 'row',
    gap: Spacing.md,
  },
  dateText: {
    fontSize: Typography.fontSize.xs,
  },
  itemCountBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  itemCountText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.semibold,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    marginTop: Spacing.md,
    paddingTop: Spacing.sm,
  },
  actionText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.semibold,
  },
  footer: {
    marginTop: Spacing.md,
  },
});
