# ChalkLess — Progress

## Done
- Setup: Git 2.52, Node 24.12, gh 2.103, Lens Studio 5.25.0
- Lens Studio SPECS Base Template project at Desktop\chalkless-lens (.mcp.json present)
- GitHub repo Platinum04/chalkless-lens (private), pushed
- learn-specs skill pack + CLAD (ls-clad) installed; lens-studio MCP connected
- plan-lens done: devpost/design-brief.md approved (7 steps: fold, measure, neckline, shoulder, sleeve, side seam, hem; 7 standard measurements)
- Buba flow built (2026-11-17): table/fabric stand-in, garment menu, measurement pad with mini preview, draggable pattern, 7 glowing cut steps with labels/arrows/dashed seam allowance, summary card. Scripts in Assets/Scripts/ChalkLess*.ts
- README.md and GitHub repo description added
- LEAF tests (Assets/Tests/, Leaf 4.0.0) — all 5 done criteria PASS with real pinch/drag input:
  1. Buba opens measurement pad — PASS
  2. Measurements resize pattern — PASS (overall size only changes for top length, round sleeve, hip; other measurements reshape lines inside)
  3. Pinch-drag moves pattern — PASS
  4. One glowing line with label/arrows/seam allowance — PASS
  5. Next walks 7 steps → summary card — PASS

- All styles added (2026-11-17): Kaftan long/short sleeve, Agbada, Dashiki, ladies' corset (6 panels), wrapper skirt. Recipes in Assets/Scripts/ChalkLessStyleRecipes.ts; fabric stand-in grows for big lays (Agbada 155x104, long Kaftan 150x110)
- Chest and sleeve length now change the Buba outline (default 65x70 cm)
- LEAF re-run after styles: all 5 PASS in Preview 1 and Headless (C3 drag made longer/slower; it was flaky in headless)
- LEAF style tests S1–S6 (Kaftan long/short, Agbada, Dashiki, Corset, Wrapper): full flow with real pinches — all 11 tests PASS in Preview 1 and Headless (2026-11-17)
- Global styles (2026-11-17): suit, blazer, joggers, palazzo, bubu, A-line, sheath, wrap, maxi gown — Assets/Scripts/ChalkLessGlobalRecipes.ts; menu has 2 pages (MenuNextPageButton / MenuPrevPageButton). 16 styles total.
- Fixed: Suit asked for waist twice (jacket + trousers); now asked once (caught by LEAF).
- LEAF: 20 tests (C1–C5 Buba criteria, S1–S6, G1–G9 full style flows) — all 20 PASS in Preview 1 and Headless (2026-11-17)
- "Make it solid" done (2026-11-17): labels clamped inside fabric/wrap to 2 lines, mark labels de-overlapped; Suit shows jacket then trousers lay, Maxi bodice then skirt (fabric ≤ ~157x110); brighter teal buttons with hover/pinch states. All 20 LEAF tests PASS in both previews afterwards.

## UX phase todo (from solid-phase review + user's design concept image)
- Progress dots ("Step 3 of 7") near the step card; garment icons on menu buttons; small measurement summary card with "Edit measurements"
- Faster measurement entry (±5 cm)
- Fit: step panel/table width needs head turns (Specs FOV ~46°); keep step card near the active line
- Lays still overflow at max measurements (wrap dress ~185 wide); a few labels sit over other pieces' grey lines; Maxi bodice small/sideways
- Not eyeballed yet: hover highlight; Kaftan short, Dashiki, A-line, Sheath captures
- Devpost story: real Specs = World Query surface hit test finds the table; fabric edge recognition is roadmap (camera + CV); today the tailor pinch-drags to align

## Agreed plan (2026-11-17) — FEATURE FREEZE now
1. Voice "next": optional, off by default; Next button carries the demo
2. Make it solid: faint buttons, labels running past pieces, big lays fitting the table (suit 197x146, maxi 208x80); re-run all 20 tests after every change
3. UX and flow: faster measurement entry (±5 cm), one piece at a time for big styles, clear prompts per stage
4. Review in Interactive Preview (brief's comfort checklist) + real tailor check of shapes
5. Devpost: video <3 min (focus on one or two deep cuts, quick menu shot), write-up, repo public
6. Submit target Dec 1–2 (deadline Dec 5)

## How to run tests
- LEAF panel "Run" cancels itself in LS 5.25 ("Scenario run cancelled"). Workaround: on the LeafIndex object, tick `runOnStart` on ChalkLessScenarioClient, recompile, and grep the Lens Studio log for `LEAF-RESULT`. Untick when done.

## Rules
- Never add Claude as co-author/contributor in commits or PRs.

## Open bugs / notes
- plan-lens skill files under .agents/ and .claude/skills/ keep vanishing from disk (likely the skill-pack sync); restore with `git checkout -- .agents .claude/skills`.
- UI Kit gradient BackPlate/Primary buttons only half-render in 5.25 preview; using "simple" BackPlate + "Prism" buttons (fainter).
- Arrows/seam allowance only drawn on cut steps (not fold/measure) — by design.
