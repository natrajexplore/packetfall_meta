/**
 * Persistent progression — the "reason to come back".
 * Stored per-device in localStorage, wrapped so a private window, blocked
 * storage or a thrown accessor never breaks the game.
 */

export interface Progress {
  unlocked: number; // highest campaign index unlocked
  stars: Record<string, number>; // level id -> best stars (1..3)
  xp: number;
  dailyStreak: number;
  lastDaily: string; // YYYY-MM-DD of last solved daily
  dailyBest: Record<string, number>; // date -> fewest deploys
}

const KEY = 'packetfall.progress.v1';

const EMPTY: Progress = {
  unlocked: 0,
  stars: {},
  xp: 0,
  dailyStreak: 0,
  lastDaily: '',
  dailyBest: {},
};

export const RANKS = [
  { xp: 0, title: 'SOC INTERN' },
  { xp: 400, title: 'SOC ANALYST' },
  { xp: 1200, title: 'NETWORK ENGINEER' },
  { xp: 2500, title: 'SECURITY ENGINEER' },
  { xp: 4500, title: 'SECURITY ARCHITECT' },
  { xp: 7500, title: 'ZERO-TRUST LEGEND' },
];

export function rankFor(xp: number): { title: string; next: number | null } {
  let idx = 0;
  for (let i = 0; i < RANKS.length; i++) if (xp >= RANKS[i]!.xp) idx = i;
  const next = RANKS[idx + 1]?.xp ?? null;
  return { title: RANKS[idx]!.title, next };
}

function emptyProgress(): Progress {
  return { ...EMPTY, stars: {}, dailyBest: {} };
}

export function loadProgress(): Progress {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return emptyProgress();
    const parsed = JSON.parse(raw) as Partial<Progress> | null;
    if (!parsed || typeof parsed !== 'object') return emptyProgress();
    // Fresh nested objects so a partial save never aliases the EMPTY defaults.
    return {
      ...emptyProgress(),
      ...parsed,
      stars: { ...(parsed.stars ?? {}) },
      dailyBest: { ...(parsed.dailyBest ?? {}) },
      unlocked: Number.isFinite(parsed.unlocked) ? Math.max(0, parsed.unlocked as number) : 0,
      xp: Number.isFinite(parsed.xp) ? Math.max(0, parsed.xp as number) : 0,
    };
  } catch {
    return emptyProgress();
  }
}

const MUTE_KEY = 'packetfall.muted.v1';

export function loadMuted(): boolean {
  try {
    return localStorage.getItem(MUTE_KEY) === '1';
  } catch {
    return false;
  }
}

export function saveMuted(m: boolean): void {
  try {
    localStorage.setItem(MUTE_KEY, m ? '1' : '0');
  } catch {
    /* storage unavailable */
  }
}

export function saveProgress(p: Progress): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    /* storage unavailable: progress lasts for this session only */
  }
}

export function todayKey(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function yesterdayKey(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return todayKey(d);
}

/** Stars: 3 = solved on first deploy, 2 = second, 1 = later. */
export function starsForDeploys(deploys: number): number {
  return deploys <= 1 ? 3 : deploys === 2 ? 2 : 1;
}

export function recordCampaignWin(
  p: Progress,
  levelIndex: number,
  levelId: string,
  deploys: number,
  campaignLength: number,
): number {
  const stars = starsForDeploys(deploys);
  const prev = p.stars[levelId] ?? 0;
  if (stars > prev) {
    p.xp += (stars - prev) * 100;
    p.stars[levelId] = stars;
  }
  p.unlocked = Math.min(Math.max(p.unlocked, levelIndex + 1), campaignLength - 1);
  saveProgress(p);
  return stars;
}

export function recordDailyWin(p: Progress, dateKey: string, deploys: number): number {
  const stars = starsForDeploys(deploys);
  const firstSolveToday = p.lastDaily !== dateKey;
  if (firstSolveToday) {
    p.dailyStreak = p.lastDaily === yesterdayKey() ? p.dailyStreak + 1 : 1;
    p.lastDaily = dateKey;
    p.xp += 150 + stars * 50 + Math.min(p.dailyStreak, 10) * 25;
  }
  const best = p.dailyBest[dateKey];
  if (best === undefined || deploys < best) p.dailyBest[dateKey] = deploys;
  saveProgress(p);
  return stars;
}
