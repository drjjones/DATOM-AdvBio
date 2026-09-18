const KEY = 'ab:theme';
const html = document.documentElement;

function apply(theme: 'dark' | 'light') {
  html.setAttribute('data-theme', theme);
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#0f1216' : '#f4f6f9');
  document.querySelectorAll<HTMLButtonElement>('[data-theme-toggle]').forEach((b) => {
    b.setAttribute('aria-label', theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme');
    b.querySelector<SVGElement>('[data-icon="moon"]')!.hidden = theme !== 'dark';
    b.querySelector<SVGElement>('[data-icon="sun"]')!.hidden = theme !== 'light';
  });
}

apply((html.getAttribute('data-theme') as 'dark' | 'light') || 'dark');

document.addEventListener('click', (e) => {
  const btn = (e.target as HTMLElement).closest('[data-theme-toggle]');
  if (!btn) return;
  const next = html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  apply(next);
  try { localStorage.setItem(KEY, next); } catch { /* private mode: theme lasts for the page only */ }
});
