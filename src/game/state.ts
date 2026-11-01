/**
 * Cross-system game state, stored once in `world.globals.game`.
 * Systems stay stateless about entities (they use queries); this object holds
 * only the game-level facts several systems need to agree on.
 */

import { signal, Vector3, type Entity, type World } from '@iwsdk/core';
import type { Outcome, Rule } from './engine.ts';
import type { Level } from './levels.ts';
import { loadProgress, type Progress } from './progress.ts';

export type Phase = 'build' | 'running' | 'result';
export type Mode = 'campaign' | 'daily';

export interface TicketResult {
  outcome: Outcome | null;
}

export class GameState {
  mode = signal<Mode>('campaign');
  levelIndex = 0;
  level = signal<Level | null>(null);
  phase = signal<Phase>('build');
  /** Entity index of the selected rule card, or -1. */
  selectedCard = signal<number>(-1);
  deploys = 0;
  /** Rules frozen at deploy time, in slot order. */
  deployedRules: (Rule | null)[] = [];
  /** Per-packet result for the ticket panel. */
  tickets: TicketResult[] = [];
  spawnQueue: number[] = [];
  spawnTimer = 0;
  inFlight = 0;
  /** SENTRY's one-line explanation of the first mistake (or praise). */
  hint = signal<string>('');
  /** Bumped whenever HUD/tickets need a redraw. */
  hudVersion = signal(0);
  lastWin = false;
  lastStars = 0;
  progress: Progress = loadProgress();
  board: Entity | null = null;
  /** World-space spawn point for packets (on a real wall when one is found). */
  portalWorld = new Vector3(-0.62, 1.02, -1.45);
  placed = signal(false);
  requestPlacement = signal(0);
  paused = false;
  /** Per-slot hit flash (1 → 0) and whether the hit was an ALLOW. */
  slotFlash: number[] = new Array<number>(8).fill(0);
  slotFlashAllow: boolean[] = new Array<boolean>(8).fill(false);
  defaultDenyFlash = 0;
}

export function game(world: World): GameState {
  const g = world.globals as Record<string, unknown>;
  if (!g.game) g.game = new GameState();
  return g.game as GameState;
}
