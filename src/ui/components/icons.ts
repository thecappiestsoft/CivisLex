/**
 * Ikony SVG (inline, bez zewnętrznych zasobów — działa offline).
 * Stroke icons, 24×24, currentColor.
 */

import { svg } from '../../utils/dom';

const wrap = (paths: string) =>
  `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${paths}</svg>`;

const ICONS = {
  sun: '<circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2.2M12 19.3v2.2M4.6 4.6l1.6 1.6M17.8 17.8l1.6 1.6M2.5 12h2.2M19.3 12h2.2M4.6 19.4l1.6-1.6M17.8 6.2l1.6-1.6"/>',
  moon: '<path d="M20.5 14.2A8.5 8.5 0 0 1 9.8 3.5a8.5 8.5 0 1 0 10.7 10.7Z"/>',
  scale: '<path d="M12 3v18M7 21h10M5 7h14M12 7 12 5"/><path d="M5 7 2.5 13a3 3 0 0 0 5 0L5 7ZM19 7l-2.5 6a3 3 0 0 0 5 0L19 7Z"/>',
  calendar: '<rect x="3.5" y="5" width="17" height="15.5" rx="2"/><path d="M3.5 9.5h17M8 3v4M16 3v4"/>',
  book: '<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5v-15Z"/><path d="M4 20.5A2.5 2.5 0 0 0 6.5 23H20v-5"/>',
  lock: '<rect x="4.5" y="10.5" width="15" height="10" rx="2"/><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3"/>',
  unlock: '<rect x="4.5" y="10.5" width="15" height="10" rx="2"/><path d="M8 10.5V7.5a4 4 0 0 1 7.6-1.7"/>',
  list: '<path d="M8 6h12M8 12h12M8 18h12"/><circle cx="4" cy="6" r=".9"/><circle cx="4" cy="12" r=".9"/><circle cx="4" cy="18" r=".9"/>',
  arrowLeft: '<path d="M19 12H5M11 18l-6-6 6-6"/>',
  arrowRight: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  check: '<path d="m4.5 12.5 5 5 10-11"/>',
  x: '<path d="M6 6l12 12M18 6 6 18"/>',
  alert: '<path d="M12 3 2 20.5h20L12 3Z"/><path d="M12 10v4.5M12 17.6v.2"/>',
  wand: '<path d="m4 20 11-11M14 4v3M18.5 5.5l-2 2M20 10h-3M12.5 2.5l.6 1.6"/><path d="m13 7 4 4"/>',
  download: '<path d="M12 3.5v12M7 11l5 5 5-5M4.5 20.5h15"/>',
  printer: '<path d="M7 8.5V3.5h10v5"/><rect x="3.5" y="8.5" width="17" height="8" rx="1.8"/><path d="M7 14h10v6.5H7z"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  trash: '<path d="M4.5 7h15M9.5 7V4.5h5V7M6.5 7l1 13h9l1-13"/>',
  search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m20 20-4.8-4.8"/>',
  refresh: '<path d="M20 11a8 8 0 0 0-14.5-4.5L4 8M4 4v4h4M4 13a8 8 0 0 0 14.5 4.5L20 16M20 20v-4h-4"/>',
  upload: '<path d="M12 16V4M7 9l5-5 5 5M4.5 20.5h15"/>',
  eraser: '<path d="m7 21-4-4 11-11 7 7-8 8H7ZM10 10l7 7M3 21h18"/>',
  doc: '<path d="M6 2.5h8.5L19 7v14.5H6z"/><path d="M14 2.5V7h5M9 12h7M9 16h7"/>',
  shield: '<path d="M12 3 4.5 6v6c0 4.5 3.2 7.8 7.5 9 4.3-1.2 7.5-4.5 7.5-9V6L12 3Z"/><path d="m9 12 2 2 4-4"/>',
  paperclip: '<path d="M20 11.5 12.2 19.3a5 5 0 0 1-7-7l8-8a3.3 3.3 0 0 1 4.7 4.7l-7.9 8a1.6 1.6 0 0 1-2.3-2.3l7.2-7.2"/>',
  idcard: '<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="11" r="2.3"/><path d="M5.8 16.5c.6-1.8 1.8-2.6 3.2-2.6s2.6.8 3.2 2.6M14.5 10h4M14.5 13.5h3"/>',
  quiz: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.6 2.2c-.7.4-1.1.9-1.1 1.8M12 16.8v.2"/>',
} as const;

export type IconName = keyof typeof ICONS;

export function icon(name: IconName, size = 20): SVGElement {
  const el = svg(wrap(ICONS[name]));
  el.setAttribute('width', String(size));
  el.setAttribute('height', String(size));
  return el;
}
