# Meta VR Start Developer Competition 2026 — rules analysis

Source: official rules on Devpost (start-developer-competition-26.devpost.com/rules), read 1 Nov 2026.

## Hard requirements (miss one = disqualified or fails Stage One)

| Requirement | Status for Packetfall | Action |
|---|---|---|
| Age 18+, not resident of Brazil, Quebec or a sanctioned region | India is eligible | — |
| Meta account with **Developer Access** enabled | ✅ logged in; app **packetfall** created in the Developer Dashboard (2 Nov 2026) | — |
| **Member of the Meta VR Start Program by the time of submission** | ⏳ **Applied 2 Nov 2026, awaiting approval** (critical path) | Keep the confirmation screenshot. Watch email and the Start Discord for acceptance; if nothing arrives by ~9 Nov, post on the Devpost discussion board and the Meta developer forum with the screenshot. |
| Register on Devpost ("Join hackathon") | ✅ registered | — |
| VR/MR app for Meta VR devices | ✅ IWSDK WebXR, Quest 3/3S + VR Glasses | — |
| Fits a track | ✅ Gaming (puzzle, seated, hands-first) | — |
| Division | ✅ New Experience — all code written after 24 Sep 2026 | Keep git history as proof |
| **Fully usable with hands end-to-end** ("can someone finish without pairing a controller?") | ✅ by design; every target is a RayInteractable reachable by pinch or gaze+pinch | Verify on device, controllers switched off |
| WebXR submission: public link judges can open | ✅ live at https://natrajexplore.github.io/packetfall_meta/ (GitHub Pages, auto-deploys from `main`) | Must stay live until ~11 Dec |
| Demo video **< 3 minutes**, public on YouTube or Vimeo, footage from Quest or XR Simulator/emulator | ⬜ | See DEMO_VIDEO_SCRIPT.md |
| Text: inspiration, how you built it, future plans, **target launch date** | ✅ drafted | See SUBMISSION.md |
| Select Track + Division on the form | ⬜ | Gaming · New Experience |
| English | ✅ | — |
| Original; third-party assets properly licensed | ✅ zero third-party assets | — |
| No logos, brand names, slogans, identifiable people | ✅ protocol names only (HTTPS, DNS, SSH, SMB, SMTP) — no vendor names in-game | Keep it that way in the video too |
| No direct Meta funding | ✅ | — |
| Only publicly released tools/SDKs | ✅ IWSDK 1.1.0-rc.2 from npm | Re-check before submit; pin if a stable release lands |
| Free to judges until winner announcement | ✅ | — |
| No changes after deadline | — | Freeze the Pages deploy at submission |
| One entry per individual | ✅ | — |

**Deadline: 18 Nov 2026, 12:00 PM PT = 19 Nov 2026, 1:30 AM IST.** Treat 18 Nov evening IST as your real deadline.

## Guidelines (not mandatory, but judges test them)

| Guideline | The test | Packetfall |
|---|---|---|
| Seated-optimized | "Airplane seat test": every interaction in a 2 ft radius | Board is 0.86 × 0.42 m on the table in front of you |
| Easy in/out | "One bus stop test": complete moment in a short ride; fast cold start; clean pause/resume | A level takes ~60–90 s; no downloads; sim pauses when the headset is blurred/hidden |
| Original, not a wrapper | "Take it away test" | Entirely self-contained; no external service |

## Judging (Stage Two, four equally weighted criteria, 25% each)

| Criterion | What they ask for | How Packetfall answers |
|---|---|---|
| **Innovation & Creativity** | Originality; uniquely leverages spatial depth, hands, gaze, passthrough, scene understanding, persistent anchors; drives repeat usage | A puzzle about a real security skill nobody has spatialised; threats come through *your* wall; rule evaluation is visible in 3D; Daily Breach drives repeat play |
| **Experience Design** | Seated, hands-first; clear onboarding; habit-forming; **purposeful passthrough** (room changes the experience); **FoV-aware** | Guided level 1 teaches with pulsing targets, not text; board fits the narrow VR Glasses FoV; portal + table placement makes the room matter |
| **Technical Implementation** | Gaze, hand tracking, passthrough, spatial anchoring, FoV; **≥60 fps on Quest**, bug-free; MRUK-equivalent scene understanding that **holds up in untested rooms** | Three-tier placement (semantic table → desk plane → floating tray), wall raycast with fallback, XRAnchor; procedural low-poly scene; unit-tested engine |
| **Polish & Presentation** | UI/UX, art direction, sound; high-quality text/images/video; **real gameplay, not AI-generated video** | Cohesive neon-on-glass art direction; synthesized SFX; capture real headset footage |

## Prize map — where to aim

Only **one prize per entry**. Gaming New: $100k winner / $50k runner-up. Special awards ($25k each) are also in play:

| Special award | Fit | Why |
|---|---|---|
| **Boldest Original Concept** | ★★★ | Threats through your own wall onto your own desk; collapses without presence and room geometry |
| **Best Reason to Come Back** | ★★★ | Daily Breach (same seed worldwide), streaks, XP ranks, stars per level |
| **Best First Five Minutes** | ★★★ | No menus; guided pinch tutorial; payoff (packets flying) inside 60 seconds |
| **Best Accessibility Forward** | ★★ | Gaze+pinch path, select-then-place (no fine motor drag), seated; add high-contrast + one-hand mode to strengthen |
| Best Agentic Interaction | ★ | SENTRY is rule-based. Only claim it if you add a genuine AI component — don't oversell |
| Social & Multiplayer | ✗ | Out of scope for 17 days |

## Biggest risks

1. **Start membership not approved in time** — the single point of failure. Apply today.
2. **No headset access** — the rules allow emulator footage, but Technical Implementation explicitly checks Quest performance and real rooms. Borrow or buy a Quest 3/3S for at least the last week.
3. **IWSDK release-candidate quirks** — keep tests green, test on device early (by 6 Nov).
4. **Scope creep** — the official blog's own tip: one finished mechanic beats a broad prototype. Polish over features.
