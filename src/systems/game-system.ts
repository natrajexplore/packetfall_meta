/**
 * GameSystem — builds the board, owns rule-card interaction, buttons and HUD.
 *
 * Interaction model (hands-first, works identically for every input):
 *   pinch a card  → it lifts and glows (selected)
 *   pinch a slot  → the card snaps into the rule stack
 *   pinch a placed card → it returns to the deck
 *   pinch DEPLOY  → packets stream in from the real wall
 * Every target is a RayInteractable, so the same flow works with a hand ray
 * pinch on Quest, gaze + pinch on Meta VR Glasses, a controller trigger, or a
 * mouse in the browser emulator — no controller is ever required.
 *
 * Every interactable reacts to hover (it grows / brightens) so the player
 * always knows what a pinch will hit before they commit.
 */

import {
  createSystem,
  type Entity,
  Hovered,
  type Mesh,
  type MeshBasicMaterial,
  type MeshStandardMaterial,
  Pressed,
  RayInteractable,
  Vector3,
  VisibilityState,
} from '@iwsdk/core';
import { BoardRoot, RuleCard, RuleSlot, ServerNode, UIButton } from '../components.js';
import {
  ACCENT,
  ALLOW_COLOR,
  DENY_COLOR,
  buttonMesh,
  cardMesh,
  firewallMesh,
  LAYOUT,
  plateMesh,
  portalMesh,
  serverMesh,
  slotMesh,
  slotY,
} from '../game/board.ts';
import { APP_LABEL, evaluate, ruleRoute, ruleText, SERVERS, SERVER_LABEL } from '../game/engine.ts';
import { chooseLevel } from '../game/flow.ts';
import { createLabel, type Label, type LabelLine } from '../game/labels.ts';
import { CAMPAIGN, type Level } from '../game/levels.ts';
import { loadMuted, rankFor, saveMuted, todayKey } from '../game/progress.ts';
import { sfx } from '../game/sfx.ts';
import { game, type GameState } from '../game/state.ts';

type ButtonAction = 'primary' | 'mode' | 'recenter' | 'sound';

/** Primary-button colours per state: one glance tells you what a pinch does. */
const PRIMARY_DEPLOY = ALLOW_COLOR;
const PRIMARY_RUNNING = 0x55607f;
const PRIMARY_RETRY = 0xffb347;
const PRIMARY_NEXT = ACCENT;
const NEUTRAL_BTN = 0x8892b0;

const HOVER_CARD = 1.06;
const HOVER_BUTTON = 1.1;

export class GameSystem extends createSystem({
  boards: { required: [BoardRoot] },
  cards: { required: [RuleCard] },
  slots: { required: [RuleSlot] },
  buttons: { required: [UIButton] },
  servers: { required: [ServerNode] },
  cardPressed: { required: [RuleCard, Pressed] },
  slotPressed: { required: [RuleSlot, Pressed] },
  buttonPressed: { required: [UIButton, Pressed] },
}) {
  private g!: GameState;
  private hud!: Label;
  private tickets!: Label;
  private buttonLabels = new Map<ButtonAction, Label>();
  private buttonMats = new Map<ButtonAction, MeshStandardMaterial>();
  private firewall: Entity | null = null;
  private denyBar: Mesh | null = null;
  private portal: Entity | null = null;
  private portalRing: MeshBasicMaterial | null = null;
  private target = new Vector3();
  private clock = 0;
  private filled: boolean[] = new Array<boolean>(8).fill(false);
  /** True while the HUD is showing the "pick a card first" nudge. */
  private nudging = false;

  init(): void {
    this.g = game(this.world);
    const g = this.g;
    g.levelIndex = Math.min(g.progress.unlocked, CAMPAIGN.length - 1);
    sfx.setMuted(loadMuted());

    // --- persistent board -------------------------------------------------
    const board = this.world.createTransformEntity(plateMesh(), { persistent: true });
    board.addComponent(BoardRoot);
    board.object3D!.position.set(0, 0.72, -0.5);
    g.board = board;

    const portalObj = portalMesh();
    this.portalRing = ((portalObj.getObjectByName('ring') as Mesh | undefined)?.material ??
      null) as MeshBasicMaterial | null;
    this.portal = this.world.createTransformEntity(portalObj, { persistent: true });
    this.portal.object3D!.position.copy(g.portalWorld);

    this.hud = createLabel(0.46, 0.14, 2600);
    this.hud.mesh.position.copy(LAYOUT.hud);
    this.world.createTransformEntity(this.hud.mesh, { parent: board, persistent: true });

    this.tickets = createLabel(0.2, 0.3, 2600);
    this.tickets.mesh.position.copy(LAYOUT.tickets);
    this.tickets.mesh.rotation.y = 0.32;
    this.world.createTransformEntity(this.tickets.mesh, { parent: board, persistent: true });

    for (const server of SERVERS) {
      const mesh = serverMesh(server);
      mesh.position.copy(LAYOUT.servers[server]);
      const e = this.world.createTransformEntity(mesh, { parent: board, persistent: true });
      e.addComponent(ServerNode, { server });
      const lbl = createLabel(0.08, 0.026, 2600);
      lbl.draw([{ text: SERVER_LABEL[server], size: 46, weight: 800, align: 'center' }], {
        bg: 'rgba(8,12,28,0.85)',
        radius: 18,
        padding: 8,
        valign: 'middle',
      });
      lbl.mesh.position.set(0, 0.11, 0);
      mesh.add(lbl.mesh);
    }

    this.makeButton('primary', LAYOUT.primaryBtn, PRIMARY_DEPLOY, 0.045);
    this.makeButton('mode', LAYOUT.modeBtn, ACCENT, 0.028);
    this.makeButton('recenter', LAYOUT.recenterBtn, NEUTRAL_BTN, 0.028);
    this.makeButton('sound', LAYOUT.soundBtn, NEUTRAL_BTN, 0.02);

    // --- interaction ------------------------------------------------------
    this.queries.cardPressed.subscribe('qualify', (e) => this.onCard(e));
    this.queries.slotPressed.subscribe('qualify', (e) => this.onSlot(e));
    this.queries.buttonPressed.subscribe('qualify', (e) => {
      sfx.unlock();
      this.onButton(e.getValue(UIButton, 'action') as ButtonAction);
    });

    this.cleanupFuncs.push(
      g.hudVersion.subscribe(() => this.redraw()),
      g.hint.subscribe(() => this.redraw()),
      g.phase.subscribe(() => this.redraw()),
      g.selectedCard.subscribe(() => this.redraw()),
      this.world.visibilityState.subscribe((v) => {
        // Clean pause/resume: headset off or system menu up → freeze the sim.
        g.paused = v === VisibilityState.Hidden || v === VisibilityState.VisibleBlurred;
      }),
    );

    this.loadLevel();

    // Dev-only automation hook: drives the exact same handlers a pinch does.
    if (import.meta.env.DEV) {
      (window as unknown as { __pf: unknown }).__pf = {
        press: (name: string) => {
          for (const e of this.queries.cards.entities) if (e.object3D?.name === name) return this.onCard(e);
          for (const e of this.queries.slots.entities) if (e.object3D?.name === name) return this.onSlot(e);
          if (name.startsWith('btn-')) return this.onButton(name.slice(4) as ButtonAction);
        },
      };
    }
  }

  // ------------------------------------------------------------------------
  private makeButton(action: ButtonAction, pos: Vector3, color: number, r: number) {
    const mesh = buttonMesh(color, r);
    mesh.name = `btn-${action}`;
    mesh.position.copy(pos);
    const e = this.world.createTransformEntity(mesh, { parent: this.g.board!, persistent: true });
    e.addComponent(UIButton, { action });
    e.addComponent(RayInteractable);
    this.buttonMats.set(action, mesh.material as MeshStandardMaterial);
    const lbl = createLabel(action === 'primary' ? 0.14 : 0.1, 0.03, 2600);
    lbl.mesh.position.set(0, 0.035, 0);
    lbl.mesh.rotation.x = LAYOUT.cardTilt;
    mesh.add(lbl.mesh);
    this.buttonLabels.set(action, lbl);
  }

  loadLevel(): void {
    const g = this.g;
    // Tear down level-scoped entities (dispose frees GPU memory).
    for (const e of [...this.queries.cards.entities]) e.dispose();
    for (const e of [...this.queries.slots.entities]) e.dispose();
    this.firewall?.dispose();
    this.firewall = null;
    this.denyBar = null;
    g.slotFlash.fill(0);
    g.defaultDenyFlash = 0;
    this.nudging = false;

    const level = chooseLevel(g);
    g.level.value = level;
    g.deploys = 0;
    g.lastWin = false;
    g.tickets = level.packets.map(() => ({ outcome: null }));
    g.selectedCard.value = -1;
    g.phase.value = 'build';
    // The brief is always on the HUD; the hint line is for live guidance only.
    g.hint.value = level.guided
      ? 'Pinch the glowing rule card, then pinch the empty slot in the firewall.'
      : '';

    const board = g.board!;
    const wall = firewallMesh(level.slots);
    this.denyBar = (wall.getObjectByName('default-deny') as Mesh | undefined) ?? null;
    this.firewall = this.world.createTransformEntity(wall, { parent: board });

    for (let i = 0; i < level.slots; i++) {
      const m = slotMesh();
      m.name = `slot-${i}`;
      m.position.set(LAYOUT.stackX, slotY(i), LAYOUT.stackZ);
      const lbl = createLabel(0.03, 0.03, 2600);
      lbl.draw([{ text: `#${i + 1}`, size: 40, weight: 800, color: '#9fb4ff', align: 'center' }], {
        valign: 'middle',
        padding: 4,
      });
      lbl.mesh.position.set(-LAYOUT.slotW / 2 - 0.02, 0, 0.003);
      m.add(lbl.mesh);
      const e = this.world.createTransformEntity(m, { parent: board });
      e.addComponent(RuleSlot, { index: i });
      e.addComponent(RayInteractable);
    }

    level.cards.forEach((rule, i) => {
      const m = cardMesh(rule.action === 'allow');
      m.name = `card-${i}`;
      const lbl = createLabel(LAYOUT.card.w * 0.94, LAYOUT.card.h * 0.86, 4200);
      lbl.draw(
        [
          {
            text: ruleText(rule),
            size: 46,
            weight: 800,
            color: rule.action === 'allow' ? '#5dffb8' : '#ff8199',
            align: 'center',
          },
          { text: ruleRoute(rule), size: 34, weight: 600, color: '#dfe7ff', align: 'center' },
        ],
        { padding: 16, valign: 'middle' },
      );
      lbl.mesh.position.z = LAYOUT.card.d / 2 + 0.0006;
      m.add(lbl.mesh);
      // Start where the deck will lay it out, so it does not fly in from 0,0,0.
      m.position.set((i - (level.cards.length - 1) / 2) * LAYOUT.deckSpacing, 0.03, LAYOUT.deckZ);
      m.rotation.x = LAYOUT.cardTilt;
      const e = this.world.createTransformEntity(m, { parent: board });
      e.addComponent(RuleCard, { rule: i, slot: -1 });
      e.addComponent(RayInteractable);
    });

    g.hudVersion.value++;
  }

  // ------------------------------------------------------------------------
  private onCard(e: Entity): void {
    const g = this.g;
    if (g.phase.peek() === 'running') {
      g.hint.value = 'Deploy in progress — watch the packets. Rules unlock when it finishes.';
      return;
    }
    if (g.phase.peek() === 'result') g.phase.value = 'build';
    sfx.unlock();
    const rule = e.getValue(RuleCard, 'rule') as number;
    const slot = e.getValue(RuleCard, 'slot') as number;
    if (slot >= 0) {
      // Pull a placed card back to the deck.
      e.setValue(RuleCard, 'slot', -1);
      g.selectedCard.value = -1;
      sfx.deselect();
      g.hudVersion.value++;
      return;
    }
    if (this.nudging) {
      this.nudging = false;
      g.hint.value = '';
    }
    if (g.selectedCard.peek() === rule) {
      g.selectedCard.value = -1;
      sfx.deselect();
    } else {
      g.selectedCard.value = rule;
      sfx.select();
    }
  }

  private onSlot(e: Entity): void {
    const g = this.g;
    if (g.phase.peek() === 'running') return;
    if (g.phase.peek() === 'result') g.phase.value = 'build';
    const sel = g.selectedCard.peek();
    const index = e.getValue(RuleSlot, 'index') as number;
    if (sel < 0) {
      // Pinching an occupied slot returns its card — same as pinching the card.
      for (const c of this.queries.cards.entities) {
        if (c.getValue(RuleCard, 'slot') === index) {
          c.setValue(RuleCard, 'slot', -1);
          sfx.deselect();
          g.hudVersion.value++;
          return;
        }
      }
      this.nudging = true;
      g.hint.value = 'Pick a rule card first, then the slot you want it in.';
      return;
    }
    for (const c of this.queries.cards.entities) {
      if (c.getValue(RuleCard, 'slot') === index) c.setValue(RuleCard, 'slot', -1); // bump occupant
    }
    for (const c of this.queries.cards.entities) {
      if (c.getValue(RuleCard, 'rule') === sel) c.setValue(RuleCard, 'slot', index);
    }
    g.selectedCard.value = -1;
    sfx.place();
    const level = g.level.peek();
    if (level?.guided) g.hint.value = 'Now pinch DEPLOY and watch the firewall work.';
    g.hudVersion.value++;
  }

  private onButton(action: ButtonAction): void {
    const g = this.g;
    if (action === 'sound') {
      const muted = !sfx.isMuted();
      sfx.setMuted(muted);
      saveMuted(muted);
      if (!muted) sfx.select();
      g.hudVersion.value++;
      return;
    }
    if (action === 'recenter') {
      sfx.select();
      if (!g.level.peek()?.guided && g.phase.peek() === 'build') g.hint.value = 'Looking for your table…';
      g.requestPlacement.value++;
      return;
    }
    if (g.phase.peek() === 'running') return;
    if (action === 'mode') {
      g.mode.value = g.mode.peek() === 'campaign' ? 'daily' : 'campaign';
      sfx.select();
      this.loadLevel();
      return;
    }
    // primary
    const phase = g.phase.peek();
    if (phase === 'result' && g.lastWin) {
      sfx.select();
      if (g.mode.peek() === 'campaign') {
        if (this.isFinalCampaignLevel()) {
          // Campaign beaten: graduate to today's Daily Breach instead of looping.
          g.mode.value = 'daily';
        } else {
          g.levelIndex = g.levelIndex + 1;
        }
      } else {
        g.mode.value = 'campaign';
      }
      this.loadLevel();
      return;
    }
    if (phase === 'result') {
      g.phase.value = 'build'; // keep the arrangement, let them fix it
      return;
    }
    this.deploy();
  }

  private isFinalCampaignLevel(): boolean {
    return this.g.mode.peek() === 'campaign' && this.g.levelIndex >= CAMPAIGN.length - 1;
  }

  private deploy(): void {
    const g = this.g;
    const level = g.level.peek();
    if (!level) return;
    const rules = new Array(level.slots).fill(null);
    let placed = 0;
    for (const c of this.queries.cards.entities) {
      const slot = c.getValue(RuleCard, 'slot') as number;
      if (slot >= 0) {
        rules[slot] = level.cards[c.getValue(RuleCard, 'rule') as number]!;
        placed++;
      }
    }
    if (placed === 0) {
      this.nudging = true;
      g.hint.value = 'An empty firewall drops everything. Place at least one rule.';
      sfx.deselect();
      return;
    }
    this.nudging = false;
    g.deployedRules = rules;
    g.deploys++;
    g.tickets = level.packets.map(() => ({ outcome: null }));
    g.spawnQueue = level.packets.map((_, i) => i);
    g.spawnTimer = 0.5;
    g.selectedCard.value = -1;
    g.phase.value = 'running';
    g.hint.value = `Deploy #${g.deploys} live. Gaze at a packet to inspect it, pinch it to slow time.`;
    sfx.deploy();
  }

  // ------------------------------------------------------------------------
  private redraw(): void {
    const g = this.g;
    const level = g.level.peek();
    if (!level || !this.hud) return;
    const phase = g.phase.peek();
    const rank = rankFor(g.progress.xp);
    const isDaily = g.mode.peek() === 'daily';

    const best = isDaily ? 0 : g.progress.stars[level.id] ?? 0;
    const where = isDaily
      ? `DAILY · best ${g.progress.dailyBest[todayKey()] ?? '—'} deploy${g.progress.dailyBest[todayKey()] === 1 ? '' : 's'}`
      : `LEVEL ${g.levelIndex + 1}/${CAMPAIGN.length}  ${'★'.repeat(best)}${'☆'.repeat(3 - best)}`;
    const nextXp = rank.next !== null ? ` / ${rank.next}` : '';
    const streak = g.progress.dailyStreak ? ` · ${g.progress.dailyStreak}-day streak` : '';

    const hint = g.hint.peek();
    const failed = phase === 'result' && !g.lastWin;
    const won = phase === 'result' && g.lastWin;
    const lines: LabelLine[] = [
      { text: level.title, size: 46, weight: 800, color: '#ffffff' },
      { text: level.brief, size: 30, weight: 600, color: '#c9d4f5' },
    ];
    if (hint) {
      lines.push({
        text: hint,
        size: 32,
        weight: 700,
        color: failed ? '#ffb3c1' : won ? '#5dffb8' : '#ffe08a',
      });
    }
    lines.push({
      text: `${where}   ·   ${rank.title} ${g.progress.xp}${nextXp} XP${streak}`,
      size: 24,
      weight: 600,
      color: '#9fb4ff',
    });
    const border = failed ? '#ff4d6d' : won ? '#2ee59d' : '#2f4eb8';
    this.hud.draw(lines, { bg: 'rgba(8,12,28,0.9)', border, radius: 30, padding: 24 });

    // Change tickets: what each packet SHOULD do, and how it actually went.
    let ok = 0;
    let done = 0;
    for (const tk of g.tickets) {
      if (tk.outcome == null) continue;
      done++;
      if (tk.outcome === 'served' || tk.outcome === 'blocked') ok++;
    }
    const t: LabelLine[] = [
      {
        text: done ? `TICKETS  ${ok}/${level.packets.length}` : 'CHANGE TICKETS',
        size: 40,
        weight: 800,
        color: done && ok < done ? '#ff8199' : done ? '#5dffb8' : '#9fb4ff',
      },
    ];
    level.packets.forEach((p, i) => {
      const expectAllow = expectedAllow(level, i);
      const res = g.tickets[i]?.outcome;
      const mark = res == null ? '·' : res === 'served' || res === 'blocked' ? '✓' : '✗';
      const color = res == null ? '#c9d4f5' : mark === '✓' ? '#5dffb8' : '#ff8199';
      const why = res === 'breach' ? ' BREACH' : res === 'outage' ? ' OUTAGE' : '';
      t.push({
        text: `${mark} ${expectAllow ? 'PASS ' : 'BLOCK'}  ${APP_LABEL[p.app]} ${p.from === 'internet' ? 'INET' : 'BRCH'}→${SERVER_LABEL[p.to]}${why}`,
        size: level.packets.length > 8 ? 26 : 30,
        weight: 650,
        color,
      });
    });
    this.tickets.draw(t, { bg: 'rgba(8,12,28,0.88)', border: '#2f4eb8', radius: 26, padding: 22 });

    let primary = 'DEPLOY';
    let primaryColor = PRIMARY_DEPLOY;
    if (phase === 'running') {
      primary = 'RUNNING…';
      primaryColor = PRIMARY_RUNNING;
    } else if (won) {
      primary = this.isFinalCampaignLevel() ? 'DAILY ▶' : g.mode.peek() === 'daily' ? 'CAMPAIGN ▶' : 'NEXT ▶';
      primaryColor = PRIMARY_NEXT;
    } else if (failed) {
      primary = 'FIX & RETRY';
      primaryColor = PRIMARY_RETRY;
    }
    this.drawButton('primary', primary);
    this.tintButton('primary', primaryColor);
    this.drawButton('mode', isDaily ? 'CAMPAIGN' : `DAILY ${todayKey().slice(5)}`);
    this.tintButton('mode', phase === 'running' ? PRIMARY_RUNNING : ACCENT);
    this.drawButton('recenter', 'RECENTER');
    this.drawButton('sound', sfx.isMuted() ? 'SOUND OFF' : 'SOUND ON');
    this.tintButton('sound', sfx.isMuted() ? 0x4a5170 : NEUTRAL_BTN);
  }

  private drawButton(action: ButtonAction, text: string): void {
    this.buttonLabels.get(action)?.draw(
      [{ text, size: action === 'primary' ? 44 : 34, weight: 800, align: 'center' }],
      { bg: 'rgba(8,12,28,0.8)', radius: 16, padding: 8, valign: 'middle' },
    );
  }

  private tintButton(action: ButtonAction, color: number): void {
    const mat = this.buttonMats.get(action);
    if (!mat) return;
    mat.color.setHex(color);
    mat.emissive.setHex(color);
  }

  // ------------------------------------------------------------------------
  update(delta: number): void {
    const g = this.g;
    const level = g.level.peek();
    if (!level) return;
    this.clock += delta;
    const k = Math.min(1, delta * 12);
    const sel = g.selectedCard.peek();
    const phase = g.phase.peek();

    // Lay out deck cards in rule order; slotted cards stand in the stack.
    let deckCount = 0;
    for (const c of this.queries.cards.entities) if ((c.getValue(RuleCard, 'slot') as number) < 0) deckCount++;
    let deckIdx = 0;
    let anyDeck = false;
    let allSlotsFilled = true;
    const filled = this.filled;
    filled.fill(false);
    for (const c of this.queries.cards.entities) {
      const s = c.getValue(RuleCard, 'slot') as number;
      if (s >= 0) filled[s] = true;
    }
    for (let i = 0; i < level.slots; i++) if (!filled[i]) allSlotsFilled = false;

    for (const c of this.queries.cards.entities) {
      const o = c.object3D!;
      const slot = c.getValue(RuleCard, 'slot') as number;
      const rule = c.getValue(RuleCard, 'rule') as number;
      let tiltX = LAYOUT.cardTilt;
      if (slot >= 0) {
        this.target.set(LAYOUT.stackX, slotY(slot), LAYOUT.stackZ + 0.008);
        tiltX = 0;
      } else {
        anyDeck = true;
        this.target.set((deckIdx - (deckCount - 1) / 2) * LAYOUT.deckSpacing, 0.03, LAYOUT.deckZ);
        deckIdx++;
        if (rule === sel) this.target.y += 0.045 + Math.sin(this.clock * 6) * 0.004;
      }
      o.position.lerp(this.target, k);
      o.rotation.x += (tiltX - o.rotation.x) * k;
      const guidePulse = level.guided && sel < 0 && slot < 0 && phase === 'build';
      let s = rule === sel ? 1.12 : guidePulse ? 1 + Math.sin(this.clock * 5) * 0.06 : 1;
      if (phase !== 'running' && c.hasComponent(Hovered)) s *= HOVER_CARD;
      o.scale.setScalar(o.scale.x + (s - o.scale.x) * k);
    }

    // Slot hit flashes decay here so they settle even after the run ends.
    for (let i = 0; i < g.slotFlash.length; i++) {
      if (g.slotFlash[i]! > 0) g.slotFlash[i] = Math.max(0, g.slotFlash[i]! - delta * 2.5);
    }

    // Slots glow when a card is selected (or during the tutorial).
    for (const sEnt of this.queries.slots.entities) {
      const mat = (sEnt.object3D as Mesh).material as MeshBasicMaterial;
      const idx = sEnt.getValue(RuleSlot, 'index') as number;
      const flash = g.slotFlash[idx] ?? 0;
      let want = sel >= 0 && !filled[idx] ? 0.35 + Math.sin(this.clock * 6) * 0.15 : 0.16;
      if (phase !== 'running' && sEnt.hasComponent(Hovered)) want = Math.max(want, sel >= 0 ? 0.6 : 0.3);
      if (flash > 0.01) {
        want = Math.max(want, 0.25 + flash * 0.6);
        mat.color.setHex(g.slotFlashAllow[idx] ? ALLOW_COLOR : DENY_COLOR);
      } else {
        mat.color.setHex(ACCENT);
      }
      mat.opacity += (want - mat.opacity) * k;
    }

    // Default-deny bar flares when a packet falls through every rule.
    if (g.defaultDenyFlash > 0) g.defaultDenyFlash = Math.max(0, g.defaultDenyFlash - delta * 2.5);
    if (this.denyBar) this.denyBar.scale.set(1 + g.defaultDenyFlash * 0.25, 1 + g.defaultDenyFlash * 2, 1);

    // Buttons: hover grows them; DEPLOY pulses when it is the obvious next step.
    for (const b of this.queries.buttons.entities) {
      const isPrimary = b.getValue(UIButton, 'action') === 'primary';
      const pulse =
        isPrimary &&
        phase !== 'running' &&
        ((level.guided && allSlotsFilled && !anyDeck) || phase === 'result');
      let s = pulse ? 1 + Math.sin(this.clock * 5) * 0.08 : 1;
      if (b.hasComponent(Hovered)) s *= HOVER_BUTTON;
      const o = b.object3D!;
      o.scale.setScalar(o.scale.x + (s - o.scale.x) * k);
    }

    // Portal breathes and changes colour with the outcome; server flash decays.
    if (this.portal) {
      const ring = this.portal.object3D!;
      ring.position.copy(g.portalWorld);
      ring.rotation.z += delta * (phase === 'running' ? 1.6 : 0.3);
      if (g.board) ring.lookAt(g.board.object3D!.getWorldPosition(this.target));
      if (this.portalRing) {
        this.portalRing.color.setHex(
          phase === 'result' ? (g.lastWin ? ALLOW_COLOR : DENY_COLOR) : phase === 'running' ? DENY_COLOR : ACCENT,
        );
        this.portalRing.opacity = phase === 'running' ? 0.75 + Math.sin(this.clock * 8) * 0.2 : 0.9;
      }
    }
    for (const sv of this.queries.servers.entities) {
      const f = sv.getValue(ServerNode, 'flash') as number;
      if (f > 0) sv.setValue(ServerNode, 'flash', Math.max(0, f - delta * 2));
      const tower = sv.object3D!.getObjectByName('tower');
      if (tower) tower.scale.setScalar(1 + Math.max(0, f) * 0.15);
    }
  }
}

function expectedAllow(level: Level, i: number): boolean {
  return evaluate(level.solution, level.packets[i]!).action === 'allow';
}
