/**
 * Packetfall ECS components. System-free by design (the IWSDK editor imports
 * this manifest), so nothing here may import a system, the DOM or the renderer.
 */

import { createComponent, defineComponents, Types } from '@iwsdk/core';

/** Root of the tabletop board; every level-scoped piece is parented to it. */
export const BoardRoot = createComponent('BoardRoot', {});

/** A rule card. `rule` indexes Level.cards; `slot` is -1 while in the deck. */
export const RuleCard = createComponent('RuleCard', {
  rule: { type: Types.Int8, default: 0 },
  slot: { type: Types.Int8, default: -1 },
});

/** A position in the firewall rule stack (0 = evaluated first). */
export const RuleSlot = createComponent('RuleSlot', {
  index: { type: Types.Int8, default: 0 },
});

/** A pressable board button. */
export const UIButton = createComponent('UIButton', {
  action: {
    type: Types.Enum,
    enum: { Primary: 'primary', Mode: 'mode', Recenter: 'recenter', Sound: 'sound' },
    default: 'primary',
  },
});

/**
 * A packet in flight. Phases: 0 inbound, 1 checking, 2 to-server,
 * 3 dropped, 4 done. `spec` indexes Level.packets.
 */
export const Packet = createComponent('Packet', {
  spec: { type: Types.Int16, default: 0 },
  phase: { type: Types.Int8, default: 0 },
  t: { type: Types.Float32, default: 0 },
  check: { type: Types.Int8, default: 0 },
  match: { type: Types.Int8, default: -1 },
  allow: { type: Types.Boolean, default: false },
});

/** One server tower on the board (web / dns / db). */
export const ServerNode = createComponent('ServerNode', {
  server: { type: Types.String, default: 'web' },
  flash: { type: Types.Float32, default: 0 },
});

export default defineComponents([
  BoardRoot,
  RuleCard,
  RuleSlot,
  UIButton,
  Packet,
  ServerNode,
]);
