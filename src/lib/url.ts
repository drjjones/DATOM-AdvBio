/**
 * GitHub Pages serves a project site under /<repository>/, so every root-relative link is
 * prefixed with the base path Astro was built with (SITE_BASE, default "/").
 */
const base = import.meta.env.BASE_URL.replace(/\/+$/, '');
export const url = (path: string) => `${base}${path.startsWith('/') ? path : `/${path}`}`;
export const basePath = `${base}/`;
