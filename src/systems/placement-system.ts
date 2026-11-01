/**
 * PlacementSystem — puts the board on the player's REAL table and opens the
 * packet portal on their REAL wall, using IWSDK scene understanding.
 *
 * Search order (built to survive rooms the developer never tested):
 *   1. a scene mesh labelled "table" (Quest room setup)
 *   2. a horizontal detected plane at desk height near the player
 *   3. fallback: a virtual tray floating at lap height in front of the player
 * The portal ray-casts from the board, away from the player, against vertical
 * planes; with no wall it hovers 1.3 m behind the board.
 *
 * Passthrough is purposeful here: threats literally arrive through YOUR wall
 * and land on YOUR desk. With passthrough off the game would lose its framing.
 */

import {
  Box3,
  createSystem,
  Quaternion,
  Ray,
  setWorldPosition,
  setWorldQuaternion,
  Vector3,
  VisibilityState,
  XRAnchor,
  XRMesh,
  XRPlane,
} from '@iwsdk/core';
import { game, type GameState } from '../game/state.ts';

const SEARCH_SECONDS = 2.5;
const DESK_MIN_Y = 0.35; // low enough for a sofa + coffee table setup
const DESK_MAX_Y = 1.2;
const MAX_REACH = 1.6;

export class PlacementSystem extends createSystem({
  planes: { required: [XRPlane] },
  meshes: { required: [XRMesh] },
}) {
  private g!: GameState;
  private searching = false;
  private searchT = 0;
  private anchored = false;
  private box = new Box3();
  private best = new Box3();
  private head = new Vector3();
  private fwd = new Vector3();
  private p = new Vector3();
  private away = new Vector3();
  private hit = new Vector3();
  private ray = new Ray();
  private q = new Quaternion();
  private up = new Vector3(0, 1, 0);

  init(): void {
    this.g = game(this.world);
    this.cleanupFuncs.push(
      this.g.requestPlacement.subscribe((n) => {
        if (n > 0) this.startSearch();
      }),
      this.world.visibilityState.subscribe((v) => {
        if (v === VisibilityState.Visible && !this.g.placed.peek()) this.startSearch();
        if (v === VisibilityState.NonImmersive) this.placeDesktop();
      }),
    );
  }

  private startSearch(): void {
    this.searching = true;
    this.searchT = 0;
  }

  /** Browser / emulator default: board in front of the configured camera. */
  private placeDesktop(): void {
    const board = this.g.board?.object3D;
    if (!board) return;
    board.position.set(0, 0.72, -0.5);
    board.quaternion.identity();
    this.g.portalWorld.set(-0.62, 1.02, -1.45);
  }

  update(delta: number): void {
    if (!this.searching || !this.g.board) return;
    this.searchT += delta;
    this.player.head.getWorldPosition(this.head);
    this.computeForward();
    const found = this.findTable();
    if (found || this.searchT >= SEARCH_SECONDS) {
      this.searching = false;
      this.place(found);
    }
  }

  private findTable(): boolean {
    let bestDist = Infinity;
    // 1) Semantic "table" mesh
    for (const e of this.queries.meshes.entities) {
      const label = String(e.getValue(XRMesh, 'semanticLabel') ?? '').toLowerCase();
      if (!label.includes('table') && !label.includes('desk')) continue;
      if (!e.object3D) continue;
      this.box.setFromObject(e.object3D);
      const d = this.horizontalDistance(this.box);
      if (d < bestDist && d < MAX_REACH * 1.25) {
        bestDist = d;
        this.best.copy(this.box);
      }
    }
    if (bestDist < Infinity) return true;
    // 2) Horizontal plane at desk height
    for (const e of this.queries.planes.entities) {
      if (!e.object3D) continue;
      this.box.setFromObject(e.object3D);
      const thick = this.box.max.y - this.box.min.y;
      const y = this.box.max.y;
      if (thick > 0.05 || y < DESK_MIN_Y || y > DESK_MAX_Y) continue;
      const d = this.horizontalDistance(this.box);
      if (d < bestDist && d < MAX_REACH * 1.25) {
        bestDist = d;
        this.best.copy(this.box);
      }
    }
    return bestDist < Infinity;
  }

  /** Flattened view direction. player.head is a plain Object3D, so its view
   *  direction is local -Z (Object3D.getWorldDirection would return +Z). */
  private computeForward(): void {
    this.fwd.set(0, 0, -1).applyQuaternion(this.player.head.getWorldQuaternion(this.q));
    this.fwd.y = 0;
    if (this.fwd.lengthSq() < 1e-6) this.fwd.set(0, 0, -1);
    this.fwd.normalize();
  }

  /** Distance to the box footprint, or Infinity if it is not in front of the player. */
  private horizontalDistance(b: Box3): number {
    b.getCenter(this.p);
    this.p.y = this.head.y;
    // distance from head to the nearest point of the box footprint
    const cx = Math.max(b.min.x, Math.min(this.head.x, b.max.x));
    const cz = Math.max(b.min.z, Math.min(this.head.z, b.max.z));
    // The table centre must be in front of the player (within ~70° of gaze).
    const dx = this.p.x - this.head.x;
    const dz = this.p.z - this.head.z;
    const len = Math.hypot(dx, dz) || 1;
    const align = (dx * this.fwd.x + dz * this.fwd.z) / len;
    if (align < 0.35) return Infinity;
    // Score: near AND centred in view wins (a table dead ahead beats one off to the side).
    return Math.hypot(cx - this.head.x, cz - this.head.z) * (1.6 - align);
  }

  private place(onTable: boolean): void {
    const g = this.g;
    const board = g.board!.object3D!;

    if (onTable) {
      const margin = 0.2;
      this.p.copy(this.head).addScaledVector(this.fwd, 0.45);
      const b = this.best;
      const midX = (b.min.x + b.max.x) / 2;
      const midZ = (b.min.z + b.max.z) / 2;
      this.p.x = b.max.x - b.min.x > margin * 2 ? Math.max(b.min.x + margin, Math.min(this.p.x, b.max.x - margin)) : midX;
      this.p.z = b.max.z - b.min.z > margin * 2 ? Math.max(b.min.z + margin, Math.min(this.p.z, b.max.z - margin)) : midZ;
      this.p.y = b.max.y + 0.002;
      if (!g.level.peek()?.guided) g.hint.value = 'Board locked to your table. Threats will come through your wall.';
    } else {
      this.p.copy(this.head).addScaledVector(this.fwd, 0.5);
      this.p.y = this.head.y - 0.42;
      if (!g.level.peek()?.guided) g.hint.value = 'No table found — floating tray mode. Pinch RECENTER any time.';
    }

    // Face the player: board +Z points at the head.
    const yaw = Math.atan2(this.head.x - this.p.x, this.head.z - this.p.z);
    this.q.setFromAxisAngle(this.up, yaw);
    setWorldPosition(board, this.p);
    setWorldQuaternion(board, this.q);

    if (!this.anchored) {
      // Persist the board to a real-world anchor so it stays glued to the
      // table through tracking drift and recentering.
      g.board!.addComponent(XRAnchor);
      this.anchored = true;
    }

    this.placePortal();
    g.placed.value = true;
  }

  private placePortal(): void {
    const g = this.g;
    const board = g.board!.object3D!;
    board.getWorldPosition(this.p);
    // "away" = board -Z in world space (from the player toward the far side).
    this.away.set(0, 0, -1).applyQuaternion(board.getWorldQuaternion(this.q)).setY(0).normalize();
    this.ray.set(this.p.clone().setY(this.p.y + 0.35), this.away);

    let bestT = 4;
    let found = false;
    for (const e of this.queries.planes.entities) {
      if (!e.object3D) continue;
      this.box.setFromObject(e.object3D);
      const tall = this.box.max.y - this.box.min.y > 0.5;
      const thin = Math.min(this.box.max.x - this.box.min.x, this.box.max.z - this.box.min.z) < 0.1;
      if (!tall || !thin) continue;
      this.box.expandByScalar(0.04);
      if (this.ray.intersectBox(this.box, this.hit)) {
        const t = this.hit.distanceTo(this.ray.origin);
        if (t > 0.5 && t < bestT) {
          bestT = t;
          found = true;
          g.portalWorld.copy(this.hit).addScaledVector(this.away, -0.04);
        }
      }
    }
    if (!found) {
      g.portalWorld.copy(this.p).addScaledVector(this.away, 1.3);
      g.portalWorld.y = this.p.y + 0.4;
    }
  }
}
