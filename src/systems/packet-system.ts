/**
 * PacketSystem — packets stream in from the portal (pinned to a real wall
 * when the room has one), descend the rule stack ONE RULE AT A TIME so the
 * player literally watches first-match evaluation, then either reach their
 * server or shatter at the firewall.
 *
 * Gaze at a packet (or point a hand ray at it) to inspect its header.
 * Pinch a packet to slow time and trace it.
 */

import {
  createSystem,
  Hovered,
  Pressed,
  RayInteractable,
  Vector3,
  type Mesh,
  type MeshStandardMaterial,
} from '@iwsdk/core';
import { Packet, ServerNode } from '../components.js';
import { LAYOUT, packetMesh, slotY } from '../game/board.ts';
import { evaluate, judge, packetText, ruleMatches } from '../game/engine.ts';
import { finishRun } from '../game/flow.ts';
import { createLabel, type Label } from '../game/labels.ts';
import { sfx } from '../game/sfx.ts';
import { game, type GameState } from '../game/state.ts';

const PH_INBOUND = 0;
const PH_CHECK = 1;
const PH_SERVER = 2;
const PH_DROP = 3;

const SPAWN_INTERVAL = 0.75;
const INBOUND_SPEED = 1.5; // m/s
const CHECK_SPEED = 0.8;
const CHECK_DWELL = 0.22; // s per rule — slow enough to read, fast enough to flow
const SERVER_SPEED = 0.8;

export class PacketSystem extends createSystem({
  packets: { required: [Packet] },
  hovered: { required: [Packet, Hovered] },
  pressed: { required: [Packet, Pressed] },
  servers: { required: [ServerNode] },
}) {
  private g!: GameState;
  private inspect!: Label;
  private tmp = new Vector3();
  private target = new Vector3();
  private slowmo = 0;

  init(): void {
    this.g = game(this.world);
    this.inspect = createLabel(0.2, 0.04, 2600);
    this.inspect.mesh.visible = false;
    this.world.createTransformEntity(this.inspect.mesh, { parent: this.g.board!, persistent: true });

    this.queries.hovered.subscribe('qualify', (e) => {
      const level = this.g.level.peek();
      if (!level) return;
      const spec = level.packets[e.getValue(Packet, 'spec') as number]!;
      this.inspect.draw([{ text: packetText(spec), size: 40, weight: 700, align: 'center' }], {
        bg: 'rgba(8,12,28,0.9)',
        border: '#7aa2ff',
        radius: 20,
        padding: 12,
      });
      this.inspect.mesh.visible = true;
    });
    this.queries.hovered.subscribe('disqualify', () => {
      if (this.queries.hovered.entities.size === 0) this.inspect.mesh.visible = false;
    });
    this.queries.pressed.subscribe('qualify', () => {
      this.slowmo = 2.5; // trace mode
      sfx.check();
    });
  }

  private spawn(specIndex: number): void {
    const g = this.g;
    const level = g.level.peek()!;
    const spec = level.packets[specIndex]!;
    const m = packetMesh(spec.app, spec.from);
    g.board!.object3D!.worldToLocal(this.tmp.copy(g.portalWorld));
    m.position.copy(this.tmp);
    const e = this.world.createTransformEntity(m, { parent: g.board! });
    e.addComponent(Packet, { spec: specIndex, phase: PH_INBOUND, t: 0, check: 0 });
    e.addComponent(RayInteractable);
  }

  /** Move `o` toward `to` at `speed`; returns true on arrival. */
  private moveToward(o: { position: Vector3 }, to: Vector3, speed: number, dt: number): boolean {
    this.tmp.subVectors(to, o.position);
    const d = this.tmp.length();
    const step = speed * dt;
    if (d <= step || d < 1e-4) {
      o.position.copy(to);
      return true;
    }
    o.position.addScaledVector(this.tmp, step / d);
    return false;
  }

  update(rawDelta: number): void {
    const g = this.g;
    if (g.paused) return;
    const level = g.level.peek();
    if (!level || g.phase.peek() !== 'running') {
      this.inspect.mesh.visible = false;
      return;
    }
    if (this.slowmo > 0) this.slowmo -= rawDelta;
    const dt = this.slowmo > 0 ? rawDelta * 0.25 : rawDelta;

    // Spawn
    if (g.spawnQueue.length > 0) {
      g.spawnTimer -= dt;
      if (g.spawnTimer <= 0) {
        this.spawn(g.spawnQueue.shift()!);
        g.spawnTimer = SPAWN_INTERVAL;
      }
    }

    const rules = g.deployedRules;
    for (const e of this.queries.packets.entities) {
      const o = e.object3D as Mesh;
      const phase = e.getValue(Packet, 'phase') as number;
      const specIdx = e.getValue(Packet, 'spec') as number;
      const spec = level.packets[specIdx]!;
      o.rotation.y += dt * 3;
      o.rotation.x += dt * 2;

      if (phase === PH_INBOUND) {
        this.target.set(LAYOUT.stackX, slotY(0) + 0.06, LAYOUT.stackZ + 0.045);
        if (this.moveToward(o, this.target, INBOUND_SPEED, dt)) {
          e.setValue(Packet, 'phase', PH_CHECK);
          e.setValue(Packet, 'check', 0);
          e.setValue(Packet, 't', 0);
        }
      } else if (phase === PH_CHECK) {
        const c = e.getValue(Packet, 'check') as number;
        this.target.set(LAYOUT.stackX, c < level.slots ? slotY(c) : slotY(level.slots) + 0.02, LAYOUT.stackZ + 0.045);
        if (this.moveToward(o, this.target, CHECK_SPEED, dt)) {
          const t = (e.getValue(Packet, 't') as number) + dt;
          e.setValue(Packet, 't', t);
          if (t >= CHECK_DWELL) {
            e.setValue(Packet, 't', 0);
            if (c >= level.slots) {
              // Fell through every rule → implicit default deny.
              this.decide(e, -1, false);
            } else {
              const r = rules[c];
              if (r && ruleMatches(r, spec)) {
                this.decide(e, c, r.action === 'allow');
              } else {
                sfx.check();
                e.setValue(Packet, 'check', c + 1);
              }
            }
          }
        }
      } else if (phase === PH_SERVER) {
        this.target.copy(LAYOUT.servers[spec.to]).setY(0.1);
        if (this.moveToward(o, this.target, SERVER_SPEED, dt)) this.resolve(e, specIdx);
      } else if (phase === PH_DROP) {
        const t = (e.getValue(Packet, 't') as number) + dt;
        e.setValue(Packet, 't', t);
        o.scale.setScalar(1 + t * 5);
        const mat = o.material as MeshStandardMaterial;
        mat.opacity = Math.max(0, 1 - t / 0.45);
        if (t >= 0.45) this.resolve(e, specIdx);
      }

      if (e.hasComponent(Hovered)) {
        this.inspect.mesh.position.copy(o.position).add(this.tmp.set(0, 0.05, 0));
      }
    }

    // Decay slot flashes
    for (let i = 0; i < g.slotFlash.length; i++) g.slotFlash[i] = Math.max(0, g.slotFlash[i]! - dt * 2.5);

    if (g.spawnQueue.length === 0 && this.queries.packets.entities.size === 0) {
      this.inspect.mesh.visible = false;
      finishRun(g);
    }
  }

  private decide(e: import('@iwsdk/core').Entity, match: number, allow: boolean): void {
    const g = this.g;
    e.setValue(Packet, 'match', match);
    e.setValue(Packet, 'allow', allow);
    e.setValue(Packet, 'phase', allow ? PH_SERVER : PH_DROP);
    e.setValue(Packet, 't', 0);
    if (match >= 0) {
      g.slotFlash[match] = 1;
      g.slotFlashAllow[match] = allow;
    } else {
      g.defaultDenyFlash = 1;
    }
    if (!allow) sfx.blocked();
  }

  private resolve(e: import('@iwsdk/core').Entity, specIdx: number): void {
    const g = this.g;
    const level = g.level.peek()!;
    const spec = level.packets[specIdx]!;
    const outcome = judge(evaluate(g.deployedRules, spec), evaluate(level.solution, spec));
    g.tickets[specIdx] = { outcome };
    if (outcome === 'served') sfx.served();
    else if (outcome === 'breach') sfx.breach();
    else if (outcome === 'outage') sfx.outage();
    if (outcome === 'served' || outcome === 'breach') {
      for (const s of this.queries.servers.entities) {
        if (s.getValue(ServerNode, 'server') === spec.to) s.setValue(ServerNode, 'flash', 1);
      }
    }
    g.hudVersion.value++;
    e.dispose();
  }
}
