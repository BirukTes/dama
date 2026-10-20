// Move the same controls, rather than duplicating their IDs, state or handlers.
export function initHomeActions(onLayout: () => void) {
  const media = matchMedia('(max-width: 620px), (orientation: landscape) and (max-height: 560px)');
  const dock = document.getElementById('home-actions')!;
  const controls = ['start-button', 'continue-button', 'resume-puzzle', 'local-button'].map(
    (id) => {
      const button = document.getElementById(id)!;
      const marker = document.createComment(`${id} home position`);
      button.before(marker);
      return { button, marker };
    },
  );
  function layout() {
    const active = document.activeElement as HTMLElement | null;
    document.body.classList.toggle('home-docked', media.matches);
    for (const { button, marker } of controls) {
      if (media.matches) dock.append(button);
      else marker.after(button);
    }
    onLayout();
    if (active?.isConnected && active.getClientRects().length)
      active.focus({ preventScroll: true });
  }
  media.addEventListener('change', layout);
  layout();
}
