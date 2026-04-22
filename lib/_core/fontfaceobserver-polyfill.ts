/**
 * Polyfill to disable FontFaceObserver on native platforms (iOS/Android)
 * 
 * FontFaceObserver is used by expo-font to wait for fonts to load on web,
 * but on native platforms it causes timeout errors because fonts are handled differently.
 * 
 * This polyfill replaces FontFaceObserver with a no-op implementation that
 * immediately resolves without waiting.
 */

import { Platform } from 'react-native';

if (Platform.OS !== 'web' && typeof globalThis !== 'undefined') {
  // Create a mock FontFaceObserver that immediately resolves
  const MockFontFaceObserver = function() {
    // Mock constructor - does nothing
  };

  MockFontFaceObserver.prototype.load = function() {
    // Return a resolved promise immediately
    return Promise.resolve();
  };

  // Replace the global FontFaceObserver with our mock
  (globalThis as any).FontFaceObserver = MockFontFaceObserver;
}
