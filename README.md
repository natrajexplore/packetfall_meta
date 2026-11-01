# PACKETFALL

**Threats pour through your real wall. You are the firewall on your desk.**

A hands-first, seated, mixed-reality puzzle game for **Meta Quest 3 / 3S** and **Meta VR Glasses**, built with Meta's **Immersive Web SDK (IWSDK / WebXR)** for the *Meta VR Start Developer Competition 2026* — **Gaming track · New Experience division**.

You build a firewall policy by pinching rule cards into a rule stack. Hit **DEPLOY** and glowing packets stream out of a portal on your actual wall, land on your actual table and walk down your rule stack **one rule at a time** — so you literally *watch* first-match evaluation happen. Every packet carries a change ticket (PASS or BLOCK). Get one wrong and **SENTRY**, the in-game analyst, tells you in one sentence which rule fired and why. Fix it, redeploy, earn stars, climb from SOC Intern to Zero-Trust Legend, and come back tomorrow for a new **Daily Breach** that every player in the world gets on the same day.

It is a real puzzle about a real skill: top-down, first-match rule evaluation is exactly how enterprise firewalls and ACLs decide traffic. No jargon walls — the board teaches it.

---

## Play it

| Where | How |
|---|---|
| Meta Quest 3 / 3S | Open the GitHub Pages URL in **Meta Quest Browser** → **Enter mixed reality**. Sit at a desk or table. Hands only. |
| Meta VR Glasses | Same URL. Look at a card and pinch (gaze + pinch). |
| Desktop browser | `npm run dev` opens IWER, the IWSDK headset emulator, with a virtual living room. |

### Controls (no controller ever required)

| Action | Hands (Quest) | Eyes + hands (VR Glasses) |
|---|---|---|
| Select a rule card | Point and pinch | Look and pinch |
| Place it | Pinch an empty slot | Look at slot, pinch |
| Return a placed card | Pinch it again | Look, pinch |
| Inspect a packet | Point at it | Look at it |
| Slow-mo trace a packet | Pinch it | Look, pinch |
| Deploy / Next / Retry | Pinch the big green button | Look, pinch |

---

## How it uses Meta VR (what the judges score)

| Capability | Where it shows up |
|---|---|
| **Hand tracking** | Every interaction is a pinch on a `RayInteractable`; end-to-end playable without pairing a controller. |
| **Gaze interaction** | `gazeTracking` enabled; IWSDK `GazeSystem` routes gaze + pinch to the same targets. Looking at a packet shows its header. |
| **Passthrough, purposefully** | Packets enter through a portal pinned to *your* wall and fall onto *your* table. The room is the level. |
| **Scene understanding** | `PlacementSystem` finds a semantic `table` mesh, then a desk-height horizontal plane in front of you, then falls back to a floating tray. A ray against vertical planes finds the wall for the portal. |
| **Spatial anchors** | The board gets an `XRAnchor` so it stays glued to the table through drift and recentering. |
| **FoV-aware design** | All interactive pieces sit inside a ~0.85 m × 0.45 m board and a narrow forward cone so they still fit the Meta VR Glasses' narrower field of view. |
| **Seated / airplane-seat test** | Every target is within arm's reach of a seated player; no locomotion. |
| **Fast cold start** | Zero downloaded assets — every mesh is procedural, every sound is synthesized with WebAudio. |
| **Clean pause/resume** | Simulation freezes on `Hidden` / `VisibleBlurred` visibility states. |

---

## Project layout

```
iwsdk.config.json            XR features (hands, gaze, planes, meshes, anchors) — the project authority
index.html                   2D landing page + Enter MR button
src/index.ts                 World.create + system registration
src/components.ts            ECS components (system-free manifest)
src/game/engine.ts           Pure first-match rule engine, SENTRY explainer, seeded RNG
src/game/levels.ts           6 campaign levels + deterministic Daily Breach generator
src/game/progress.ts         XP, ranks, stars, daily streak (localStorage, fail-safe)
src/game/board.ts            Board layout + procedural meshes
src/game/labels.ts           Canvas-texture text panels
src/game/sfx.ts              Procedural WebAudio sound effects
src/game/flow.ts             Level choice, deploy completion, scoring
src/systems/game-system.ts   Cards, slots, buttons, HUD, tickets, tutorial guidance
src/systems/packet-system.ts Packet spawn, step-by-step rule evaluation, gaze inspect, trace
src/systems/placement-system.ts  Table/wall detection, board placement, anchoring
tests/engine.test.ts         Engine + level + 365-day daily-generator tests
docs/                        Rules analysis, Devpost text, video script, build plan, QA
```

## Develop

Requires Node 22.12+ (or 20.19+).

```bash
npm install
npm run dev        # managed browser with the IWER headset emulator
npm test           # rule engine + levels + a full year of daily puzzles
npm run check      # typecheck + tests + production build
```

Test on a headset over Wi-Fi: `npx @iwsdk/cli dev status`, open a URL from `data.runtimeUrls.network` in Quest Browser, accept the local certificate warning.

## Deploy (the competition submission path for WebXR)

Push to `main` on GitHub with Pages set to **GitHub Actions**. `.github/workflows/deploy.yml` typechecks, tests, builds and publishes `dist/`. Put that URL in the Devpost submission.

## License & assets

All code is original to the entrant except the MIT-licensed IWSDK scaffold. No third-party art, audio, logos, brand names or identifiable people. All 3D geometry is procedural and all sound is synthesized at runtime.
