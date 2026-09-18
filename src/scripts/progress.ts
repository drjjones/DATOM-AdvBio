/**
 * Per-device progress, stored in localStorage only. Two records:
 *   ab:ican      { "B1.2:0": true }   which "I can" statements a student has ticked
 *   ab:progress  { "B1.2": true }     standards where every statement is ticked (fills the home page dots)
 * Nothing leaves the device.
 */
const ICAN = 'ab:ican';
const PROGRESS = 'ab:progress';

function read(key: string): Record<string, true> {
  try { return JSON.parse(localStorage.getItem(key) || '{}'); } catch { return {}; }
}
function write(key: string, value: Record<string, true>) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* storage blocked: progress lasts for the page only */ }
}

export function paintDots() {
  const p = read(PROGRESS);
  document.querySelectorAll<HTMLElement>('[data-progress-dot]').forEach((d) => d.classList.toggle('is-done', !!p[d.dataset.progressDot!]));
}

function paintChecks() {
  const c = read(ICAN);
  document.querySelectorAll<HTMLInputElement>('input[data-ican]').forEach((i) => { i.checked = !!c[i.dataset.ican!]; });
}

function recompute(code: string) {
  const boxes = Array.from(document.querySelectorAll<HTMLInputElement>(`input[data-ican^="${code}:"]`));
  const p = read(PROGRESS);
  if (boxes.length && boxes.every((b) => b.checked)) p[code] = true; else delete p[code];
  write(PROGRESS, p);
  paintDots();
}

document.addEventListener('change', (e) => {
  const box = e.target as HTMLInputElement;
  if (!box.matches('input[data-ican]')) return;
  const c = read(ICAN);
  if (box.checked) c[box.dataset.ican!] = true; else delete c[box.dataset.ican!];
  write(ICAN, c);
  recompute(box.dataset.ican!.split(':')[0]);
});

document.addEventListener('click', (e) => {
  if (!(e.target as HTMLElement).closest('[data-reset-progress]')) return;
  if (!confirm('Clear all progress and ticked statements on this device?')) return;
  try { localStorage.removeItem(ICAN); localStorage.removeItem(PROGRESS); } catch {}
  paintChecks(); paintDots();
});

paintChecks();
paintDots();
