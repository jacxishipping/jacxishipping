import React from 'react';
import { Text, View, StyleSheet } from 'react-native';
import { Button } from './ui/Button';
import { Spacing } from '../constants/spacing';
import { Typography } from '../constants/typography';
import { useAppTheme } from '../hooks/useAppTheme';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  message?: string;
}

/** Last-resort crash guard so one broken screen can't blank the whole app. */
export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: unknown): State {
    return { hasError: true, message: error instanceof Error ? error.message : String(error) };
  }

  componentDidCatch(error: unknown) {
    console.error('Mobile error boundary caught:', error);
  }

  private handleRetry = () => {
    this.setState({ hasError: false, message: undefined });
  };

  render() {
    if (!this.state.hasError) return this.props.children;
    return <ErrorFallback message={this.state.message} onRetry={this.handleRetry} />;
  }
}

function ErrorFallback({ message, onRetry }: { message?: string; onRetry: () => void }) {
  const { colors } = useAppTheme();
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.textPrimary }]}>Something went wrong</Text>
      <Text style={[styles.message, { color: colors.textSecondary }]}>
        {message || 'The app hit an unexpected error. Your session is safe — try again.'}
      </Text>
      <Button title="Try again" onPress={onRetry} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl, gap: Spacing.md },
  title: { fontSize: Typography.fontSize.xl, fontWeight: Typography.fontWeight.bold, textAlign: 'center' },
  message: { fontSize: Typography.fontSize.base, textAlign: 'center', lineHeight: 22 },
});
