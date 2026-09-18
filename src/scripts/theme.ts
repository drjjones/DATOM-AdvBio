/** Environment toggle: dark (projector default) or paper (DATOM's public default). Remembered per device. */
const KEY = 'ab:env';
const html = document.documentElement;
type Env = 'dark' | 'paper';

function apply(env: Env) {
  if (env === 'dark') html.setAttribute('data-env', 'dark'); else html.removeAttribute('data-env');
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', env === 'dark' ? '#101823' : '#F7F9FA');
  document.dispatchEvent(new CustomEvent('env:change', { detail: env }));
  const next: Env = env === 'dark' ? 'paper' : 'dark';
  document.querySelectorAll<HTMLButtonElement>('[data-env-toggle]').forEach((b) => {
    b.setAttribute('aria-label', `Switch to the ${next} environment`);
    const label = b.querySelector('[data-env-label]');
    if (label) label.textContent = next === 'paper' ? 'Paper' : 'Dark';
  });
}

apply(html.hasAttribute('data-env') ? 'dark' : 'paper');

document.addEventListener('click', (e) => {
  if (!(e.target as HTMLElement).closest('[data-env-toggle]')) return;
  const next: Env = html.hasAttribute('data-env') ? 'paper' : 'dark';
  apply(next);
  try { localStorage.setItem(KEY, next); } catch { /* storage blocked: the choice lasts for the page only */ }
});
