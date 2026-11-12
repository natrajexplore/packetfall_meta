# Demo video — under 3:00 (target 2:30)

Rules: < 3 minutes, **public** on YouTube or Vimeo, footage from a Meta VR device **or an XR simulator/emulator**. Judges may stop at 3:00, so the hook goes first. Show **real gameplay** only — no AI-generated video. No brand names or logos on screen.

This version is recorded in the **IWSDK emulator (IWER)** on a PC — no headset needed. If a Quest becomes available, the same shot list works with the headset's built-in recorder.

## Shot list

| Time | Shot (emulator, Meta Quest 3 profile, immersive AR) | Voice-over / caption |
|---|---|---|
| 0:00–0:10 | **Hook.** Mid-level: packets streaming from the red wall portal onto the board on the table, one shatters on the firewall. | "Threats pour through your wall. You are the firewall." |
| 0:10–0:20 | Intro overlay → "Enter mixed reality". The board lands on the table, the portal opens on the wall. | "Packetfall is a hands-first mixed-reality puzzle. It finds your table and your wall." |
| 0:20–0:50 | **Level 1, fresh profile.** Glowing card → pinch → slot → DEPLOY → packets land → 3 stars, HUD border + portal turn green. | "The first minute teaches itself. Pinch a rule, drop it in the firewall, deploy." |
| 0:50–1:25 | **Level 3, the wrong order.** DENY SSH above ALLOW BRANCH SSH. Packets stop at each rule; branch SSH is dropped; red ✗ on its ticket; SENTRY's one-line explanation on the HUD. | "Rules are checked top-down. First match wins. Get the order wrong and SENTRY tells you exactly why." |
| 1:25–1:45 | Swap the two cards, redeploy → `TICKETS 6/6`, button turns NEXT ▶. 2–3 s cutaway: "PROMOTED → SOC ANALYST". | "Fix it, redeploy, climb the ranks." |
| 1:45–2:05 | Look at a packet → header label. Pinch it → slow-motion trace through the stack. | "Look at any packet to read it. Pinch it to slow time and trace its path." |
| 2:05–2:20 | Daily Breach: today's date + streak counter. | "A new Daily Breach every day — the same puzzle for every player in the world." |
| 2:20–2:30 | End card: PACKETFALL · Hands only · Built with Immersive Web SDK · play link. | "Packetfall. Hands only. Threats welcome." |

## Recording setup (Windows, no headset)

1. `npm run dev` — opens the managed Chromium window with the emulator. Keep `iwsdk.config.json` on `metaQuest3`.
2. Recorder: **OBS Studio** (Window Capture → the Chromium window, 1920×1080, 60 fps, desktop audio on) or **Win + Alt + R** (Xbox Game Bar, records the focused window).
3. Record each shot as its **own clip**. Retakes are cheap; a single 3-minute take is not.
4. Order of recording (progress is saved in the browser):
   1. Clear site data (F12 → Application → Storage → *Clear site data*), reload → record **Level 1** and the intro.
   2. Play Level 2 (win on first deploy → record the promotion cutaway).
   3. Record **Level 3** wrong order → fix → win, and the packet-inspect shot.
   4. Solve one Daily, then record the **Daily screen with the streak**.
   5. Record the hook last, when you're fluent.
5. Voice-over: record separately (phone voice memo or a headset mic) in a quiet room, reading the right-hand column.

## Edit (Clipchamp — built into Windows 11, free)

1. Drop clips on the timeline in shot-list order; trim dead time hard (loading, aiming).
2. Add the voice-over track; keep game sound at ~30 % under it.
3. Auto-captions (English) — judges often watch muted.
4. End card: black background, white text, play link.
5. Export 1080p. Check the length is **≤ 2:50**.

## Upload

YouTube → Visibility **Public** → title "Packetfall — hands-first mixed-reality firewall puzzle" → description with the play link → paste the URL into `docs/SUBMISSION.md` and the Devpost form. Open the link in a private window to confirm it plays logged out.

Tips: keep the board centred in frame (it shows FoV-aware design); unmute SOUND in-game; never show controllers being used — this is a hands-first entry.
