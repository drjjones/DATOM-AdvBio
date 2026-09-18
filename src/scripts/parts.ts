/**
 * In presentation mode a standard section reveals its parts one step at a time: hook, model controls,
 * explanation, check, checklist. Outside presentation mode every part is visible.
 */
const html = document.documentElement;
const parts = (section: HTMLElement) => Array.from(section.querySelectorAll<HTMLElement>('[data-part]'));

function reset(section: HTMLElement) {
  parts(section).forEach((p, i) => p.classList.toggle('is-unrevealed', i > 0));
}

document.addEventListener('present:section', (e) => {
  const section = e.target as HTMLElement;
  if (section.hasAttribute('data-parts')) reset(section);
});

document.addEventListener('present:step', (e) => {
  const section = (e.target as HTMLElement).closest<HTMLElement>('[data-parts]');
  if (!section || !html.classList.contains('presenting')) return;
  const list = parts(section);
  const dir = (e as CustomEvent<number>).detail;
  if (dir > 0) {
    const next = list.find((p) => p.classList.contains('is-unrevealed'));
    if (!next) return; // all shown: let the deck move to the next section
    next.classList.remove('is-unrevealed');
    e.preventDefault();
    next.scrollIntoView({ block: 'nearest', behavior: 'auto' });
    window.dispatchEvent(new Event('resize'));
  } else {
    const shown = list.filter((p) => !p.classList.contains('is-unrevealed'));
    if (shown.length <= 1) return; // back to the previous section
    shown[shown.length - 1].classList.add('is-unrevealed');
    e.preventDefault();
  }
});
