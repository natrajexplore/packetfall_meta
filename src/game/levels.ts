/**
 * Campaign levels + the deterministic Daily Breach generator.
 *
 * A level is defined by a hidden reference `solution` (the correct ordered
 * rule stack). The expected verdict for every packet is whatever that
 * solution decides — so ANY player arrangement that produces the same
 * outcomes wins, which is how real policy review works too.
 */

import {
  APPS,
  type App,
  evaluate,
  hashSeed,
  mulberry32,
  type PacketSpec,
  pick,
  type Rule,
  type Server,
  SERVERS,
  shuffle,
  type Zone,
  ZONES,
} from './engine.ts';

export interface Level {
  id: string;
  title: string;
  /** One short line. No walls of text: the board teaches the rest. */
  brief: string;
  slots: number;
  /** Cards dealt to the player, in deck order (solution + decoys, shuffled). */
  cards: Rule[];
  solution: Rule[];
  packets: PacketSpec[];
  /** Tutorial levels get guided pulsing highlights. */
  guided?: boolean;
}

const R = (
  action: Rule['action'],
  app: Rule['app'],
  from: Rule['from'],
  to: Rule['to'],
): Rule => ({ action, app, from, to });
const P = (app: App, from: Zone, to: Server): PacketSpec => ({ app, from, to });

export const CAMPAIGN: Level[] = [
  {
    id: 'c1',
    title: '01 · OPEN FOR BUSINESS',
    brief: 'Let customers reach the WEB server. Everything else stays out.',
    slots: 1,
    solution: [R('allow', 'web', 'internet', 'web')],
    cards: [R('allow', 'web', 'internet', 'web')],
    packets: [
      P('web', 'internet', 'web'),
      P('web', 'internet', 'web'),
      P('ssh', 'internet', 'db'),
      P('web', 'internet', 'web'),
      P('smb', 'internet', 'db'),
      P('web', 'internet', 'web'),
    ],
    guided: true,
  },
  {
    id: 'c2',
    title: '02 · NOT SO FAST, ANY-ANY',
    brief: 'Only web traffic gets in. That ALLOW ANY card is a trap.',
    slots: 1,
    solution: [R('allow', 'web', 'internet', 'web')],
    cards: [R('allow', 'any', 'any', 'any'), R('allow', 'web', 'internet', 'web')],
    packets: [
      P('web', 'internet', 'web'),
      P('smb', 'internet', 'db'),
      P('web', 'internet', 'web'),
      P('ssh', 'internet', 'web'),
      P('web', 'internet', 'web'),
      P('smb', 'internet', 'web'),
      P('web', 'internet', 'web'),
    ],
  },
  {
    id: 'c3',
    title: '03 · FIRST MATCH WINS',
    brief: 'Branch admins may SSH anywhere. Nobody on the internet may.',
    slots: 2,
    solution: [R('allow', 'ssh', 'branch', 'any'), R('deny', 'ssh', 'any', 'any')],
    cards: [R('deny', 'ssh', 'any', 'any'), R('allow', 'ssh', 'branch', 'any')],
    packets: [
      P('ssh', 'branch', 'db'),
      P('ssh', 'internet', 'db'),
      P('ssh', 'branch', 'web'),
      P('ssh', 'internet', 'web'),
      P('ssh', 'branch', 'dns'),
      P('ssh', 'internet', 'dns'),
    ],
  },
  {
    id: 'c4',
    title: '04 · NAMES BEFORE NUMBERS',
    brief: 'Serve the website and keep DNS answering. Nothing else.',
    slots: 2,
    solution: [R('allow', 'web', 'internet', 'web'), R('allow', 'dns', 'any', 'dns')],
    cards: [
      R('allow', 'dns', 'any', 'dns'),
      R('allow', 'any', 'internet', 'any'),
      R('allow', 'web', 'internet', 'web'),
    ],
    packets: [
      P('dns', 'internet', 'dns'),
      P('web', 'internet', 'web'),
      P('dns', 'branch', 'dns'),
      P('smb', 'internet', 'db'),
      P('web', 'internet', 'web'),
      P('mail', 'internet', 'db'),
      P('dns', 'internet', 'dns'),
      P('ssh', 'internet', 'dns'),
    ],
  },
  {
    id: 'c5',
    title: '05 · LATERAL MOVEMENT',
    brief: 'The branch may use the DB. The internet must never touch it.',
    slots: 3,
    solution: [
      R('deny', 'any', 'internet', 'db'),
      R('allow', 'any', 'branch', 'db'),
      R('allow', 'web', 'any', 'web'),
    ],
    cards: [
      R('allow', 'web', 'any', 'web'),
      R('allow', 'any', 'branch', 'db'),
      R('deny', 'any', 'internet', 'db'),
      R('allow', 'smb', 'any', 'any'),
    ],
    packets: [
      P('smb', 'branch', 'db'),
      P('smb', 'internet', 'db'),
      P('web', 'internet', 'web'),
      P('ssh', 'internet', 'db'),
      P('ssh', 'branch', 'db'),
      P('web', 'branch', 'web'),
      P('smb', 'internet', 'web'),
      P('mail', 'internet', 'db'),
    ],
  },
  {
    id: 'c6',
    title: '06 · SHADOWED',
    brief: 'Mail flows to the DB from branch only. Block internet SSH first.',
    slots: 3,
    solution: [
      R('deny', 'ssh', 'internet', 'any'),
      R('allow', 'mail', 'branch', 'db'),
      R('allow', 'any', 'any', 'web'),
    ],
    cards: [
      R('allow', 'any', 'any', 'web'),
      R('allow', 'mail', 'any', 'db'),
      R('deny', 'ssh', 'internet', 'any'),
      R('allow', 'mail', 'branch', 'db'),
    ],
    packets: [
      P('ssh', 'internet', 'web'),
      P('mail', 'branch', 'db'),
      P('web', 'internet', 'web'),
      P('mail', 'internet', 'db'),
      P('ssh', 'branch', 'web'),
      P('ssh', 'internet', 'db'),
      P('dns', 'internet', 'web'),
      P('mail', 'branch', 'db'),
    ],
  },
];

/* ------------------------------------------------------------------ */
/* Daily Breach — one seeded puzzle per calendar day, same for everyone */
/* ------------------------------------------------------------------ */

function randomRule(rng: () => number, action: Rule['action']): Rule {
  return {
    action,
    app: rng() < 0.2 ? 'any' : pick(rng, APPS),
    from: rng() < 0.35 ? 'any' : pick(rng, ZONES),
    to: rng() < 0.3 ? 'any' : pick(rng, SERVERS),
  };
}

function allPackets(): PacketSpec[] {
  const out: PacketSpec[] = [];
  for (const app of APPS)
    for (const from of ZONES) for (const to of SERVERS) out.push({ app, from, to });
  return out;
}

function sameOutcomes(a: (Rule | null)[], b: Rule[], pk: PacketSpec[]): boolean {
  return pk.every((p) => evaluate(a, p).action === evaluate(b, p).action);
}

function describe(solution: Rule[]): string {
  return `${solution.length} rules, 1 decoy. Make every packet match its ticket in as few deploys as you can.`;
}

/** `dateKey` is YYYY-MM-DD in the player's local time zone. */
export function dailyLevel(dateKey: string): Level {
  const universe = allPackets();
  for (let attempt = 0; attempt < 200; attempt++) {
    const rng = mulberry32(hashSeed(`packetfall:${dateKey}:${attempt}`));
    const slots = 3 + (rng() < 0.4 ? 1 : 0);
    const solution: Rule[] = [];
    for (let i = 0; i < slots; i++) {
      solution.push(randomRule(rng, i === 0 || rng() < 0.4 ? 'deny' : 'allow'));
    }
    // Every rule must matter (no fully shadowed / dead rules in the answer).
    const allMatter = solution.every((_, i) => {
      const without = solution.filter((__, j) => j !== i);
      return !sameOutcomes(without, solution, universe);
    });
    if (!allMatter) continue;

    // Packet sample: mix of allowed & denied, biased to the ones order decides.
    const shuffled = shuffle(rng, universe);
    const allowed = shuffled.filter((p) => evaluate(solution, p).action === 'allow');
    const denied = shuffled.filter((p) => evaluate(solution, p).action === 'deny');
    if (allowed.length < 3 || denied.length < 3) continue;
    const packets = shuffle(rng, [...allowed.slice(0, 5), ...denied.slice(0, 5)]);

    const decoy = randomRule(rng, rng() < 0.5 ? 'allow' : 'deny');
    const cards = shuffle(rng, [...solution, decoy]);

    // Must not be solvable by dropping cards in dealt order, or by reversing.
    const naive = cards.slice(0, slots);
    if (sameOutcomes(naive, solution, packets)) continue;
    if (sameOutcomes(naive.slice().reverse(), solution, packets)) continue;
    // ...but the intended answer must be distinguishable on THIS packet set.
    return {
      id: `daily-${dateKey}`,
      title: `DAILY BREACH · ${dateKey}`,
      brief: describe(solution),
      slots,
      solution,
      cards,
      packets,
    };
  }
  // Extremely unlikely; fall back to the hardest campaign level.
  return { ...CAMPAIGN[CAMPAIGN.length - 1]!, id: `daily-${dateKey}` };
}
