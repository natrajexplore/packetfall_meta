/**
 * Board layout and procedural meshes. All positions are in BOARD-LOCAL space:
 * origin = centre of the real table surface, +X right, +Y up, +Z toward the
 * seated player. Everything interactive sits inside a ~0.45 m radius of the
 * player's hands ("airplane seat test") and inside a narrow forward cone so it
 * still fits the Meta VR Glasses field of view.
 */

import {
  BoxGeometry,
  Color,
  CylinderGeometry,
  EdgesGeometry,
  Group,
  IcosahedronGeometry,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  OctahedronGeometry,
  TorusGeometry,
  Vector3,
} from '@iwsdk/core';
import type { App, Server, Zone } from './engine.ts';

export const LAYOUT = {
  plate: { w: 0.86, d: 0.42 },
  stackX: 0,
  stackZ: -0.1,
  slotW: 0.15,
  slotH: 0.052,
  slotTopY: 0.3,
  slotGap: 0.064,
  deckZ: 0.115,
  deckSpacing: 0.12,
  card: { w: 0.112, h: 0.05, d: 0.008 },
  cardTilt: -0.62,
  tickets: new Vector3(-0.27, 0.17, -0.07),
  hud: new Vector3(0, 0.46, -0.11),
  primaryBtn: new Vector3(-0.37, 0.02, 0.1),
  modeBtn: new Vector3(0.39, 0.02, -0.03),
  recenterBtn: new Vector3(0.39, 0.02, 0.07),
  soundBtn: new Vector3(0.39, 0.02, 0.16),
  servers: {
    web: new Vector3(0.25, 0, -0.17),
    dns: new Vector3(0.3, 0, -0.08),
    db: new Vector3(0.25, 0, 0.005),
  } as Record<Server, Vector3>,
};

export const slotY = (i: number) => LAYOUT.slotTopY - i * LAYOUT.slotGap;

export const APP_COLOR: Record<App, number> = {
  web: 0x3ddc97,
  dns: 0x4cc9f0,
  ssh: 0xffd166,
  smb: 0xc77dff,
  mail: 0xf4a261,
};
export const ALLOW_COLOR = 0x2ee59d;
export const DENY_COLOR = 0xff4d6d;
export const ACCENT = 0x7aa2ff;

export function plateMesh(): Group {
  const g = new Group();
  const { w, d } = LAYOUT.plate;
  const plate = new Mesh(
    new BoxGeometry(w, 0.006, d),
    new MeshStandardMaterial({
      color: 0x0b1020,
      transparent: true,
      opacity: 0.55,
      roughness: 0.6,
    }),
  );
  plate.position.y = 0.003;
  const edge = new LineSegments(
    new EdgesGeometry(plate.geometry),
    new LineBasicMaterial({ color: ACCENT, transparent: true, opacity: 0.85 }),
  );
  edge.position.copy(plate.position);
  g.add(plate, edge);
  return g;
}

export function firewallMesh(slots: number): Group {
  const g = new Group();
  const h = slots * LAYOUT.slotGap + 0.09;
  const slab = new Mesh(
    new BoxGeometry(LAYOUT.slotW + 0.03, h, 0.02),
    new MeshStandardMaterial({ color: 0x111a33, emissive: 0x0a1230, roughness: 0.4 }),
  );
  slab.position.set(LAYOUT.stackX, slotY(slots - 1) - 0.06 + h / 2, LAYOUT.stackZ - 0.012);
  const edge = new LineSegments(
    new EdgesGeometry(slab.geometry),
    new LineBasicMaterial({ color: ACCENT }),
  );
  edge.position.copy(slab.position);
  // The implicit default-deny bar under the last slot.
  const bar = new Mesh(
    new BoxGeometry(LAYOUT.slotW, 0.012, 0.012),
    new MeshBasicMaterial({ color: DENY_COLOR, transparent: true, opacity: 0.8 }),
  );
  bar.position.set(LAYOUT.stackX, slotY(slots) + 0.02, LAYOUT.stackZ + 0.004);
  bar.name = 'default-deny';
  g.add(slab, edge, bar);
  return g;
}

export function slotMesh(): Mesh {
  const m = new Mesh(
    new BoxGeometry(LAYOUT.slotW, LAYOUT.slotH, 0.004),
    new MeshBasicMaterial({ color: ACCENT, transparent: true, opacity: 0.16 }),
  );
  const edge = new LineSegments(
    new EdgesGeometry(m.geometry),
    new LineBasicMaterial({ color: ACCENT, transparent: true, opacity: 0.9 }),
  );
  m.add(edge);
  return m;
}

export function cardMesh(allow: boolean): Mesh {
  const { w, h, d } = LAYOUT.card;
  const m = new Mesh(
    new BoxGeometry(w, h, d),
    new MeshStandardMaterial({
      color: 0x141c33,
      emissive: new Color(allow ? ALLOW_COLOR : DENY_COLOR),
      emissiveIntensity: 0.18,
      roughness: 0.35,
    }),
  );
  const edge = new LineSegments(
    new EdgesGeometry(m.geometry),
    new LineBasicMaterial({ color: allow ? ALLOW_COLOR : DENY_COLOR }),
  );
  m.add(edge);
  return m;
}

export function buttonMesh(color: number, radius = 0.038): Mesh {
  const m = new Mesh(
    new CylinderGeometry(radius, radius * 1.08, 0.02, 40),
    new MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.35 }),
  );
  return m;
}

export function serverMesh(server: Server): Group {
  const g = new Group();
  const color = server === 'db' ? 0xff9f1c : server === 'dns' ? 0x4cc9f0 : 0x3ddc97;
  const tower = new Mesh(
    new BoxGeometry(0.05, 0.09, 0.05),
    new MeshStandardMaterial({ color: 0x1a2340, emissive: color, emissiveIntensity: 0.25 }),
  );
  tower.position.y = 0.045;
  tower.name = 'tower';
  for (let i = 0; i < 3; i++) {
    const led = new Mesh(
      new BoxGeometry(0.036, 0.004, 0.002),
      new MeshBasicMaterial({ color }),
    );
    led.position.set(0, 0.025 + i * 0.022, 0.026);
    tower.add(led);
  }
  g.add(tower);
  return g;
}

/** Packet shape encodes the source zone; colour encodes the app. */
export function packetMesh(app: App, from: Zone): Mesh {
  const geo = from === 'internet' ? new IcosahedronGeometry(0.014, 0) : new OctahedronGeometry(0.015, 0);
  return new Mesh(
    geo,
    new MeshStandardMaterial({
      color: APP_COLOR[app],
      emissive: APP_COLOR[app],
      emissiveIntensity: 0.9,
      transparent: true,
      opacity: 1,
      flatShading: true,
    }),
  );
}

export function portalMesh(): Group {
  const g = new Group();
  const ring = new Mesh(
    new TorusGeometry(0.16, 0.012, 12, 64),
    new MeshBasicMaterial({ color: DENY_COLOR, transparent: true, opacity: 0.9 }),
  );
  const inner = new Mesh(
    new TorusGeometry(0.11, 0.004, 8, 48),
    new MeshBasicMaterial({ color: ACCENT, transparent: true, opacity: 0.7 }),
  );
  ring.name = 'ring';
  inner.name = 'inner';
  g.add(ring, inner);
  return g;
}
