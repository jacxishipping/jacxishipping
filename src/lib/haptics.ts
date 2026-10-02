/**
 * Lightweight Haptic Feedback utility for mobile touch interactions
 * Uses the Web Vibration API where supported (Android, iOS WebKit with user activation)
 */
export function triggerHaptic(type: 'light' | 'medium' | 'success' | 'warning' | 'error' = 'light') {
  if (typeof window === 'undefined' || typeof navigator === 'undefined' || !navigator.vibrate) {
    return;
  }

  try {
    switch (type) {
      case 'light':
        navigator.vibrate(12);
        break;
      case 'medium':
        navigator.vibrate(25);
        break;
      case 'success':
        navigator.vibrate([15, 40, 20]);
        break;
      case 'warning':
        navigator.vibrate([30, 60, 30]);
        break;
      case 'error':
        navigator.vibrate([40, 80, 40, 80, 40]);
        break;
    }
  } catch {
    // Gracefully ignore if browser prevents vibration without gesture
  }
}
