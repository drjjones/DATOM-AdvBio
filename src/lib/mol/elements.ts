/** Element data for the molecule viewer. Colors follow the chemistry convention (identity is meaning) and are
 *  tuned to read on both the paper and the dark environment. Electronegativity is Pauling. */
export interface ElementInfo { symbol: string; name: string; color: string; radius: number; en: number; valence: number; bonds: number; shells: number[] }
export const ELEMENTS: Record<string, ElementInfo> = {
  H:  { symbol: 'H',  name: 'hydrogen',   color: '#C9D3DD', radius: 0.24, en: 2.20, valence: 1, bonds: 1, shells: [1] },
  C:  { symbol: 'C',  name: 'carbon',     color: '#5B6B7C', radius: 0.34, en: 2.55, valence: 4, bonds: 4, shells: [2, 4] },
  N:  { symbol: 'N',  name: 'nitrogen',   color: '#3B6FE0', radius: 0.33, en: 3.04, valence: 5, bonds: 3, shells: [2, 5] },
  O:  { symbol: 'O',  name: 'oxygen',     color: '#E0483F', radius: 0.32, en: 3.44, valence: 6, bonds: 2, shells: [2, 6] },
  P:  { symbol: 'P',  name: 'phosphorus', color: '#F5A524', radius: 0.40, en: 2.19, valence: 5, bonds: 5, shells: [2, 8, 5] },
  S:  { symbol: 'S',  name: 'sulfur',     color: '#E5D24A', radius: 0.38, en: 2.58, valence: 6, bonds: 2, shells: [2, 8, 6] },
  Na: { symbol: 'Na', name: 'sodium',     color: '#9B6BE0', radius: 0.46, en: 0.93, valence: 1, bonds: 1, shells: [2, 8, 1] },
  Cl: { symbol: 'Cl', name: 'chlorine',   color: '#3F9A4B', radius: 0.42, en: 3.16, valence: 7, bonds: 1, shells: [2, 8, 7] },
};
export const PARTIAL = { minus: '#3B6FE0', plus: '#E0483F', neutral: '#8B94A1' } as const;
/** Color for a partial charge in [-1, 1]: blue for negative, red for positive, gray near zero. */
export function chargeColor(q: number): string {
  const t = Math.max(-1, Math.min(1, q));
  const mix = (a: string, b: string, k: number) => {
    const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16)), pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
    return '#' + pa.map((v, i) => Math.round(v + (pb[i] - v) * k).toString(16).padStart(2, '0')).join('');
  };
  return t < 0 ? mix(PARTIAL.neutral, PARTIAL.minus, -t) : mix(PARTIAL.neutral, PARTIAL.plus, t);
}
