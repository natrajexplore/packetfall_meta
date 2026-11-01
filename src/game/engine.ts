/**
 * Packetfall rule engine — pure, dependency-free, unit-testable.
 *
 * Models a stateful-firewall security policy the way real NGFWs evaluate it:
 * rules are checked top-down, the FIRST matching rule decides, and anything
 * that matches no rule hits the implicit "default deny".
 *
 * Nothing in here touches IWSDK, Three.js or the DOM, so it runs under
 * `node --test` and is shared by the campaign, the daily generator and the
 * SENTRY explainer.
 */

export const APPS = ['web', 'dns', 'ssh', 'smb', 'mail'] as const;
export const ZONES = ['internet', 'branch'] as const;
export const SERVERS = ['web', 'dns', 'db'] as const;

export type App = (typeof APPS)[number];
export type Zone = (typeof ZONES)[number];
export type Server = (typeof SERVERS)[number];
export type Action = 'allow' | 'deny';

export interface Rule {
  app: App | 'any';
  from: Zone | 'any';
  to: Server | 'any';
  action: Action;
}

export interface PacketSpec {
  app: App;
  from: Zone;
  to: Server;
}

/** -1 means "no rule matched → implicit default deny". */
export interface Verdict {
  matchIndex: number;
  action: Action;
}

export const APP_LABEL: Record<App | 'any', string> = {
  web: 'HTTPS',
  dns: 'DNS',
  ssh: 'SSH',
  smb: 'SMB',
  mail: 'SMTP',
  any: 'ANY APP',
};
export const ZONE_LABEL: Record<Zone | 'any', string> = {
  internet: 'INTERNET',
  branch: 'BRANCH',
  any: 'ANY ZONE',
};
export const SERVER_LABEL: Record<Server | 'any', string> = {
  web: 'WEB',
  dns: 'DNS',
  db: 'DB',
  any: 'ANY SERVER',
};

export function ruleMatches(rule: Rule, p: PacketSpec): boolean {
  return (
    (rule.app === 'any' || rule.app === p.app) &&
    (rule.from === 'any' || rule.from === p.from) &&
    (rule.to === 'any' || rule.to === p.to)
  );
}

/** First-match evaluation. Empty slots (null) are skipped, like disabled rules. */
export function evaluate(
  rules: ReadonlyArray<Rule | null>,
  p: PacketSpec,
): Verdict {
  for (let i = 0; i < rules.length; i++) {
    const r = rules[i];
    if (r && ruleMatches(r, p)) return { matchIndex: i, action: r.action };
  }
  return { matchIndex: -1, action: 'deny' };
}

export type Outcome = 'served' | 'blocked' | 'breach' | 'outage';

/** Compare the player's verdict to the reference policy's verdict. */
export function judge(player: Verdict, expected: Verdict): Outcome {
  if (player.action === 'allow') {
    return expected.action === 'allow' ? 'served' : 'breach';
  }
  return expected.action === 'deny' ? 'blocked' : 'outage';
}

export function ruleText(r: Rule): string {
  return `${r.action === 'allow' ? 'ALLOW' : 'DENY'} ${APP_LABEL[r.app]}`;
}
export function ruleRoute(r: Rule): string {
  return `${ZONE_LABEL[r.from]} → ${SERVER_LABEL[r.to]}`;
}
export function packetText(p: PacketSpec): string {
  return `${APP_LABEL[p.app]} · ${ZONE_LABEL[p.from]} → ${SERVER_LABEL[p.to]}`;
}

/**
 * SENTRY — the in-game analyst. Turns a wrong verdict into one plain-language
 * sentence that names the rule that fired and why, so failure teaches the
 * first-match model instead of just punishing it.
 */
export function explain(
  outcome: Outcome,
  p: PacketSpec,
  player: Verdict,
  rules: ReadonlyArray<Rule | null>,
): string {
  const what = packetText(p);
  if (outcome === 'served' || outcome === 'blocked') return '';
  if (player.matchIndex < 0) {
    return `${what} matched nothing, so default-deny dropped it. Add an ALLOW that covers it.`;
  }
  const r = rules[player.matchIndex]!;
  const n = player.matchIndex + 1;
  if (outcome === 'breach') {
    return `${what} hit rule #${n} (${ruleText(r)} ${ruleRoute(r)}) first and got in. Put a tighter DENY above it, or narrow that ALLOW.`;
  }
  return `${what} hit rule #${n} (${ruleText(r)} ${ruleRoute(r)}) first and was dropped. First match wins: move the ALLOW above it.`;
}

/* ------------------------------------------------------------------ */
/* Deterministic RNG for the daily puzzle (same puzzle for everyone). */
/* ------------------------------------------------------------------ */

export function hashSeed(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function pick<T>(rng: () => number, arr: ReadonlyArray<T>): T {
  return arr[Math.floor(rng() * arr.length)]!;
}

export function shuffle<T>(rng: () => number, arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}
