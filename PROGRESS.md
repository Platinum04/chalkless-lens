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

## Next
- Add all styles: Kaftan (long/short sleeve), Agbada, Dashiki, ladies' corset, wrapper skirt — each a pattern recipe + cut order
- Voice "next" (not built; Next button covers it)
- Demo video plan (<3 min); make repo public or share with Devpost before Dec 5

## How to run tests
- LEAF panel "Run" cancels itself in LS 5.25 ("Scenario run cancelled"). Workaround: on the LeafIndex object, tick `runOnStart` on ChalkLessScenarioClient, recompile, and grep the Lens Studio log for `LEAF-RESULT`. Untick when done.

## Rules
- Never add Claude as co-author/contributor in commits or PRs.

## Open bugs / notes
- plan-lens skill files under .agents/ and .claude/skills/ keep vanishing from disk (likely the skill-pack sync); restore with `git checkout -- .agents .claude/skills`.
- UI Kit gradient BackPlate/Primary buttons only half-render in 5.25 preview; using "simple" BackPlate + "Prism" buttons (fainter).
- Arrows/seam allowance only drawn on cut steps (not fold/measure) — by design.
