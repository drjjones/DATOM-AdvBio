/**
 * Check for understanding: multiple choice with instant feedback. Markup comes from StandardSection.astro.
 * Correct answers are remembered per device (ab:cfu) so a student sees what they have already settled.
 */
const KEY = 'ab:cfu';
function read(): Record<string, true> { try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch { return {}; } }
function write(v: Record<string, true>) { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch { /* per page only */ } }

function paintDone() {
  const done = read();
  document.querySelectorAll<HTMLElement>('.cfu-q').forEach((q) => {
    const key = `${q.closest<HTMLElement>('[data-cfu]')?.dataset.cfu}:${q.dataset.q}`;
    if (done[key]) q.dataset.done = 'true';
  });
}

document.addEventListener('click', (e) => {
  const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('.cfu-q .choice');
  if (!btn) return;
  const q = btn.closest<HTMLElement>('.cfu-q')!;
  const answer = Number(q.dataset.answer);
  const chosen = Number(btn.dataset.option);
  const right = chosen === answer;
  q.querySelectorAll<HTMLButtonElement>('.choice').forEach((b, i) => {
    b.dataset.state = i === chosen ? (right ? 'correct' : 'wrong') : i === answer ? 'correct' : '';
    b.setAttribute('aria-pressed', String(i === chosen));
  });
  const fb = q.querySelector<HTMLElement>('[data-feedback]')!;
  fb.dataset.state = right ? 'right' : 'wrong';
  const lead = document.createElement('strong'); lead.textContent = right ? 'Right. ' : 'Not quite. ';
  fb.replaceChildren(lead, document.createTextNode(right ? fb.dataset.right ?? '' : fb.dataset.wrong ?? ''));
  if (right) {
    const done = read(); done[`${q.closest<HTMLElement>('[data-cfu]')?.dataset.cfu}:${q.dataset.q}`] = true; write(done);
    q.dataset.done = 'true';
  }
});

document.addEventListener('click', (e) => {
  if (!(e.target as HTMLElement).closest('[data-reset-progress]')) return;
  try { localStorage.removeItem(KEY); } catch {}
  document.querySelectorAll<HTMLElement>('.cfu-q').forEach((q) => { delete q.dataset.done; });
});

paintDone();
