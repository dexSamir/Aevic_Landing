export async function loadRouteStyles(pathname: string) {
  const inRouteFamily = (root: string) => pathname === root || pathname.startsWith(`${root}/`);
  const productRoute = inRouteFamily('/team') || inRouteFamily('/admin') || inRouteFamily('/account');
  // Base styles must be installed before family overrides, independent of network arrival order.
  if (pathname !== '/') await import('../styles/public-pages.css');
  if (['/login', '/register', '/admin/login', '/reset-password', '/verify-email'].some(inRouteFamily)) await import('../styles/auth.css');
  if (productRoute) {
    await import('./workspaceStyles');
  }
  if (!productRoute && ['/reset-password', '/verify-email', '/unauthorized', '/session-expired', '/account-locked', '/too-many-attempts', '/forbidden'].some((route) => pathname.startsWith(route))) {
    await import('../styles/lifecycle.css');
  }
}
