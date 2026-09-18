/**
 * Registers the generated service worker so every visited page and all assets work offline.
 * When a newer build is found while an older one is already controlling the page, a small
 * toast offers a reload. Nothing reloads on its own: a forced refresh in the middle of a
 * lesson would be worse than showing last week's version for a few more minutes.
 */
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    const hadController = !!navigator.serviceWorker.controller;
    try {
      const base = import.meta.env.BASE_URL.endsWith('/') ? import.meta.env.BASE_URL : `${import.meta.env.BASE_URL}/`;
      const reg = await navigator.serviceWorker.register(`${base}sw.js`, { scope: base });
      reg.addEventListener('updatefound', () => {
        const sw = reg.installing;
        sw?.addEventListener('statechange', () => { if (sw.state === 'activated' && hadController) offerReload(); });
      });
    } catch (err) {
      console.error('Service worker registration failed; the site will not be available offline.', err);
    }
  });
}

function offerReload() {
  if (document.querySelector('.update-toast')) return;
  const toast = document.createElement('div');
  toast.className = 'update-toast';
  toast.setAttribute('role', 'status');
  const text = document.createElement('span');
  text.textContent = 'A newer version of this site is ready.';
  const reload = document.createElement('button');
  reload.type = 'button'; reload.className = 'btn primary'; reload.textContent = 'Reload';
  reload.addEventListener('click', () => location.reload());
  const later = document.createElement('button');
  later.type = 'button'; later.className = 'btn ghost'; later.textContent = 'Later';
  later.addEventListener('click', () => toast.remove());
  toast.append(text, reload, later);
  document.body.append(toast);
}
