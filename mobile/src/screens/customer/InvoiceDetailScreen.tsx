import React, { useState } from 'react';
import {
  Alert,
  Linking,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { format, formatDistanceToNow, isPast } from 'date-fns';
import { useInvoice } from '../../hooks/useInvoices';
import { AppTopBar } from '../../components/shared/AppTopBar';
import { AppIcon } from '../../components/shared/AppIcon';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { StatusBadge } from '../../components/shared/StatusBadge';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { ErrorState } from '../../components/shared/ErrorState';
import { useAppTheme } from '../../hooks/useAppTheme';
import { API_URL } from '../../api/client';
import { CustomerStackParamList } from '../../navigation/CustomerNavigator';
import { Typography } from '../../constants/typography';
import { BorderRadius, Spacing } from '../../constants/spacing';
import { InvoiceLineItem } from '../../types/invoice';

type RouteProps = RouteProp<CustomerStackParamList, 'InvoiceDetail'>;
type NavigationProp = NativeStackNavigationProp<CustomerStackParamList>;

const formatCurrency = (amount: number, currency: string = 'USD') =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency || 'USD',
  }).format(amount || 0);

const formatLineItemType = (type?: string) => {
  if (!type) return 'Fee';
  return type
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
};

const InvoiceDetailScreen: React.FC = () => {
  const route = useRoute<RouteProps>();
  const navigation = useNavigation<NavigationProp>();
  const { colors } = useAppTheme();
  const [downloading, setDownloading] = useState(false);
  const [wireInfoExpanded, setWireInfoExpanded] = useState(false);

  const { data: invoice, isLoading, error, refetch } = useInvoice(route.params.id);

  if (isLoading) return <LoadingSpinner fullScreen />;
  if (error) return <ErrorState message={(error as any).message || 'Failed to load invoice'} onRetry={refetch} />;
  if (!invoice) return <ErrorState message="Invoice not found" onRetry={refetch} />;

  const total = Number(invoice.total || 0);
  const amountPaid = Number(invoice.amountPaid || 0);
  const amountDue = Number(invoice.amountDue ?? (total - amountPaid));
  const subtotal = Number(invoice.subtotal ?? (total - (invoice.tax || 0)));
  const isPaid = invoice.status === 'PAID' || (amountDue <= 0 && total > 0);
  const isOverdue = invoice.status === 'OVERDUE' || (!isPaid && invoice.dueDate ? isPast(new Date(invoice.dueDate)) : false);

  const handleShare = async () => {
    try {
      const summary = `Jacxi Shipping Invoice ${invoice.invoiceNumber}\nTotal: ${formatCurrency(total, invoice.currency)}\nBalance Due: ${formatCurrency(amountDue, invoice.currency)}\nStatus: ${invoice.status}\nDue Date: ${invoice.dueDate ? format(new Date(invoice.dueDate), 'MMM d, yyyy') : 'N/A'}`;
      await Share.share({
        title: `Invoice ${invoice.invoiceNumber}`,
        message: summary,
      });
    } catch (err: any) {
      console.error('Failed to share invoice:', err);
    }
  };

  const handleOpenPdf = async () => {
    try {
      setDownloading(true);
      const pdfUrl = `${API_URL}/api/invoices/${invoice.id}/pdf`;
      const supported = await Linking.canOpenURL(pdfUrl);
      if (supported) {
        await Linking.openURL(pdfUrl);
      } else {
        Alert.alert('Cannot Open PDF', 'Your device could not open the PDF directly. You can access it on the portal.');
      }
    } catch (err: any) {
      Alert.alert('PDF Error', err?.message || 'Could not download invoice PDF.');
    } finally {
      setDownloading(false);
    }
  };

  const handleCopyWireDetail = (label: string, text: string) => {
    Alert.alert(`${label} Copied`, text);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <AppTopBar
          section="Invoice Details"
          detail={invoice.invoiceNumber}
          showBack
          rightAction={
            <View style={styles.topBarActions}>
              <TouchableOpacity
                onPress={handleShare}
                activeOpacity={0.8}
                style={[styles.iconButton, { backgroundColor: colors.panel, borderColor: colors.border }]}
              >
                <AppIcon name="share" size={18} color={colors.accent} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleOpenPdf}
                activeOpacity={0.8}
                style={[styles.iconButton, { backgroundColor: colors.panel, borderColor: colors.border }]}
              >
                <AppIcon name="download" size={18} color={colors.accent} />
              </TouchableOpacity>
            </View>
          }
        />

        {/* Hero Invoice Header */}
        <Card style={styles.heroCard} accentBorder elevation="elevated">
          <View style={styles.heroTopRow}>
            <View style={styles.heroBadgeRow}>
              <View style={[styles.brandPill, { backgroundColor: `${colors.accent}20` }]}>
                <AppIcon name="brand" size={14} color={colors.accent} />
                <Text style={[styles.brandPillText, { color: colors.accent }]}>Jacxi Logistics</Text>
              </View>
              <StatusBadge status={isOverdue && invoice.status !== 'CANCELLED' && !isPaid ? 'OVERDUE' : invoice.status} type="invoice" />
            </View>
          </View>

          <View style={styles.invoiceTitleSection}>
            <Text style={[styles.invoiceNumberHeading, { color: colors.textPrimary }]}>
              {invoice.invoiceNumber}
            </Text>
            {invoice.trackingNumber ? (
              <Text style={[styles.invoiceSubtitle, { color: colors.textSecondary }]}>
                Tracking / Ref: {invoice.trackingNumber}
              </Text>
            ) : null}
          </View>

          {/* Overdue Warning Alert */}
          {isOverdue && !isPaid && invoice.dueDate && (
            <View style={[styles.alertBanner, { backgroundColor: `${colors.error}18`, borderColor: `${colors.error}40` }]}>
              <AppIcon name="alert" size={18} color={colors.error} />
              <View style={styles.alertTextWrapper}>
                <Text style={[styles.alertTitle, { color: colors.error }]}>Payment Overdue</Text>
                <Text style={[styles.alertSubtitle, { color: colors.textSecondary }]}>
                  Due date was {format(new Date(invoice.dueDate), 'MMM d, yyyy')} ({formatDistanceToNow(new Date(invoice.dueDate))} ago).
                </Text>
              </View>
            </View>
          )}

          {/* Paid Confirmation Banner */}
          {isPaid && (
            <View style={[styles.alertBanner, { backgroundColor: `${colors.success}18`, borderColor: `${colors.success}40` }]}>
              <AppIcon name="check" size={18} color={colors.success} />
              <View style={styles.alertTextWrapper}>
                <Text style={[styles.alertTitle, { color: colors.success }]}>Paid in Full</Text>
                <Text style={[styles.alertSubtitle, { color: colors.textSecondary }]}>
                  {invoice.paidDate ? `Settled on ${format(new Date(invoice.paidDate), 'MMM d, yyyy')}` : 'All obligations for this invoice are fulfilled.'}
                </Text>
              </View>
            </View>
          )}

          {/* Key Financial Snapshot */}
          <View style={[styles.financialBox, { backgroundColor: colors.surfaceMuted, borderColor: colors.border }]}>
            <View style={styles.financialRow}>
              <View style={styles.financialCol}>
                <Text style={[styles.financialLabel, { color: colors.textSecondary }]}>Subtotal</Text>
                <Text style={[styles.financialValue, { color: colors.textPrimary }]}>
                  {formatCurrency(subtotal, invoice.currency)}
                </Text>
              </View>
              {Number(invoice.tax || 0) > 0 && (
                <View style={styles.financialCol}>
                  <Text style={[styles.financialLabel, { color: colors.textSecondary }]}>Tax / VAT</Text>
                  <Text style={[styles.financialValue, { color: colors.textPrimary }]}>
                    {formatCurrency(invoice.tax, invoice.currency)}
                  </Text>
                </View>
              )}
              {Number(invoice.amountPaid || 0) > 0 && (
                <View style={styles.financialCol}>
                  <Text style={[styles.financialLabel, { color: colors.textSecondary }]}>Paid</Text>
                  <Text style={[styles.financialValue, { color: colors.success }]}>
                    {formatCurrency(amountPaid, invoice.currency)}
                  </Text>
                </View>
              )}
            </View>

            <View style={[styles.financialDivider, { backgroundColor: colors.border }]} />

            <View style={styles.financialMainRow}>
              <View>
                <Text style={[styles.totalLabel, { color: colors.textSecondary }]}>Total Invoiced</Text>
                <Text style={[styles.totalValue, { color: colors.textPrimary }]}>
                  {formatCurrency(total, invoice.currency)}
                </Text>
              </View>
              <View style={styles.dueWrapper}>
                <Text style={[styles.totalLabel, { color: colors.textSecondary, textAlign: 'right' }]}>
                  {isPaid ? 'Amount Due' : 'Balance Due Now'}
                </Text>
                <Text
                  style={[
                    styles.dueValue,
                    { color: isPaid ? colors.success : isOverdue ? colors.error : colors.accent },
                  ]}
                >
                  {isPaid ? '$0.00' : formatCurrency(amountDue, invoice.currency)}
                </Text>
              </View>
            </View>
          </View>

          {/* Quick PDF & Action Buttons */}
          <View style={styles.actionButtonGroup}>
            <Button
              title={downloading ? 'Opening PDF...' : 'Download / View PDF'}
              variant="secondary"
              size="md"
              onPress={handleOpenPdf}
              style={styles.fullWidthBtn}
            />
          </View>
        </Card>

        {/* Linked Shipment Context Card */}
        {invoice.shipmentId && (
          <Card style={styles.sectionCard}>
            <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionTitleWithIcon}>
                <AppIcon name="shipments" size={18} color={colors.accent} />
                <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Associated Shipment</Text>
              </View>
              <TouchableOpacity
                onPress={() => navigation.navigate('ShipmentDetail', { id: invoice.shipmentId! })}
                style={styles.linkRow}
              >
                <Text style={[styles.linkText, { color: colors.accent }]}>Open Shipment</Text>
                <AppIcon name="forward" size={14} color={colors.accent} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
              This billing invoice is linked to active logistics shipment {invoice.shipmentId.slice(0, 8)}.
            </Text>

            <View style={[styles.shipmentSummaryBox, { backgroundColor: colors.surfaceMuted, borderColor: colors.border }]}>
              {invoice.trackingNumber && (
                <View style={styles.metaInfoRow}>
                  <Text style={[styles.metaInfoLabel, { color: colors.textSecondary }]}>Tracking #</Text>
                  <Text style={[styles.metaInfoVal, { color: colors.textPrimary }]}>{invoice.trackingNumber}</Text>
                </View>
              )}
              {Boolean((invoice as any).containerId || (invoice as any).container?.containerNumber) && (
                <View style={styles.metaInfoRow}>
                  <Text style={[styles.metaInfoLabel, { color: colors.textSecondary }]}>Container #</Text>
                  <Text style={[styles.metaInfoVal, { color: colors.textPrimary }]}>
                    {(invoice as any).container?.containerNumber || (invoice as any).containerId}
                  </Text>
                </View>
              )}
            </View>
          </Card>
        )}

        {/* Itemized Line Items Breakdown */}
        <Card style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionTitleWithIcon}>
              <AppIcon name="invoices" size={18} color={colors.accent} />
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                Itemized Charges ({invoice.lineItems?.length || 0})
              </Text>
            </View>
          </View>
          <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
            Line-by-line breakdown of logistics, freight, and customs fees.
          </Text>

          {(!invoice.lineItems || invoice.lineItems.length === 0) ? (
            <View style={[styles.emptyLineItems, { backgroundColor: colors.surfaceMuted }]}>
              <Text style={[styles.emptyLineItemsText, { color: colors.textSecondary }]}>
                No individual line items registered. Full invoice total: {formatCurrency(total, invoice.currency)}.
              </Text>
            </View>
          ) : (
            <View style={styles.lineItemList}>
              {invoice.lineItems.map((item: InvoiceLineItem, idx: number) => {
                const itemTotal = Number(item.total || (item.quantity * item.unitPrice) || 0);
                return (
                  <View
                    key={item.id || idx}
                    style={[
                      styles.lineItemCard,
                      { backgroundColor: colors.surfaceMuted, borderColor: colors.border },
                    ]}
                  >
                    <View style={styles.lineItemHeader}>
                      <View style={styles.lineItemMain}>
                        <Text style={[styles.lineItemDescription, { color: colors.textPrimary }]}>
                          {item.description}
                        </Text>
                        <View style={styles.lineItemPillsRow}>
                          <View style={[styles.typePill, { backgroundColor: `${colors.accent}16` }]}>
                            <Text style={[styles.typePillText, { color: colors.accent }]}>
                              {formatLineItemType((item as any).type)}
                            </Text>
                          </View>
                          {item.quantity > 1 && (
                            <Text style={[styles.quantityText, { color: colors.textTertiary }]}>
                              Qty: {item.quantity} × {formatCurrency(item.unitPrice, invoice.currency)}
                            </Text>
                          )}
                        </View>
                      </View>
                      <Text style={[styles.lineItemAmount, { color: colors.textPrimary }]}>
                        {formatCurrency(itemTotal, invoice.currency)}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </Card>

        {/* Payment Instructions & Bank Details */}
        <Card style={styles.sectionCard}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setWireInfoExpanded(!wireInfoExpanded)}
            style={styles.collapsibleHeader}
          >
            <View style={styles.sectionTitleWithIcon}>
              <AppIcon name="banking" size={18} color={colors.accent} />
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Payment & Bank Wire Details</Text>
            </View>
            <AppIcon name={wireInfoExpanded ? 'back' : 'forward'} size={18} color={colors.textSecondary} />
          </TouchableOpacity>

          <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
            Official Jacxi Shipping receiving accounts for wire transfers and cash deposits.
          </Text>

          {wireInfoExpanded && (
            <View style={styles.wireInfoBody}>
              <View style={[styles.wireItem, { backgroundColor: colors.surfaceMuted, borderColor: colors.border }]}>
                <View style={styles.wireItemCopy}>
                  <Text style={[styles.wireLabel, { color: colors.textSecondary }]}>Beneficiary</Text>
                  <Text style={[styles.wireValue, { color: colors.textPrimary }]}>Jacxi Shipping LLC</Text>
                </View>
                <TouchableOpacity onPress={() => handleCopyWireDetail('Beneficiary', 'Jacxi Shipping LLC')}>
                  <AppIcon name="copy" size={16} color={colors.accent} />
                </TouchableOpacity>
              </View>

              <View style={[styles.wireItem, { backgroundColor: colors.surfaceMuted, borderColor: colors.border }]}>
                <View style={styles.wireItemCopy}>
                  <Text style={[styles.wireLabel, { color: colors.textSecondary }]}>Bank Name</Text>
                  <Text style={[styles.wireValue, { color: colors.textPrimary }]}>Chase Bank USA, N.A.</Text>
                </View>
                <TouchableOpacity onPress={() => handleCopyWireDetail('Bank', 'Chase Bank USA, N.A.')}>
                  <AppIcon name="copy" size={16} color={colors.accent} />
                </TouchableOpacity>
              </View>

              <View style={[styles.wireItem, { backgroundColor: colors.surfaceMuted, borderColor: colors.border }]}>
                <View style={styles.wireItemCopy}>
                  <Text style={[styles.wireLabel, { color: colors.textSecondary }]}>Payment Reference / Memo</Text>
                  <Text style={[styles.wireValue, { color: colors.accent }]}>{invoice.invoiceNumber}</Text>
                </View>
                <TouchableOpacity onPress={() => handleCopyWireDetail('Reference', invoice.invoiceNumber)}>
                  <AppIcon name="copy" size={16} color={colors.accent} />
                </TouchableOpacity>
              </View>

              <Text style={[styles.wireNote, { color: colors.textTertiary }]}>
                Important: Always include invoice number "{invoice.invoiceNumber}" in your wire transfer memo for rapid automated clearing.
              </Text>
            </View>
          )}
        </Card>

        {/* Invoice Metadata & Notes */}
        <Card style={styles.sectionCard}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Invoice Information</Text>

          <View style={styles.infoList}>
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Issue Date</Text>
              <Text style={[styles.infoVal, { color: colors.textPrimary }]}>
                {invoice.issueDate ? format(new Date(invoice.issueDate), 'MMMM d, yyyy') : 'N/A'}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Due Date</Text>
              <Text style={[styles.infoVal, { color: colors.textPrimary }]}>
                {invoice.dueDate ? format(new Date(invoice.dueDate), 'MMMM d, yyyy') : 'N/A'}
              </Text>
            </View>
            {invoice.paidDate ? (
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Date Settled</Text>
                <Text style={[styles.infoVal, { color: colors.success }]}>
                  {format(new Date(invoice.paidDate), 'MMMM d, yyyy')}
                </Text>
              </View>
            ) : null}
            {invoice.customerName ? (
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Billed To</Text>
                <Text style={[styles.infoVal, { color: colors.textPrimary }]}>{invoice.customerName}</Text>
              </View>
            ) : null}
            {invoice.notes ? (
              <View style={styles.notesBox}>
                <Text style={[styles.notesLabel, { color: colors.textSecondary }]}>Notes</Text>
                <Text style={[styles.notesText, { color: colors.textPrimary }]}>{invoice.notes}</Text>
              </View>
            ) : null}
          </View>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    padding: Spacing.base,
    paddingBottom: Spacing['4xl'],
    gap: Spacing.base,
  },
  topBarActions: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroCard: {
    gap: Spacing.md,
    borderRadius: BorderRadius.xl,
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  heroBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  brandPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  brandPillText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.bold,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  invoiceTitleSection: {
    gap: 2,
  },
  invoiceNumberHeading: {
    fontSize: Typography.fontSize['2xl'],
    fontWeight: Typography.fontWeight.bold,
  },
  invoiceSubtitle: {
    fontSize: Typography.fontSize.sm,
  },
  alertBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  alertTextWrapper: {
    flex: 1,
    gap: 2,
  },
  alertTitle: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.bold,
  },
  alertSubtitle: {
    fontSize: Typography.fontSize.xs,
    lineHeight: 16,
  },
  financialBox: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.base,
    gap: Spacing.sm,
  },
  financialRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  financialCol: {
    flex: 1,
  },
  financialLabel: {
    fontSize: Typography.fontSize.xs,
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  financialValue: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
  },
  financialDivider: {
    height: 1,
    marginVertical: Spacing.xs,
  },
  financialMainRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  totalLabel: {
    fontSize: Typography.fontSize.xs,
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  totalValue: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
  },
  dueWrapper: {
    alignItems: 'flex-end',
  },
  dueValue: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
  },
  actionButtonGroup: {
    marginTop: Spacing.xs,
  },
  fullWidthBtn: {
    width: '100%',
  },
  sectionCard: {
    gap: Spacing.sm,
    borderRadius: BorderRadius.xl,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitleWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  sectionTitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold,
  },
  sectionSubtitle: {
    fontSize: Typography.fontSize.xs,
    lineHeight: 18,
    marginBottom: Spacing.xs,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  linkText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.semibold,
  },
  shipmentSummaryBox: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.md,
    gap: Spacing.xs,
  },
  metaInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metaInfoLabel: {
    fontSize: Typography.fontSize.xs,
  },
  metaInfoVal: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.semibold,
  },
  lineItemList: {
    gap: Spacing.xs,
  },
  lineItemCard: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.md,
  },
  lineItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  lineItemMain: {
    flex: 1,
    marginRight: Spacing.sm,
    gap: Spacing.xs,
  },
  lineItemDescription: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
  },
  lineItemPillsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    flexWrap: 'wrap',
  },
  typePill: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  typePillText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.medium,
  },
  quantityText: {
    fontSize: Typography.fontSize.xs,
  },
  lineItemAmount: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold,
  },
  emptyLineItems: {
    padding: Spacing.base,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
  },
  emptyLineItemsText: {
    fontSize: Typography.fontSize.xs,
    textAlign: 'center',
  },
  collapsibleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  wireInfoBody: {
    marginTop: Spacing.sm,
    gap: Spacing.xs,
  },
  wireItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  wireItemCopy: {
    gap: 2,
  },
  wireLabel: {
    fontSize: Typography.fontSize.xs,
  },
  wireValue: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.bold,
  },
  wireNote: {
    fontSize: Typography.fontSize.xs,
    lineHeight: 16,
    marginTop: Spacing.xs,
  },
  infoList: {
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  infoLabel: {
    fontSize: Typography.fontSize.xs,
  },
  infoVal: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.semibold,
  },
  notesBox: {
    marginTop: Spacing.xs,
    gap: 2,
  },
  notesLabel: {
    fontSize: Typography.fontSize.xs,
  },
  notesText: {
    fontSize: Typography.fontSize.sm,
    lineHeight: 20,
  },
});

export default InvoiceDetailScreen;
