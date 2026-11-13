/**
 * Canvas-texture text panels. Cheap, crisp, and they need no font assets.
 * Each label owns its canvas + texture and can be redrawn in place.
 *
 * Text auto-fits: if the wrapped lines would overflow the canvas, every line
 * is scaled down together (keeping the hierarchy) until it fits, so a long
 * SENTRY explanation never gets clipped off the bottom of a panel.
 */

import {
  CanvasTexture,
  DoubleSide,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  SRGBColorSpace,
} from '@iwsdk/core';

export interface LabelLine {
  text: string;
  size?: number; // px at canvas resolution
  color?: string;
  weight?: number;
  align?: 'left' | 'center';
}

export interface LabelStyle {
  bg?: string; // css color or '' for transparent
  border?: string;
  radius?: number;
  padding?: number;
  /** Vertical placement of the text block. Default 'top'. */
  valign?: 'top' | 'middle';
}

export interface Label {
  mesh: Mesh;
  draw(lines: LabelLine[], style?: LabelStyle): void;
}

const FONT =
  'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
const LINE_HEIGHT = 1.22;
const MIN_SCALE = 0.55;

// --- high-contrast mode -----------------------------------------------------
// Accessibility: opaque black panels, white borders, white body text, heavier
// weights. Semantic colours (allow green, deny red, warning yellow) are kept
// because ALLOW/DENY are also spelled out and tickets use ✓/✗.
let highContrast = false;
const live = new Set<{ mesh: Mesh; redraw(): void }>();
const NEUTRAL = new Set(['#9fb4ff', '#c9d4f5', '#dfe7ff', '#e8f1ff', '#7aa2ff', '#2f4eb8']);

export function isHighContrast(): boolean {
  return highContrast;
}

/** Switch mode and repaint every label that is still in the scene. */
export function setHighContrast(on: boolean): void {
  if (on === highContrast) return;
  highContrast = on;
  prune();
  for (const l of live) l.redraw();
}

function inScene(mesh: Mesh): boolean {
  let o: Mesh['parent'] | Mesh = mesh;
  while (o.parent) o = o.parent;
  return (o as { isScene?: boolean }).isScene === true;
}

/** Forget labels whose entity was disposed (their mesh left the scene). */
function prune(): void {
  for (const l of live) if (!inScene(l.mesh)) live.delete(l);
}

/** widthM/heightM in meters; pxPerM controls crispness. */
export function createLabel(widthM: number, heightM: number, pxPerM = 1400): Label {
  const canvas = document.createElement('canvas');
  canvas.width = Math.min(2048, Math.round(widthM * pxPerM));
  canvas.height = Math.min(2048, Math.round(heightM * pxPerM));
  const g = canvas.getContext('2d')!;
  const tex = new CanvasTexture(canvas);
  tex.colorSpace = SRGBColorSpace;
  tex.anisotropy = 4;
  const mat = new MeshBasicMaterial({
    map: tex,
    transparent: true,
    side: DoubleSide,
    depthWrite: false,
  });
  const mesh = new Mesh(new PlaneGeometry(widthM, heightM), mat);
  mesh.renderOrder = 10;

  const fontFor = (line: LabelLine, size: number) =>
    `${highContrast ? Math.max(700, line.weight ?? 600) : (line.weight ?? 600)} ${size}px ${FONT}`;
  let lastLines: LabelLine[] = [];
  let lastStyle: LabelStyle = {};

  /** Total text height at scale `s` (sets fonts as a side effect of measuring). */
  const measure = (lines: LabelLine[], s: number, maxW: number): number => {
    let h = 0;
    for (const line of lines) {
      const size = Math.round((line.size ?? 44) * s);
      g.font = fontFor(line, size);
      h += wrap(g, line.text, maxW).length * size * LINE_HEIGHT;
    }
    return h;
  };

  const draw = (lines: LabelLine[], style: LabelStyle = {}) => {
    lastLines = lines;
    lastStyle = style;
    const { width: W, height: H } = canvas;
    g.clearRect(0, 0, W, H);
    const pad = style.padding ?? 28;
    if (style.bg) {
      const r = style.radius ?? 28;
      g.beginPath();
      g.roundRect(4, 4, W - 8, H - 8, r);
      g.fillStyle = highContrast ? '#000000' : style.bg;
      g.fill();
      const border = highContrast && (!style.border || NEUTRAL.has(style.border)) ? '#ffffff' : style.border;
      if (border) {
        g.lineWidth = highContrast ? 8 : 6;
        g.strokeStyle = border;
        g.stroke();
      }
    }
    const maxW = W - pad * 2;
    const room = H - pad * 2;
    let s = 1;
    let textH = measure(lines, s, maxW);
    while (textH > room && s > MIN_SCALE) {
      s = Math.max(MIN_SCALE, s * 0.92);
      textH = measure(lines, s, maxW);
    }
    let y = style.valign === 'middle' ? Math.max(pad, (H - textH) / 2) : pad;
    g.textBaseline = 'top';
    for (const line of lines) {
      const size = Math.round((line.size ?? 44) * s);
      g.font = fontFor(line, size);
      const color = line.color ?? '#e8f1ff';
      g.fillStyle = highContrast && NEUTRAL.has(color) ? '#ffffff' : color;
      const align = line.align ?? 'left';
      g.textAlign = align;
      const x = align === 'center' ? W / 2 : pad;
      for (const wrapped of wrap(g, line.text, maxW)) {
        g.fillText(wrapped, x, y);
        y += size * LINE_HEIGHT;
      }
    }
    tex.needsUpdate = true;
  };

  const label = { mesh, draw };
  if (live.size > 96) prune();
  live.add({ mesh, redraw: () => draw(lastLines, lastStyle) });
  return label;
}

function wrap(g: CanvasRenderingContext2D, text: string, maxW: number): string[] {
  if (!text) return [];
  const words = text.split(' ');
  const out: string[] = [];
  let cur = '';
  for (const w of words) {
    const test = cur ? `${cur} ${w}` : w;
    if (g.measureText(test).width > maxW && cur) {
      out.push(cur);
      cur = w;
    } else cur = test;
  }
  if (cur) out.push(cur);
  return out;
}
