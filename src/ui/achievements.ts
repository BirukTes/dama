import type { Achievement } from '../game/achievements';
export const achievementsMarkup = `<details id="achievements-settings"><summary>Optional goals <small id="achievements-count"></small></summary><p class="dialog-note">Personal achievements, with no extra unlock gates or daily streaks. Existing progress counts. Puzzle goals allow undo; Clear thinking requires no hints.</p><div id="achievements-list"></div></details>`;
export function renderAchievements(list: Achievement[]) {
  document.getElementById('achievements-count')!.textContent =
    `· ${list.filter((a) => a.earned).length} / ${list.length}`;
  const html = list
    .map(
      (a) =>
        `<article class="achievement ${a.earned ? 'earned' : ''}"><strong>${a.earned ? '✓ ' : ''}${a.title}</strong><p>${a.description}</p><progress value="${a.current}" max="${a.target}" aria-label="${a.title}"></progress><small>${a.earned ? 'Complete' : `${a.current} / ${a.target}`}</small></article>`,
    )
    .join('');
  const el = document.getElementById('achievements-list')!;
  if (el.innerHTML !== html) el.innerHTML = html;
}
