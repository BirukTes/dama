// Run before the app module so browsers discover only the chosen manifest.
(() => {
  const variants = ['monogram-dark', 'monogram-light', 'board-light', 'board-dark'];
  const requested = new URLSearchParams(location.search).get('app-icon');
  let icon = 'monogram-dark';
  try {
    const saved = localStorage.getItem('dama-app-icon-v1');
    if (variants.includes(saved)) icon = saved;
  } catch {
    /* Storage is optional. */
  }
  if (variants.includes(requested)) {
    icon = requested;
    try {
      localStorage.setItem('dama-app-icon-v1', icon);
    } catch {
      /* Keep in memory. */
    }
    // Apply the install launch choice once; later selector changes survive reload.
    try {
      const url = new URL(location.href);
      url.searchParams.delete('app-icon');
      history.replaceState(history.state, '', url);
    } catch {
      /* The chosen icon still works without replacing the URL. */
    }
  }
  document.documentElement.dataset.appIcon = icon;
  for (const [id, rel, href, size] of [
    ['app-manifest', 'manifest', `/manifests/${icon}.webmanifest`, ''],
    ['app-touch-icon', 'apple-touch-icon', `/icons/${icon}/icon-180.png`, '180x180'],
    ['app-favicon', 'icon', `/icons/${icon}/icon-32.png`, '32x32'],
  ]) {
    const link = document.createElement('link');
    link.id = id;
    link.rel = rel;
    link.href = href;
    if (size) {
      link.sizes = size;
      link.type = 'image/png';
    }
    document.head.append(link);
  }
})();
