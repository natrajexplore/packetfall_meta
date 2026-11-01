/**
 * Level flow rules shared by the systems: which level to load, what happens
 * when a deploy finishes, and how progress is recorded. No rendering here.
 */

import { explain, judge, evaluate } from './engine.ts';
import { CAMPAIGN, dailyLevel, type Level } from './levels.ts';
import { recordCampaignWin, recordDailyWin, rankFor, todayKey } from './progress.ts';
import { sfx } from './sfx.ts';
import type { GameState } from './state.ts';

export function chooseLevel(g: GameState): Level {
  if (g.mode.peek() === 'daily') return dailyLevel(todayKey());
  g.levelIndex = Math.min(Math.max(g.levelIndex, 0), CAMPAIGN.length - 1);
  return CAMPAIGN[g.levelIndex]!;
}

/** Called when the last packet of a deploy has resolved. */
export function finishRun(g: GameState): void {
  const level = g.level.peek();
  if (!level) return;
  const rules = g.deployedRules;
  let firstMistake = '';
  let wrong = 0;
  level.packets.forEach((p, i) => {
    const player = evaluate(rules, p);
    const outcome = judge(player, evaluate(level.solution, p));
    g.tickets[i] = { outcome };
    if (outcome === 'breach' || outcome === 'outage') {
      wrong++;
      if (!firstMistake) firstMistake = explain(outcome, p, player, rules);
    }
  });

  g.lastWin = wrong === 0;
  if (g.lastWin) {
    const before = rankFor(g.progress.xp).title;
    g.lastStars =
      g.mode.peek() === 'daily'
        ? recordDailyWin(g.progress, todayKey(), g.deploys)
        : recordCampaignWin(g.progress, g.levelIndex, level.id, g.deploys, CAMPAIGN.length);
    const after = rankFor(g.progress.xp).title;
    const stars = '★'.repeat(g.lastStars) + '☆'.repeat(3 - g.lastStars);
    g.hint.value =
      after !== before
        ? `${stars}  PROMOTED → ${after}`
        : g.mode.peek() === 'daily'
          ? `${stars}  Daily cleared · streak ${g.progress.dailyStreak} day${g.progress.dailyStreak === 1 ? '' : 's'}`
          : `${stars}  Policy verified in ${g.deploys} deploy${g.deploys === 1 ? '' : 's'}.`;
    sfx.win();
  } else {
    g.hint.value = `SENTRY: ${wrong} ticket${wrong === 1 ? '' : 's'} failed. ${firstMistake}`;
    sfx.lose();
  }
  g.phase.value = 'result';
  g.hudVersion.value++;
}
