// Loads the models for whichever unit the page belongs to. Units are code-split; only the one on the page loads.
const nn = document.querySelector<HTMLElement>('[data-unit]')?.dataset.unit;
if (nn === '01') import('./u01/main');
