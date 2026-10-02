import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { AppTopBar } from '../../components/shared/AppTopBar';
import { TrackingTimeline } from '../../components/customer/TrackingTimeline';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { EmptyState } from '../../components/shared/EmptyState';
import { useAppTheme } from '../../hooks/useAppTheme';
import { Typography } from '../../constants/typography';
import { Spacing } from '../../constants/spacing';
import { trackingApi } from '../../api/tracking';
import { Shipment } from '../../types/shipment';
import { CustomerStackParamList } from '../../navigation/CustomerNavigator';

const trackingSchema = z.object({
  trackingNumber: z.string().trim().min(3, 'Enter at least 3 characters'),
});

type TrackingForm = z.infer<typeof trackingSchema>;
type NavigationProp = NativeStackNavigationProp<CustomerStackParamList>;

const TrackingScreen: React.FC = () => {
  const { colors } = useAppTheme();
  const navigation = useNavigation<NavigationProp>();
  const [loading, setLoading] = useState(false);
  const [shipment, setShipment] = useState<Shipment | null>(null);
  const [error, setError] = useState('');
  const [lastQuery, setLastQuery] = useState('');

  const { control, handleSubmit, formState: { errors } } = useForm<TrackingForm>({
    resolver: zodResolver(trackingSchema),
    defaultValues: { trackingNumber: '' },
  });

  const onSubmit = async (data: TrackingForm) => {
    const trackingNumber = data.trackingNumber.trim();
    try {
      setLoading(true);
      setError('');
      setLastQuery(trackingNumber);
      const result = await trackingApi.trackByNumber(trackingNumber);
      setShipment(result);
    } catch (err: any) {
      setError(err.message || 'Failed to track shipment');
      setShipment(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <AppTopBar section="Tracking" detail="Track vehicles, containers, and status updates" />

        <Card>
          <Controller
            control={control}
            name="trackingNumber"
            render={({ field: { onChange, value } }) => (
              <Input
                label="Tracking Number / VIN"
                placeholder="Enter tracking number or VIN"
                value={value}
                onChangeText={onChange}
                autoCapitalize="characters"
                error={errors.trackingNumber?.message}
              />
            )}
          />
          <Button title="Track" onPress={handleSubmit(onSubmit)} loading={loading} fullWidth />
        </Card>

        <Card style={styles.workspaceCard}>
          <Text style={[styles.workspaceTitle, { color: colors.textPrimary }]}>Container Workspace</Text>
          <Text style={[styles.workspaceDescription, { color: colors.textSecondary }]}>Open your container list to see vessel progress, capacity, and linked shipment counts without entering a tracking number each time.</Text>
          <View style={styles.workspaceActions}>
            <Button title="My Containers" onPress={() => navigation.navigate('Containers')} style={styles.workspaceButton} />
            <Button title="Documents" variant="secondary" onPress={() => navigation.navigate('Documents')} style={styles.workspaceButton} />
          </View>
        </Card>

        {error ? (
          <Card style={styles.error}>
            <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
            {lastQuery ? (
              <Button
                title="Retry search"
                variant="secondary"
                onPress={handleSubmit(onSubmit)}
                loading={loading}
                fullWidth
              />
            ) : null}
          </Card>
        ) : null}

        {loading && <LoadingSpinner />}

        {!loading && !error && !shipment && (
          <EmptyState
            icon="tracking"
            title="Track any vehicle or container"
            description="Enter a tracking number, VIN, or container number above. Results come straight from POST /api/tracking."
          />
        )}

        {shipment && (
          <Card style={styles.result}>
            <Text style={[styles.resultTitle, { color: colors.textPrimary }]}>
              {shipment.vehicle.vin}
            </Text>
            <Text style={[styles.resultSubtitle, { color: colors.textSecondary }]}>
              {shipment.vehicle.year} {shipment.vehicle.make} {shipment.vehicle.model}
            </Text>
            <TrackingTimeline tracking={shipment.tracking} currentStatus={shipment.status} />
          </Card>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: Spacing.base },
  workspaceCard: { marginTop: Spacing.base },
  workspaceTitle: { fontSize: Typography.fontSize.lg, fontWeight: Typography.fontWeight.bold, marginBottom: Spacing.xs },
  workspaceDescription: { fontSize: Typography.fontSize.sm, lineHeight: 20, marginBottom: Spacing.base },
  workspaceActions: { flexDirection: 'row', gap: Spacing.sm },
  workspaceButton: { flex: 1 },
  error: { marginTop: Spacing.base },
  errorText: { fontSize: Typography.fontSize.base, textAlign: 'center' },
  result: { marginTop: Spacing.base },
  resultTitle: { fontSize: Typography.fontSize.xl, fontWeight: Typography.fontWeight.bold, marginBottom: Spacing.xs },
  resultSubtitle: { fontSize: Typography.fontSize.base, marginBottom: Spacing.base },
});

export default TrackingScreen;
