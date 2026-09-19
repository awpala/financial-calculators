import { describe, expect, it } from 'vitest';
import { isMainView, settingsDestination } from '#lib/navigation/settings.js';

describe('Settings return navigation', () => {
  it.each(['/', '/scratchpad', '/amortization', '/cashflow'])(
    'returns to %s from either settings tab',
    (route) => {
      expect(isMainView(route)).toBe(true);
      expect(settingsDestination(route, '/cashflow')).toBe('/settings');
      expect(settingsDestination('/settings', route)).toBe(route);
      expect(settingsDestination('/settings/cashflow', route)).toBe(route);
    },
  );
  it.each([
    undefined,
    null,
    false,
    '/settings',
    '/settings/cashflow',
    '/removed',
    'https://example.com',
    '//example.com',
  ])('falls back to Home for invalid saved view %j', (route) => {
    expect(isMainView(route)).toBe(false);
    expect(settingsDestination('/settings', route)).toBe('/');
  });
});
