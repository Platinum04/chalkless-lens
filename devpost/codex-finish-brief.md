# Task brief for Codex: finish ChalkLess (take over from Claude)

- **Project:** ChalkLess, a Snap Specs Lens in Lens Studio 5.25 (TypeScript).
- **Folder:** `C:\Users\User\Desktop\chalkless-lens`.
- **Read first:**
  - `AGENTS.md`
  - `README.md`
  - `PROGRESS.md`
  - `devpost/design-brief.md`
  - `devpost/pattern-review.md` (your own local notes)
- **Latest code commit:** `1bfb5f0`, which adds:
  - long lays turned along the table
  - instant measurement taps
  - walk-around labels, card and panels
  - stand-ins hidden after detection

## Hard rules
- **Lens Studio:** use the Lens Studio MCP tools only, never raw HTTP calls to Lens Studio.
- **Commits:**
  - plain messages
  - **no co-author lines and no AI attribution**
  - stage explicit paths only (never `git add -A`)
  - `git pull --rebase --autostash origin main`, then `git push origin main`
- **Never commit** `Assets/Tests/ChalkLessScenarioClient.ts` or its `.meta`, because Lens Studio flips `runOnStart` in them.
- **Local-only drafts, never commit:** `devpost/submission.md`, `devpost/video-script.md`, `devpost/pattern-review.md`.
- **Writing:** no em dashes (—) in any docs or user-visible Lens text. Plain, human wording, with a global framing.
- **Display:** Specs' display is additive, so use light visuals only. Black is invisible.

## How to run the LEAF tests (the LEAF panel's Run button cancels itself in 5.25)
1. On the `LeafIndex` SceneObject, set the `ChalkLessScenarioClient` component to `runOnStart = true` and `only = ""` (via ExecuteEditorCode, or in the Inspector). Or flip the default in `Assets/Tests/ChalkLessScenarioClient.ts` temporarily.
2. Recompile with RecompileTypeScriptTool. The suite runs in the "Preview 1" and "LensPreview Headless Preview" previews.
3. Search the newest log in `C:/Users/User/AppData/Local/Snap/Lens Studio/logs/` for `LEAF-RESULT` and `FAILED:`. It's finished when `[LEAF-RESULT] done` appears.
4. Set `runOnStart` back to false afterwards. Never commit the runner files.

There are 23 tests: C1–C5, S1–S6, G1–G9, D1, D2 and V1.

## Task 1: fix the failing tests (top priority)
After `1bfb5f0`, the latest run gave:
- **Passed:** C1–C5 and S1.
- **Failed:** S2 (Kaftan short), S3 (Agbada) and S4 (Dashiki) each **timed out after 600 s**.
- **Not reached:** everything after S4.

Likely causes, all from `1bfb5f0`:
1. **Card placement:** the new card placement in `ChalkLessMain.placeCardNearActiveLine()`, now scored by distance to the tailor's position, may be slow or may loop.
2. **Lay rotation:** `rotateLongLay()` in `ChalkLessConstruction.ts` may cause a build or placement loop.
3. **Follow logic:** the per-frame walk-around code in `ChalkLessViewer.ts` (panels, labels and card lazy-follow) may keep re-placing the card. That can block the StepActionButton, or move it so the test's pinch misses.

Debug with the S2 test alone (`only = "s2-kaftan-short"`). Fix the Lens code, not the tests: test expectations are correct unless they truly contradict the brief. Re-run until **all 23 pass in both previews**.

## Task 2: leftovers (after all 23 pass)
1. **Seven styles overflow the table at max measurements:** Kaftan long, Agbada, Suit, Joggers, Palazzo, Wrap dress and Maxi go past about 180×115 cm. Split their lays into more groups, the way Suit and Maxi do with `splitLay`. Keep the step order and step ids unchanged.
2. **Far-side check:** use `debugTailorOffset` (for example `0,70,-110`) and capture the far side: the menu, summary card and table-finder panel. Check that buttons are still reachable and readable there.
3. **Panel position:** when the tailor moves to another side, the floating panels (menu, measurement pad, summary) should go to the table edge **nearest** the tailor, not the far side.
4. **Debug inputs:** reset them all (`debugJumpToStep -1`, `debugStyleId buba`, `debugMaxMeasurements false`, `debugTailorOffset 0,0,0`) and save.
5. **`.gitignore`:** Lens Studio appended a "Shipped by Lens Studio" block. Keep it and commit it.

Re-run all 23 tests after Task 2, then commit and push.

## Task 3: docs (after the tests pass)
1. **`README.md`:**
   - Add the walk-around behaviour: the pattern is locked to the cloth, while the labels and step card face the tailor and the panels follow.
   - Add the cut line and stitch line fix: the solid glowing line is the real cut, and the dashed line inside it is the stitching. Allowances are per edge: neck 1 cm, body 1.5 cm, hem 3 cm.
   - Mention that long lays turn along the table with the grain kept.
   - Update the test count to 23 and the groups to C, S, G, D and V.
   - Update the Project layout section with `ChalkLessConstruction.ts`, `ChalkLessViewer.ts`, `ChalkLessTableFinder.ts`, `ChalkLessFabricFinder.ts`, `ChalkLessFabricVision.ts` and `ChalkLessVoice.ts`.
2. **`PROGRESS.md`:** record what's done and what's still open.
3. **`devpost/submission.md`** (local only): update it with the same facts.

## Done when
- All 23 LEAF tests pass in both previews.
- The leftovers are fixed, or written up in `PROGRESS.md` if not possible.
- The docs are updated.
- Everything is pushed with no AI attribution.
- You report: the commits, the test results, and anything still open.

## After this (for the user, not Codex)
1. The user's own walkthrough in Interactive Preview, using the brief's comfort checklist.
2. A real tailor's review, using the checklist in `pattern-review.md`.
3. Record the demo video with `video-script.md`.
4. Make the repo public and submit on Devpost before **Dec 5** (target Dec 1–2).
