# Testing

## Judge testing instructions (paste into Devpost)

1. On Meta Quest 3/3S, open the project URL in **Meta Quest Browser**.
2. Sit at a desk or table. Put controllers down — the game is hands-only.
3. Pinch **Enter mixed reality** and allow passthrough / spatial data when prompted.
4. The board appears on your table (or floating in front of you if no table is found). Pinch **RECENTER** to move it.
5. Level 1 guides you: pinch the glowing card, pinch the slot, pinch **DEPLOY**.
6. Pinch **DAILY** to play today's Daily Breach. Progress saves on the device.

## Automated checks

```bash
npm test        # 8 tests: first-match engine, default deny, SENTRY text, campaign solvability, 365 daily puzzles
npm run check   # typecheck + tests + production build
```

What was verified in development:
- Typecheck and production build pass; dev-only automation hooks are stripped from production.
- Full logic play-through (tutorial → deploy → packets resolve → stars; trap card → 3 breaches + correct SENTRY message; retry keeps layout → promotion; daily loads).
- In the IWSDK emulator's living room, placement put the board on the coffee table in front of the player and the portal on the far wall.

Known gap: in a flat desktop browser (no XR session), mouse clicks hit the wrong target in headless testing — this is IWSDK's desktop pointer bridge, which is switched off inside XR. Check it in a headed browser; it does not affect headset play, but fix it before showing desktop footage.

## Device QA checklist (Quest 3/3S)

- [ ] Complete level 1 with controllers powered off
- [ ] Every card, slot, button selectable by pinch in under 2 tries
- [ ] Text readable from a seated position
- [ ] ≥60 fps during a 10-packet daily (OVR Metrics overlay)
- [ ] Placement: desk, dining table, sofa + coffee table, standing with no table
- [ ] Portal: room with a wall in front, room facing a window/open space
- [ ] Headset off mid-wave → back on → resumes
- [ ] Progress survives closing and reopening the browser
- [ ] Meta VR Glasses emulator (`iwsdk-glasses-test` skill): all targets inside the FoV, gaze+pinch works
