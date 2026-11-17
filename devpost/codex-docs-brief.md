# Task brief for Codex: Devpost submission write-up and README refresh

## Context
- **Project:** ChalkLess, a Snap Specs Lens that guides a tailor through cutting a garment. The pattern lies at real size on the fabric and one cut line glows at a time.
- **Folder:** `C:\Users\User\Desktop\chalkless-lens`.
- **Hackathon:** Learn AR with SPECS on Devpost (deadline Dec 5, 2026). Read https://learn-specs.devpost.com/resources if you can reach it.
- **Read first:**
  - `README.md`
  - `PROGRESS.md`
  - `devpost/design-brief.md`
  - `LICENSE`
  - the file list in `Assets/Scripts/` and `Assets/Tests/`
- **Other work in progress:** Claude is working in this folder on Lens code (scripts, scene, tests). **This task is docs only.**

## Your files
- **New:** `devpost/submission.md`, the Devpost write-up. It's a **local draft only**: it's gitignored, so it never gets committed or pushed. It gets pasted into Devpost on submission day.
- **Rewrite:** `README.md`.
- **Don't touch** anything under `Assets/`, `Packages/`, `PROGRESS.md`, `LICENSE` or `.claude/`.
- **Before you commit,** run `git pull --rebase origin main`.
- **Stage only** `README.md`. Never commit `devpost/submission.md`; it stays local.

## Writing style (strict)
- **Human and plain.** Short sentences. Write like a person, not like marketing copy. No hype words ("revolutionary", "seamless", "cutting-edge", "game-changer").
- **No em dashes (—) anywhere.** Use a comma, a colon or a full stop instead. Check with a search before you commit.
- **Global framing.** ChalkLess is for tailors and dressmakers everywhere: suits, dresses and trousers alongside traditional styles like the agbada. Don't frame it as only for one country.
- **Be honest about status.** Say clearly what is proven in the Lens Studio preview and what still needs a real Specs device ("logic proven" vs "feel unproven").

## `devpost/submission.md`: sections to write
1. **Tagline:** one line, for example "Cut right the first time: a pattern that lies on your fabric and lights up one cut at a time."
2. **Inspiration:** chalk lines, paper patterns and wasted fabric. One wrong cut on expensive cloth costs the tailor and the client.
3. **What it does:** the full flow:
   1. find the table
   2. find the fabric (or align by hand)
   3. pick one of 16 styles
   4. enter measurements (±1 and ±5 cm buttons)
   5. the pattern appears at real size
   6. cut step by step, one glowing line at a time, with a label, arrows, a dashed seam allowance, a step card ("Step 3 of 7"), progress dots, and a Next button or voice "next" / "back"
   7. a summary card with the pieces cut and an estimate of fabric saved
4. **Why it belongs on glasses:**
   - Both hands stay on the scissors and the cloth.
   - The eyes stay on the fabric.
   - The lines are at true size in the world, so there's no screen to look away to.
5. **Walking around a big cut:** content is world-anchored, and Specs tracks its position in the room (6DoF/SLAM). For a big agbada lay, the tailor walks to the other side of the table and the pattern stays locked to the cloth like real chalk. The step card and labels turn to face the tailor wherever they stand. That part is being built now; describe it as the design and mark its status as "in progress".
6. **How we built it:**
   - Lens Studio 5.25, TypeScript.
   - Spectacles Interaction Kit and UI Kit, for pinch, poke and drag with hand tracking.
   - World Query hit testing to find the table.
   - The Camera Module plus a small colour and texture segmentation to find the fabric's edges, projected onto the table plane.
   - The ASR module for voice.
   - A pattern-recipe engine: each style builds its pieces from measurements using standard drafting rules (pieces on the fold, quarter chest or hip plus ease, 1.5 cm seam allowance) and sets the cut order.
   - LEAF tests driven by real pinch and drag input: 20 flow tests, plus detection tests (D1, D2) and a voice test (V1). Claude will confirm the final numbers. Write "23 tests" and leave a `<!-- confirm count -->` comment beside it.
7. **Styles:** the 16, grouped as:
   - **Everyday and tailoring:** suit, blazer, joggers, palazzo
   - **Dresses:** A-line, sheath, wrap, maxi gown, corset, wrap skirt
   - **Traditional:** kaftan long and short sleeve, bubu, buba, agbada, dashiki
8. **Challenges:**
   - the additive display (black is invisible, so everything is light and glowing)
   - the narrow field of view, so controls stay near the hands
   - a big lay like the suit split into jacket then trousers
   - a preview with no real camera, so the fabric finder is tested with a synthetic image
   - a Lens Studio plugin that kept deleting a project folder
9. **Accomplishments:**
   - the full flow, from table to summary card, for 16 styles
   - every test driven by real input
   - the fabric finder accurate to within a pixel on test images
10. **What we learned:** short and honest.
11. **What's next:**
    - testing on a real Specs device with real tailors
    - using the detected fabric angle
    - saved anchors, so the pattern stays when you take the glasses off and come back
    - more styles
    - tailor-specific pattern tweaks
    - the same pattern engine on Android XR glasses and Meta Quest
12. **Logic proven / feel unproven:** a short two-column table.
13. **Built with:** a comma-separated tag list (lens-studio, snap-specs, typescript, spectacles-interaction-kit, ...).

Keep it under about 900 words, not counting the tables.

## `README.md`: refresh
Keep the current structure: intro, Who it's for, How it works, Styles, the detection pipeline, Running it, Tests, Project layout, Status and limits, License. Then:
- **Add:** a "Walking around the table" section (same content as section 5 above).
- **Add:** a "Voice" section: say "next" or "back" while cutting, the button always works, and voice may not work in the Lens Studio preview.
- **Update:** the detection pipeline statuses. Table and fabric finders are now built, with the preview falling back to the stand-in; real-device use is unverified. Fabric rotation isn't applied yet.
- **Update:** the Tests section to list the C, S, G, D and V groups.
- **Update:** the Project layout section with the new scripts (`ChalkLessTableFinder.ts`, `ChalkLessFabricFinder.ts`, `ChalkLessFabricVision.ts`, `ChalkLessVoice.ts`).
- **Keep** the License section as it is.

## Rules
- **Commits:**
  - Plain messages, for example "Devpost submission draft and README refresh".
  - **No co-author lines and no AI attribution** of any kind.
  - Push to `origin main`.

## Done when
- `devpost/submission.md` exists and the README is refreshed.
- A search finds no "—" in either file.
- The README is committed and pushed. `submission.md` stays local and is not committed.
- You report back with the commit hash and any facts you weren't sure about.
