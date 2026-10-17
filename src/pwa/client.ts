type InstallEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: string }>;
};
export function initPwa(options: { canUpdate: () => boolean; save: () => boolean }) {
  const get = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
  let registration: ServiceWorkerRegistration | undefined, prompt: InstallEvent | undefined;
  let ready = false,
    applying = false,
    notice = '',
    busy = false,
    installedThisVisit = false;
  const standalone = () =>
    matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
  const enabled = import.meta.env.PROD && isSecureContext && 'serviceWorker' in navigator;
  const installText =
    'On iPhone: open DA’MA in Safari, tap Share, then Add to Home Screen. On other devices: use your browser’s Install app or Add to Home Screen option. Choose your icon above before installing. Open the installed app once while online and check its offline readiness here. Safari and the home-screen app may keep separate saves.';
  function refresh() {
    const waiting = !!registration?.waiting;
    get('pwa-status').textContent =
      notice ||
      (!import.meta.env.PROD
        ? 'Offline caching is disabled in development. Test the production preview or HTTPS site.'
        : !isSecureContext
          ? 'Use the HTTPS site to install and prepare offline play.'
          : !('serviceWorker' in navigator)
            ? 'This browser cannot prepare offline play. You can keep playing online.'
            : ready
              ? navigator.onLine
                ? 'Ready for offline play on this device.'
                : 'You’re offline. Your downloaded game is ready.'
              : busy
                ? 'Downloading the game for offline play…'
                : 'Offline files are not ready. Connect and try again.');
    get('pwa-install').hidden = standalone() || installedThisVisit;
    get('pwa-install').textContent = prompt ? 'Install DA’MA' : 'How to install';
    get('pwa-installed').hidden = !standalone() && !installedThisVisit;
    get('pwa-installed').textContent = standalone()
      ? 'Running as a home-screen app.'
      : 'DA’MA was installed on this device.';
    get('pwa-update-settings').hidden = !waiting;
    get<HTMLButtonElement>('pwa-update-settings').disabled = !options.canUpdate() || applying;
    get('pwa-update-note').hidden = !waiting;
    get('pwa-update-note').textContent = options.canUpdate()
      ? 'A new version is ready. Update and reload when you’re ready.'
      : 'A new version is ready. Return Home to update after saving your match.';
    get('pwa-update-toast').hidden =
      !waiting || !options.canUpdate() || !!document.querySelector('dialog[open]');
    get<HTMLButtonElement>('pwa-update').disabled = applying;
    get('pwa-retry').hidden = !enabled || ready || busy;
  }
  function message(
    worker: ServiceWorker,
    type: string,
  ): Promise<{ ready?: boolean; blocked?: boolean }> {
    return new Promise((resolve, reject) => {
      const channel = new MessageChannel();
      const timeout = setTimeout(() => {
        channel.port1.close();
        reject(new Error('Worker response timed out'));
      }, 10000);
      channel.port1.onmessage = (event) => {
        clearTimeout(timeout);
        channel.port1.close();
        resolve(event.data);
      };
      worker.postMessage({ type }, [channel.port2]);
    });
  }
  async function checkReady() {
    if (!registration?.active) return;
    try {
      ready = !!(await message(registration.active, 'OFFLINE_STATUS')).ready;
    } catch {
      ready = false;
    }
    busy = false;
    refresh();
  }
  async function register() {
    if (!enabled) return;
    busy = true;
    notice = '';
    refresh();
    try {
      registration = await navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' });
      const watch = () => {
        const worker = registration?.installing;
        worker?.addEventListener('statechange', () => {
          if (worker.state === 'installed') {
            if (registration?.waiting) {
              busy = false;
              refresh();
            } else void navigator.serviceWorker.ready.then(() => checkReady());
          }
          if (worker.state === 'redundant') {
            busy = false;
            void checkReady();
            refresh();
          }
        });
      };
      registration.addEventListener('updatefound', watch);
      watch();
      if (registration.active) await checkReady();
      else void navigator.serviceWorker.ready.then(() => checkReady());
      refresh();
    } catch {
      busy = false;
      notice = 'Offline preparation failed. Check your connection and try again.';
      refresh();
    }
  }
  async function update() {
    if (!registration?.waiting || !options.canUpdate() || applying) return;
    if (!options.save()) {
      notice =
        'Your current save could not be written. Keep this version open and try again after saving works.';
      refresh();
      return;
    }
    notice = '';
    applying = true;
    refresh();
    try {
      const result = await message(registration.waiting, 'ACTIVATE_UPDATE');
      if (result.blocked) {
        applying = false;
        notice = 'Close other DA’MA windows or tabs, then try updating again.';
        refresh();
      }
    } catch {
      applying = false;
      notice = 'The update could not be applied. Try again when online.';
      refresh();
    }
  }
  get('pwa-update').addEventListener('click', () => void update());
  get('pwa-update-settings').addEventListener('click', () => void update());
  get('pwa-retry').addEventListener('click', async () => {
    if (registration?.active) {
      busy = true;
      notice = '';
      refresh();
      try {
        await message(registration.active, 'PREPARE_OFFLINE');
      } catch {
        /* Retry remains available. */
      }
      await checkReady();
      void registration.update().catch(() => {});
    } else await register();
  });
  get('pwa-install').addEventListener('click', async () => {
    if (!prompt) {
      get('pwa-install-help').hidden = !get('pwa-install-help').hidden;
      return;
    }
    const event = prompt;
    prompt = undefined;
    refresh();
    try {
      await event.prompt();
      await event.userChoice;
    } catch {
      get('pwa-install-help').hidden = false;
    }
  });
  get('pwa-install-help').textContent = installText;
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    prompt = event as InstallEvent;
    refresh();
  });
  window.addEventListener('appinstalled', () => {
    installedThisVisit = true;
    prompt = undefined;
    get('pwa-install-help').hidden = true;
    refresh();
  });
  window.addEventListener('online', () => {
    notice = '';
    refresh();
    void registration?.update().catch(() => {});
  });
  window.addEventListener('offline', refresh);
  document.addEventListener('close', refresh, true);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      void checkReady();
      void registration?.update().catch(() => {});
    }
  });
  if ('serviceWorker' in navigator)
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (applying) location.reload();
      else void checkReady();
    });
  refresh();
  void register();
  return { refresh };
}
