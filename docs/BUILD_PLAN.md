# 17-day plan to 18 Nov 2026 (IST)

Real deadline: **18 Nov 2026, evening IST** (official: 12:00 PM PT 18 Nov = 1:30 AM IST 19 Nov).
What already exists: playable vertical slice — 6 levels, daily generator, progression, SENTRY, placement, anchors, gaze config, tests, Pages workflow.

| Day | Date | Goal | Done when |
|---|---|---|---|
| 1 | Sun 1 Nov | **Apply to Start**, enable Developer Access, join Devpost, push repo, enable Pages | Pages URL loads on a phone |
| 2 | Mon 2 Nov | First headset run (Quest 3/3S): enter MR, placement, pinch every target | Level 1 completable with hands only |
| 3 | Tue 3 Nov | Fix device-only issues (hit targets, text size, pinch reliability) | No missed pinches in 10 tries |
| 4 | Wed 4 Nov | Performance pass: OVR Metrics / `metavr` perf; hold ≥72 fps | Stable ≥60 fps through a 10-packet daily |
| 5 | Thu 5 Nov | Placement in 3 real rooms (desk, dining table, sofa + coffee table), no wall, cluttered | Never spawns behind you; tray fallback works |
| 6 | Fri 6 Nov | Meta VR Glasses check with `iwsdk-glasses-test` emulator: FoV fit, gaze+pinch | Every target reachable with gaze alone |
| 7 | Sat 7 Nov | Direct-grab option: pinch-and-drag a card into a slot (keep tap-to-place) | Both methods work |
| 8 | Sun 8 Nov | Juice: packet trails, slot hit particles, server glow, haptic-like audio | Feels satisfying in 30 s |
| 9 | Mon 9 Nov | Accessibility: high-contrast mode, larger text toggle, one-hand mode | Toggles persist |
| 10 | Tue 10 Nov | Level design: tune 6 levels; add 2–4 more (time limits optional) | Playtest with 3 people, note confusion |
| 11 | Wed 11 Nov | Fix playtest issues; first-five-minutes polish (no text needed) | A non-engineer clears level 3 unaided |
| 12 | Thu 12 Nov | Pause/resume + session restore (mid-level resume) | Headset off/on mid-wave resumes cleanly |
| 13 | Fri 13 Nov | **Feature freeze.** Bug bash | Zero known crashes |
| 14 | Sat 14 Nov | Record gameplay footage (multiple takes, seated, good light) | 10+ min of raw footage |
| 15 | Sun 15 Nov | Edit video < 3:00, captions, upload unlisted → public | Video link works logged-out |
| 16 | Mon 16 Nov | Finish Devpost text, screenshots, thumbnail; submit a **draft early** | Draft saved on Devpost |
| 17 | Tue 17 Nov | Final device test from the public Pages URL; **submit** | Submission confirmed |
| — | Wed 18 Nov | Buffer only. Don't touch the build after submitting | — |

## Daily habit
`npm run check` before every push. Test on device at least every other day.

## Cut list if behind (in order)
1. Extra levels beyond 6
2. Direct-grab mode
3. Visual juice beyond trails
Never cut: hands-only completion, placement fallback, 60 fps, the video.
