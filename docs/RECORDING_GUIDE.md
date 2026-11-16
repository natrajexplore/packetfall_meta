# Recording the Packetfall demo yourself (emulator, laptop)

## How long should it be?
The rule is **under 3:00** ("less than three minutes"). Judges may stop watching at 3:00. It is a maximum, not a target. Aim for **2:15–2:45** after trimming. Record about 3:00 of raw footage and trim the waits.

| Segment | Target |
|---|---|
| Landing page → Enter mixed reality | 0:06 |
| Level 1 (tutorial) | 0:25 |
| Level 2 (ALLOW ANY trap → SENTRY → fix) | 0:45 |
| Level 3 (rule shadowing → SENTRY → reorder) | 0:50 |
| Packet inspect / slow-mo (during level 3) | 0:08 |
| Daily Breach | 0:10 |
| **Total** | **≈ 2:25** |

---

## 1. Before you press record (10 minutes, do all of it)

1. **Run the fixed build.** In the repo: `git am packetfall-fixes-16nov.patch` (once), then `npm run check`. It must show `# pass 8` and `built in`. Without the patch, a pinch right after picking a card can be ignored.
2. **Start it:** `npm run dev`. Wait for the managed browser and the landing page.
3. **Reset progress** so level 1 appears: press F12 → Console → type `localStorage.clear()` → Enter → reload (F5). The HUD must later say **LEVEL 1/6 · SOC INTERN 0 / 400 XP**.
4. **Emulator input = "Hands"**, NOT "Gaze + Hands". Your last take used Gaze + Hands, which is why the hands never moved and the board floated far away. With Hands, the board is placed about 0.5 m in front of you and each pinch shows the hand acting.
5. **Recorder at high quality** (your last file was 0.3 Mbps, which is why the text was blurry):
   - OBS: Settings → Video: Base and Output **1920×1080**, **30 fps**. Settings → Output → Recording: format **MP4** (or MKV, then File → Remux), encoder hardware (NVENC / QuickSync / AMF) if offered, else x264. Rate control **CBR 10000 kbps** or **CQP/CRF 18**.
   - Xbox Game Bar: Settings → Gaming → Captures → Video quality **High**, frame rate **30**.
   - Check: the recorded file should be **at least 50 MB per minute**.
6. Capture only the **browser content** (OBS "Window Capture", then Alt+drag to crop off the tab bar and address bar). Hide or crop out the emulator toolbar and the hand panels.
7. Close other apps. Plug in the charger. Don't edit any project file while recording: saving a file reloads the page mid-take.

## 2. Entering the room

1. Click **Enter mixed reality**. The landing card disappears and you see the living room.
2. Within about 3 s the board appears **in front of you, slightly below eye level**: CHANGE TICKETS on the left, the rule stack in the middle with the HUD above it, WEB/DNS/DB towers on the right, DEPLOY bottom-left, DAILY / RECENTER / SOUND bottom-right.
3. If the board is far, high, or off to the side: look slightly down at the floor in front of you and **pinch RECENTER**.
4. Turn on **Play mode** in the emulator toolbar. The mouse now aims. **Right mouse button = right-hand pinch.** Watch the thin white ray from the hand: the dot on the end must be on the target before you pinch. **Esc** releases the mouse.
5. Do a 20-second practice pinch on SOUND (toggles SOUND ON/OFF), then set it back. Then **reload** (step 1.3) and start the real take.

> If pinches feel unreliable in Play mode, aim slowly, pause half a second with the dot on the target, then click. Never click while the view is still moving.

---

## 3. Level 1 · OPEN FOR BUSINESS (≈ 25 s)

HUD: "Let customers reach the WEB server. Everything else stays out." One green card is in the deck: **ALLOW HTTPS · INTERNET → WEB**.

| Step | You do | Expected |
|---|---|---|
| 1 | Pinch the glowing **ALLOW HTTPS** card | Card lifts and bobs, high blip, slot #1 glows |
| 2 | Pinch **slot #1** | Card slides into the rule stack. HUD: "Now pinch DEPLOY…". DEPLOY pulses |
| 3 | Pinch **DEPLOY** | Button reads RUNNING…, whoosh. 6 packets fly in one by one |
| 4 | Watch | HTTPS packets stop at rule #1, slot flashes **green**, they fly to WEB. SSH and SMB packets fall through to the **red default-deny bar** and burst |
| 5 | Result | **TICKETS 6/6**, all ✓. HUD **★★★ Policy verified in 1 deploy.** Button **NEXT ▶**. XP 300 |

Say: "Pinch a rule card, pinch a slot, deploy. Every packet checks the rules top-down."

## 4. Level 2 · NOT SO FAST, ANY-ANY (≈ 45 s)

HUD: "Only web traffic gets in. That ALLOW ANY card is a trap." Two cards: **ALLOW ANY APP · ANY ZONE → ANY SERVER** and **ALLOW HTTPS · INTERNET → WEB**.

| Step | You do | Expected |
|---|---|---|
| 1 | Pinch **NEXT ▶** | Level 2 loads, empty stack |
| 2 | Pinch **ALLOW ANY**, then **slot #1** | Trap card in the stack |
| 3 | Pinch **DEPLOY** | 7 packets run. HTTPS ✓; **SMB → DB, SSH → WEB, SMB → WEB marked ✗ BREACH**, flashing their servers |
| 4 | Result | **TICKETS 4/7**, HUD border turns red: **"SENTRY: 3 tickets failed. SMB · INTERNET → DB hit rule #1 (ALLOW ANY APP ANY ZONE → ANY SERVER) first and got in. Put a tighter DENY above it, or narrow that ALLOW."** Button **FIX & RETRY** |
| 5 | **Hold still 4–5 s** on the HUD | (judges must be able to read SENTRY) |
| 6 | Pinch **FIX & RETRY** | Your card stays in place |
| 7 | Pinch **ALLOW HTTPS** (deck), then pinch the **ALLOW ANY card in slot #1** | They swap: HTTPS goes in, ALLOW ANY goes back to the deck |
| 8 | Pinch **DEPLOY** | All 7 ✓. SMB/SSH packets burst on the default-deny bar |
| 9 | Result | **TICKETS 7/7**, **★★☆ PROMOTED → SOC ANALYST** (2 deploys = 2 stars). XP 500 |

Say: "ALLOW ANY looks helpful, but the first matching rule wins, so it lets everything in. SENTRY tells me exactly which rule did it."

## 5. Level 3 · FIRST MATCH WINS (≈ 50 s)

HUD: "Branch admins may SSH anywhere. Nobody on the internet may." Two slots, two cards: **DENY SSH · ANY ZONE → ANY SERVER** (red) and **ALLOW SSH · BRANCH → ANY SERVER** (green).

| Step | You do | Expected |
|---|---|---|
| 1 | Pinch **NEXT ▶** | Level 3 loads with **two** slots (#1 top, #2 below) |
| 2 | Pinch **DENY SSH** → **slot #1**; pinch **ALLOW SSH** → **slot #2** | Deny on top (deliberately wrong) |
| 3 | Pinch **DEPLOY**. While packets fly, **point at a packet** (a header label appears, e.g. `SSH · BRANCH → DB`), then **pinch the packet** | Time slows to ¼ for ~2.5 s so you can trace it through rule #1 |
| 4 | Result | **TICKETS 3/6**: the three **BRANCH** packets ✗ **OUTAGE** (wrongly dropped at rule #1); the three INTERNET packets ✓ blocked. SENTRY: **"3 tickets failed. SSH · BRANCH → DB hit rule #1 (DENY SSH ANY ZONE → ANY SERVER) first and was dropped. First match wins: move the ALLOW above it."** |
| 5 | Hold 4–5 s on the HUD, then pinch **FIX & RETRY** | |
| 6 | Pinch the **ALLOW SSH card in slot #2** | It returns to the deck |
| 7 | Pinch **ALLOW SSH** again (it lifts), then pinch the **DENY SSH card in slot #1** | They swap: ALLOW in #1, DENY back in the deck |
| 8 | Pinch **DENY SSH**, then **slot #2** | Order is now ALLOW branch → DENY all |
| 9 | Pinch **DEPLOY** | BRANCH packets flash green at rule #1 and reach their servers; INTERNET packets flash red at rule #2 |
| 10 | Result | **TICKETS 6/6**, **★★☆**, XP 700 |

Say: "Order matters. A deny on top shadows the allow below it. Move the allow up and it works."

## 6. Daily Breach (≈ 10 s)
Pinch **DAILY MM-DD**. Title **DAILY BREACH · YYYY-MM-DD**, 3–4 slots, one decoy card. Hold 4 s. Say: "A new puzzle every day, the same for every player, with streaks."
(If you have time, solve it. Otherwise stop the recording here.)

---

## 7. If something goes wrong

| Problem | What it means | Fix |
|---|---|---|
| HUD shows level 2 or 3 at start | Old progress saved | Console → `localStorage.clear()` → reload |
| Pinch does nothing | Ray dot wasn't on the target, or you clicked while moving | Aim, pause ½ s, right-click. Console shows `[pf] press=…` lines for every pinch that lands |
| After picking a card, the slot pinch is ignored | Patch not applied | Stop, `git am` the patch, `npm run check`, restart |
| The wrong card or slot reacts | Old build without the outline fix | Same: apply the patch |
| Hands don't move; a "+" crosshair selects | Input is "Gaze + Hands" | Emulator toolbar → Input → **Hands** → reload |
| Board far away, too high, or behind you | Placed before you looked at it, or gaze mode | Look slightly down, pinch **RECENTER** |
| "An empty firewall drops everything" | DEPLOY with no card in the stack | Place a card first |
| "Pick a rule card first…" | Pinched an empty slot with nothing selected | Pinch a card, then the slot |
| "Deploy in progress…" | Pinched a card during a run | Wait for RUNNING… to finish |
| Landing card stays over the room | Old build | Apply the patch (it hides the card on any XR start) |
| Page reloads mid-take | A project file was saved (Vite hot reload) | Don't touch files while recording. Re-take from `localStorage.clear()` |
| Choppy or frozen frames | Laptop overloaded | Close other apps, plug in, record at 30 fps, lower OBS encoder preset |
| Blurry text in the recording | Recording bitrate too low | OBS CBR 10000 kbps / CQP 18 (step 1.5) |
| Mistake mid-take (wrong card) | No problem | Pinch the placed card to send it back. Keep going; I'll trim it |
| Black screen or "Could not start mixed reality" | Session didn't start | Reload, wait for "Ready…" under the button, click again |

## 8. After recording
- Watch it once at full screen: can you read SENTRY? Do the hands move on each pinch?
- Send me the file. I'll trim the waits, add the voice-over, captions and end card, and keep it under 3:00.
