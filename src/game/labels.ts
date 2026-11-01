/**
 * Canvas-texture text panels. Cheap, crisp, and they need no font assets.
 * Each label owns its canvas + texture and can be redrawn in place.
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
}

export interface Label {
  mesh: Mesh;
  draw(lines: LabelLine[], style?: LabelStyle): void;
}

const FONT =
  'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

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

  const draw = (lines: LabelLine[], style: LabelStyle = {}) => {
    const { width: W, height: H } = canvas;
    g.clearRect(0, 0, W, H);
    const pad = style.padding ?? 28;
    if (style.bg) {
      const r = style.radius ?? 28;
      g.beginPath();
      g.roundRect(4, 4, W - 8, H - 8, r);
      g.fillStyle = style.bg;
      g.fill();
      if (style.border) {
        g.lineWidth = 6;
        g.strokeStyle = style.border;
        g.stroke();
      }
    }
    let y = pad;
    for (const line of lines) {
      const size = line.size ?? 44;
      g.font = `${line.weight ?? 600} ${size}px ${FONT}`;
      g.fillStyle = line.color ?? '#e8f1ff';
      g.textBaseline = 'top';
      const align = line.align ?? 'left';
      g.textAlign = align;
      const x = align === 'center' ? W / 2 : pad;
      for (const wrapped of wrap(g, line.text, W - pad * 2)) {
        g.fillText(wrapped, x, y);
        y += size * 1.22;
      }
    }
    tex.needsUpdate = true;
  };

  return { mesh, draw };
}

function wrap(g: CanvasRenderingContext2D, text: string, maxW: number): string[] {
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
