import React from 'react';
import { DarkTheme, DefaultTheme, LinkingOptions, NavigationContainer } from '@react-navigation/native';
import * as Linking from 'expo-linking';
import { useAuth } from '../hooks/useAuth';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { AuthNavigator } from './AuthNavigator';
import { AdminNavigator } from './AdminNavigator';
import { CustomerNavigator } from './CustomerNavigator';
import { Colors } from '../constants/colors';
import { useThemePreference } from '../contexts/ThemePreferenceContext';

export type RootLinkingParamList = {
  Home: undefined;
  ShipmentDetail: { id: string };
  ContainerDetail: { id: string };
  Notifications: undefined;
};

const linking: LinkingOptions<RootLinkingParamList> = {
  prefixes: [Linking.createURL('/'), 'jacxi://'],
  config: {
    screens: {
      // Both navigators expose the same leaf names, so a link like
      // jacxi://shipments/123 lands on whichever workspace is mounted.
      ShipmentDetail: 'shipments/:id',
      ContainerDetail: 'containers/:id',
      Notifications: 'notifications',
      Home: '*',
    },
  },
};

export const RootNavigator = () => {
  const { isAuthenticated, isLoading, isAdmin } = useAuth();
  const { colorScheme } = useThemePreference();
  const colors = colorScheme === 'dark' ? Colors.dark : Colors.light;

  const navigationTheme = colorScheme === 'dark' ? DarkTheme : DefaultTheme;
  const theme = {
    ...navigationTheme,
    colors: {
      ...navigationTheme.colors,
      primary: colors.accent,
      background: colors.background,
      card: colors.panel,
      border: colors.border,
      text: colors.textPrimary,
      notification: colors.accent,
    },
  };

  if (isLoading) {
    return <LoadingSpinner fullScreen />;
  }

  return (
    <NavigationContainer<RootLinkingParamList> theme={theme} linking={linking} fallback={<LoadingSpinner fullScreen />}>
      {!isAuthenticated ? (
        <AuthNavigator />
      ) : isAdmin ? (
        <AdminNavigator />
      ) : (
        <CustomerNavigator />
      )}
    </NavigationContainer>
  );
};
