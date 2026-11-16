# Packetfall — final Devpost submission checklist

**Deadline: 18 Nov 2026, 12:00 PM PT = 19 Nov 2026, 1:30 AM IST.** Aim to submit by the evening of **17 Nov IST**. No changes are allowed after the deadline, and the live build must stay up until the winners are announced (~11 Dec).

## 1. Account gates (without these the entry is ineligible)
- [ ] Meta account has **Developer Access** enabled (developers.meta.com).
- [ ] You are a **member of the Meta VR Start program**. Keep the approval email or a screenshot.
- [ ] Registered on the Devpost hackathon page ("Join hackathon").

## 2. Ship the build judges will test
- [ ] Apply the 16 Nov fixes (`packetfall-fixes-16nov.patch`) and push to `main`:
  ```bash
  cd packetfall_meta
  git checkout main && git pull
  git am /path/to/packetfall-fixes-16nov.patch
  npm ci && npm run check      # typecheck + 8 tests + build
  git push origin main
  ```
- [ ] GitHub repo → **Actions**: the "Deploy to GitHub Pages" run is green.
- [ ] GitHub repo → **Settings → Pages**: Source = **GitHub Actions**.
- [ ] Open **https://natrajexplore.github.io/packetfall_meta/** in a private window: the landing card loads and "Enter mixed reality" is enabled.
- [ ] If you can borrow a Quest even once: open the link in Quest Browser, enter MR, finish level 1 with controllers off, then pinch a card and immediately a slot (one pinch each should work).

## 3. Video (< 3:00, public)
- [ ] Upload `packetfall_demo_captioned.mp4` to YouTube, visibility **Public**.
- [ ] Optional but recommended: record a voice-over (use DEMO_VIDEO_SCRIPT.md) and lay it over the clean gameplay file in Clipchamp/CapCut, keeping it under 3:00.
- [ ] Open the YouTube link in a logged-out/private window to confirm it plays.

Suggested YouTube title and description:
```
Packetfall — hands-first mixed-reality firewall puzzle (Meta VR Start Developer Competition 2026)

Threats pour through your real wall. You are the firewall on your desk.
Pinch rule cards into a firewall rule stack, deploy, and watch every packet walk the rules top-down — first match wins. SENTRY explains every mistake in one sentence. A new Daily Breach every day.

Hands only · seated · built with the Immersive Web SDK (WebXR) for Meta Quest 3/3S and Meta VR Glasses.
Gameplay captured in the Immersive Web SDK headset emulator.
Play: https://natrajexplore.github.io/packetfall_meta/
```

## 4. Devpost form
| Field | What to enter |
|---|---|
| Project name | Packetfall |
| Tagline | Threats pour through your real wall. You are the firewall on your desk. |
| Track | **Gaming** |
| Division | **New Experience** |
| Story / description | Paste `docs/SUBMISSION.md` (Inspiration → What's next, incl. target launch date) |
| Built with | Immersive Web SDK, WebXR, Three.js, TypeScript, Vite, WebAudio |
| Try it out (link) | https://natrajexplore.github.io/packetfall_meta/ |
| Source | https://github.com/natrajexplore/packetfall_meta |
| Video | your public YouTube link |
| Testing instructions | Paste the "Judge testing instructions" block from `docs/TESTING.md` |
| Images | 3–5 stills from the video (title card, tutorial, SENTRY moment, promotion, Daily Breach) |

## 5. Final checks before pressing Submit
- [ ] Every link opens logged-out.
- [ ] Video < 3:00 and public.
- [ ] Text mentions no brands/logos other than the platforms the game runs on; no implied Meta endorsement.
- [ ] Submit, then confirm the entry shows as **Submitted** on your Devpost dashboard.
- [ ] Don't push to `main` after the deadline (the live build is what's judged).
