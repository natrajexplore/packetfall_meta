/**
 * PACKETFALL — a hands-first mixed-reality firewall puzzle.
 * Entry point: create the IWSDK world from iwsdk.config.json, then register
 * the game systems. Placement runs first so the board is on the table before
 * the first packet ever spawns.
 */

import { VisibilityState, World } from '@iwsdk/core';
import projectOptions from 'virtual:iwsdk-project';
import { sfx } from './game/sfx.ts';
import { GameSystem } from './systems/game-system.js';
import { PacketSystem } from './systems/packet-system.js';
import { PlacementSystem } from './systems/placement-system.js';

World.create(
  document.getElementById('scene-container') as HTMLDivElement,
  projectOptions,
).then((world) => {
  world.registerSystem(GameSystem);
  world.registerSystem(PacketSystem);
  world.registerSystem(PlacementSystem);

  // Dev-only handle for automated play-testing (stripped from production builds).
  if (import.meta.env.DEV) (window as unknown as { __world: World }).__world = world;

  // 2D landing overlay (desktop / Quest Browser before entering MR).
  const overlay = document.getElementById('intro');
  const enter = document.getElementById('enter-mr') as HTMLButtonElement | null;
  if (enter) {
    if (!world.xrEnabled) {
      enter.textContent = 'Play in browser emulator';
    }
    enter.addEventListener('click', () => {
      sfx.unlock();
      if (world.xrEnabled) world.launchXR();
      overlay?.classList.add('hidden');
    });
  }
  world.visibilityState.subscribe((v) => {
    if (v !== VisibilityState.NonImmersive) overlay?.classList.add('hidden');
  });
});
