# Devpost submission draft — Packetfall

**Track:** Gaming  **Division:** New Experience
**Project link:** https://natrajexplore.github.io/packetfall_meta/ (GitHub Pages, IWSDK/WebXR)  
**Source:** https://github.com/natrajexplore/packetfall_meta
**Video:** `<YouTube or Vimeo, public, under 3:00>`
**Built with:** Immersive Web SDK (IWSDK), WebXR, Three.js, TypeScript, Vite, WebAudio

---

## Tagline
Threats pour through your real wall. You are the firewall on your desk.

## Inspiration
I have spent ten years as a network security engineer. The single idea that makes or breaks a firewall policy is one most people never see: rules are checked top-down and the first match wins. Put a broad "allow" one line too high and everything below it stops mattering. It is a beautiful puzzle hiding inside a dry console, and it is genuinely spatial — order, flow, and things passing through barriers. Mixed reality let me take it out of the terminal and put it on your desk, with the "internet" coming through your actual wall.

## What it does
You sit at any table. Packetfall finds it, lays a glowing network board on it and opens a portal on the nearest wall. You pinch rule cards ("ALLOW HTTPS · INTERNET → WEB", "DENY SSH · ANY → ANY") into a firewall rule stack, then pinch DEPLOY.

Packets stream from the portal onto your table. Each one stops at rule #1, then #2, then #3 — you watch first-match evaluation happen in front of you. Matched packets fly to their server or shatter on the firewall. Every packet has a change ticket that says whether it should PASS or BLOCK. Get a ticket wrong and SENTRY, the in-game analyst, tells you in one sentence which rule caught it and why. Your arrangement stays in place, so you fix it and redeploy. Fewer deploys means more stars.

- 6 hand-crafted campaign levels that teach default-deny, rule shadowing and lateral movement
- **Daily Breach:** a new seeded puzzle every day, identical for every player worldwide, with streaks
- XP and ranks from SOC Intern to Zero-Trust Legend
- Look at any packet to read its header; pinch it to slow time and trace it

## How I built it
Packetfall is built with Meta's Immersive Web SDK on Three.js, using its entity-component system.

- **Hands-first input:** every card, slot and button is an IWSDK `RayInteractable`, so the same select-then-place flow works with a hand-ray pinch on Quest, gaze + pinch on Meta VR Glasses, a controller, or a mouse. No controller is ever needed.
- **Scene understanding that survives unknown rooms:** a placement system looks for a semantic "table" mesh first, then a desk-height horizontal plane in front of the player, scored by distance and how centred it is in view, and finally falls back to a floating tray. A ray from the board against vertical planes finds the wall for the portal. The board is pinned with a spatial anchor.
- **FoV-aware layout:** everything interactive lives inside a 0.86 m board in a narrow forward cone so it still fits Meta VR Glasses.
- **A pure, tested rule engine** shared by the campaign, the daily generator and SENTRY. The daily generator rejects puzzles that are trivially solvable, contain dead rules, or can't distinguish the right answer — a test suite checks a full year of generated puzzles.
- **Zero downloads at launch:** every mesh is procedural and every sound is synthesized with WebAudio, so cold start is near-instant.
- **Clean pause/resume:** the simulation freezes whenever the headset is blurred or removed.

## Challenges
Making evaluation *legible*: early versions resolved packets instantly and players couldn't see why. Slowing each packet to dwell on every rule — and flashing the rule that matched green or red — turned an invisible algorithm into something you can watch. Placement was the other hard part: the nearest table is often behind you or a side table, so candidates are filtered and scored by view direction.

## What I learned
Teaching works better as feedback than as instructions. One sentence from SENTRY after a mistake teaches more than a paragraph before it.

## What's next
- High-contrast mode and a one-handed mode for accessibility
- New rule fields (time-of-day, user groups) unlocked by rank
- A weekly "incident" level with a story
- Shared-room co-op: one player writes rules, the other triages packets

**Target launch date:** Meta Horizon Store / web release, Q1 2027, ahead of the Meta VR Glasses spring 2027 launch.
