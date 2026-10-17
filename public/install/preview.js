const icon = document.documentElement.dataset.installIcon;
try {
  localStorage.setItem('dama-app-icon-v1', icon);
} catch {
  /* Installation preview works without storage. */
}
const button = document.getElementById('install-button');
const status = document.getElementById('install-status');
let promptEvent = null;
const standalone =
  matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
if (standalone) {
  status.textContent =
    'You are viewing DA’MA as a home-screen app. To test another icon, open this preview in your browser.';
  document.getElementById('install-instructions').hidden = true;
} else if (!isSecureContext) {
  status.textContent =
    'For installation testing, open the HTTPS-hosted version. A Wi-Fi HTTP address may not offer installation.';
}
window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault();
  if (standalone) return;
  promptEvent = event;
  button.hidden = false;
});
button.addEventListener('click', async () => {
  if (!promptEvent) return;
  const current = promptEvent;
  promptEvent = null;
  button.hidden = true;
  try {
    await current.prompt();
    const { outcome } = await current.userChoice;
    status.textContent =
      outcome === 'accepted'
        ? 'Installation requested. Check your home screen for DA’MA.'
        : 'Installation dismissed. You can still play in the browser.';
  } catch {
    status.textContent = 'Use your browser’s Install app or Add to Home Screen option.';
  }
});
window.addEventListener('appinstalled', () => {
  promptEvent = null;
  button.hidden = true;
  status.textContent = 'DA’MA was installed. Open it from your home screen.';
});
