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
  const status = document.getElementById('intro-status');
  const setStatus = (text: string) => {
    if (status) status.textContent = text;
  };
  let wasImmersive = false;

  if (enter) {
    enter.disabled = false;
    enter.textContent = world.xrEnabled ? 'Enter mixed reality' : 'Play in browser';
    setStatus(
      world.xrEnabled
        ? 'Ready. Put on your headset and sit at a desk or table.'
        : 'No XR headset detected — playing in the browser with mouse or touch.',
    );
    enter.addEventListener('click', () => {
      sfx.unlock();
      overlay?.classList.add('hidden');
      if (!world.xrEnabled) return;
      try {
        // launchXR may return a promise; a rejected session request (permission
        // denied, headset asleep) falls back to the in-browser board.
        Promise.resolve(world.launchXR() as unknown).catch(() => {
          setStatus('Could not start mixed reality. You can keep playing in the browser.');
        });
      } catch {
        setStatus('Could not start mixed reality. You can keep playing in the browser.');
      }
    });
  }

  world.visibilityState.subscribe((v) => {
    if (v !== VisibilityState.NonImmersive) {
      wasImmersive = true;
      overlay?.classList.add('hidden');
      return;
    }
    // Back from the headset: offer an easy way back in instead of a dead page.
    if (wasImmersive && enter && world.xrEnabled) {
      enter.textContent = 'Re-enter mixed reality';
      setStatus('Session ended. Your progress is saved on this device.');
      overlay?.classList.remove('hidden');
    }
  });
}).catch((err: unknown) => {
  // Without a world there is nothing to play: say so instead of hanging on "Loading…".
  console.error('[packetfall] failed to start', err);
  const enter = document.getElementById('enter-mr') as HTMLButtonElement | null;
  const status = document.getElementById('intro-status');
  if (enter) enter.textContent = 'Unavailable';
  if (status) {
    status.textContent =
      'Packetfall could not start in this browser (WebGL is required). Try the Meta Quest Browser or a recent Chrome/Edge.';
  }
});
