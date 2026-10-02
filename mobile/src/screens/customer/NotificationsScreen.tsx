import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNotifications, useMarkNotificationAsRead, useMarkAllNotificationsAsRead } from '../../hooks/useNotifications';
import { AppTopBar } from '../../components/shared/AppTopBar';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { ErrorState } from '../../components/shared/ErrorState';
import { EmptyState } from '../../components/shared/EmptyState';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { useAppTheme } from '../../hooks/useAppTheme';
import { Typography } from '../../constants/typography';
import { Spacing } from '../../constants/spacing';
import { format } from 'date-fns';
import { Notification } from '../../types/api';

const NotificationsScreen: React.FC = () => {
  const { colors } = useAppTheme();
  const { data, isLoading, isRefetching, error, refetch } = useNotifications();
  const markAsRead = useMarkNotificationAsRead();
  const markAllAsRead = useMarkAllNotificationsAsRead();

  const handleNotificationPress = (notification: Notification) => {
    if (!notification.read) {
      markAsRead.mutate(notification.id);
    }
  };

  if (isLoading) return <LoadingSpinner fullScreen />;
  if (error) return <ErrorState message={(error as any).message} onRetry={refetch} />;

  const notifications = data?.data || [];
  const unreadCount = data?.unreadCount ?? notifications.filter((item) => !item.read).length;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <FlatList
        data={notifications}
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => handleNotificationPress(item)}>
            <Card style={[styles.card, !item.read && { borderLeftWidth: 3, borderLeftColor: colors.accent }]}>
              <View style={styles.header}>
                <Badge label={item.type} variant={item.type === 'ERROR' ? 'error' : 'info'} size="sm" />
                <Text style={[styles.date, { color: colors.textTertiary }]}>
                  {format(new Date(item.createdAt), 'MMM d, h:mm a')}
                </Text>
              </View>
              <Text style={[styles.title, { color: colors.textPrimary }]}>{item.title}</Text>
              <Text style={[styles.message, { color: colors.textSecondary }]}>{item.description ?? item.message}</Text>
            </Card>
          </TouchableOpacity>
        )}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View>
            <AppTopBar section="Notifications" detail="Recent system updates and shipment alerts" showBack hideNotifications />
            {unreadCount > 0 && (
              <Button
                title={markAllAsRead.isPending ? 'Marking…' : `Mark all as read (${unreadCount})`}
                variant="secondary"
                onPress={() => markAllAsRead.mutate()}
                disabled={markAllAsRead.isPending}
              />
            )}
          </View>
        }
        ListEmptyComponent={<EmptyState icon="notifications" title="No Notifications" />}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.accent} />}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { padding: Spacing.base },
  card: { marginBottom: Spacing.md },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.sm },
  date: { fontSize: Typography.fontSize.xs },
  title: { fontSize: Typography.fontSize.base, fontWeight: Typography.fontWeight.semibold, marginBottom: Spacing.xs },
  message: { fontSize: Typography.fontSize.sm },
});

export default NotificationsScreen;
