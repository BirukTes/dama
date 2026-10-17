export const appIcons = [
  { id: 'monogram-dark', name: 'Monogram · Dark', detail: 'Default' },
  { id: 'monogram-light', name: 'Monogram · Light', detail: 'Light background' },
  { id: 'board-light', name: 'Board · Light', detail: 'Original board' },
  { id: 'board-dark', name: 'Board · Dark', detail: 'Original board' },
] as const;
export type AppIcon = (typeof appIcons)[number]['id'];
export const appIconMarkup = `<details id="icon-settings"><summary><img id="icon-current" src="/icons/monogram-dark/icon-192.png" width="28" height="28" alt=""><span>App icon</span><small id="icon-current-label">Monogram · Dark</small></summary>
  <fieldset id="icon-options"><legend>Choose before installation</legend><div class="icon-options-grid">${appIcons.map((icon) => `<label class="icon-option"><input type="radio" name="app-icon" value="${icon.id}" ${icon.id === 'monogram-dark' ? 'checked' : ''}><img src="/icons/${icon.id}/icon-192.png" width="72" height="72" alt=""><span>${icon.name}</span><small>${icon.detail}</small></label>`).join('')}</div></fieldset>
  <p class="dialog-note">Independent of the game theme. Choose an icon, then open its preview to test adding DA’MA to your home screen. Changing this selection won’t instantly replace an already-installed icon.</p>
  <a class="icon-preview-link" id="icon-preview-link" href="/install/monogram-dark.html" target="_blank" rel="noopener">Open install preview ↗</a>
  <p id="icon-install-note" class="dialog-note"></p>
</details>`;

export function initAppIcons() {
  const valid = (id: unknown): id is AppIcon => appIcons.some((icon) => icon.id === id);
  const root = document.documentElement;
  let selected: AppIcon = valid(root.dataset.appIcon) ? root.dataset.appIcon : 'monogram-dark';
  const apply = () => {
    root.dataset.appIcon = selected;
    document.querySelector<HTMLInputElement>(
      `input[name="app-icon"][value="${selected}"]`,
    )!.checked = true;
    document.querySelector<HTMLImageElement>('#icon-current')!.src =
      `/icons/${selected}/icon-192.png`;
    document.querySelector('#icon-current-label')!.textContent = appIcons.find(
      (icon) => icon.id === selected,
    )!.name;
    document.querySelector<HTMLAnchorElement>('#icon-preview-link')!.href =
      `/install/${selected}.html`;
    for (const [id, rel, href, size] of [
      ['app-manifest', 'manifest', `/manifests/${selected}.webmanifest`, ''],
      ['app-touch-icon', 'apple-touch-icon', `/icons/${selected}/icon-180.png`, '180x180'],
      ['app-favicon', 'icon', `/icons/${selected}/icon-32.png`, '32x32'],
    ]) {
      let link = document.getElementById(id) as HTMLLinkElement | null;
      if (!link) {
        link = document.createElement('link');
        link.id = id;
        link.rel = rel;
        document.head.append(link);
      }
      link.href = href;
      if (size) link.setAttribute('sizes', size);
    }
  };
  apply();
  document.querySelector('#icon-options')!.addEventListener('change', (event) => {
    const id = (event.target as HTMLInputElement).value;
    if (!valid(id)) return;
    selected = id;
    apply();
    try {
      localStorage.setItem('dama-app-icon-v1', selected);
    } catch {
      /* Selection remains available until reload. */
    }
  });
  const standalone =
    matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
  document.querySelector('#icon-install-note')!.textContent = standalone
    ? 'You’re running the home-screen app. Use the browser preview to test another installation icon.'
    : 'Icon installation testing is available now. Offline play is coming next.';
}
