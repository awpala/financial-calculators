/** Non-settings views eligible as the Settings shortcut's return destination. */
export type MainView = '/' | '/scratchpad' | '/amortization' | '/cashflow';

/** Whether a route identity is one of this app's main content views. */
export function isMainView(route: unknown): route is MainView {
  return (
    route === '/' ||
    route === '/scratchpad' ||
    route === '/amortization' ||
    route === '/cashflow'
  );
}

/**
 * Open Settings from a main view, or return from any Settings tab to the saved
 * main view. Corrupt/obsolete storage falls back to Home. This is route policy,
 * not browser history traversal, and never admits an external destination.
 */
export function settingsDestination(
  route: string | null | undefined,
  returnView: unknown,
): MainView | '/settings' {
  return route === '/settings' || route?.startsWith('/settings/')
    ? isMainView(returnView)
      ? returnView
      : '/'
    : '/settings';
}
