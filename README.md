# ChalkLess: cut right the first time

ChalkLess is a Lens for **Snap Specs** that guides tailors through cutting a garment. A pattern lies at real size on the fabric. One line glows at a time, with a label, direction arrows and a dashed stitching line inside the solid cutting line.

Chalk lines and paper patterns take time to transfer and check. One wrong cut on expensive cloth costs both the tailor and the client. ChalkLess aims to make the next cut clear while the tailor keeps their eyes on the fabric.

The current build is tested in Lens Studio's preview. Real table detection, camera input and use while holding scissors still need testing on Specs.

## Who it's for

Tailors and dressmakers everywhere, making suits, dresses, trousers or traditional garments such as the agbada. Some draft straight onto cloth with chalk and a tape measure. Others trace paper patterns. The work still means taking measurements, folding, marking, cutting in order and leaving seam allowance.

ChalkLess brings the pattern and cutting instructions to that work surface. Measurements are entered by the tailor. The glasses do not measure the client's body.

## How it works

0. **Welcome.** On first use a short card explains the idea and the gestures. **Start, don't show again** skips it next time.
1. **Find the table.** The table finder uses World Query to look for a level surface. The tailor confirms it with a pinch. The preview uses a virtual table instead.
2. **Find the fabric or align by hand.** The fabric finder analyses a camera frame and projects the detected corners onto the table plane. If detection is unavailable, pinch-drag the pattern into place. The detected fabric angle is not applied yet.
3. **Choose a style.** Pick one of 16 styles from the two-page garment menu.
4. **Enter measurements.** Use the minus and plus buttons in steps of 1 or 5 cm. A small pattern preview changes with the values.
5. **Place the pattern.** Align the full-size pattern on the fabric, then press **Start cutting**.
6. **Cut step by step.** The current line glows. The solid glowing line is the actual cut. The dashed line inside it is the stitching. Allowances are per edge: neck 1 cm, body 1.5 cm and hem 3 cm. Cut steps also show arrows. A nearby step card shows the instruction, a count such as "Step 3 of 7", progress dots and **Next step**. Finished lines turn grey. Future lines stay faint. Press Next or say "next". Say "back" to revisit the previous step.
7. **Read the summary.** The final card lists the pieces cut and an estimate of fabric saved against an assumed chalk layout. This is not a measured saving.

Fold and measurement steps show guides and marks rather than cutting arrows.

## Styles

16 styles are available in the preview.

| Style | Cut order |
|---|---|
| Suit (jacket and trousers) | fold, measure, jacket front and lapel, jacket back, sleeve, collar, trouser front, trouser back, waistband |
| Blazer | fold, measure, front and lapel, back, top sleeve, under sleeve |
| Joggers | fold, measure, front, back, waistband, cuff |
| Palazzo trousers | fold, measure, front, back, waistband |
| A-line dress | fold, measure, neckline, shoulder, armhole, side seam, hem |
| Sheath dress | fold, measure, neckline, shoulder, armhole, waist dart (marked), side seam, hem |
| Wrap dress | fold, measure, back, wrap front, sleeve, tie |
| Maxi gown | fold, measure, neckline, shoulder, armhole, bodice side, skirt waist, skirt side, skirt hem |
| Corset | fold, measure and grainlines, then 6 panels from front to back (11 pieces) |
| Wrap skirt | fold, measure, waistband, waist and side edges, hem |
| Kaftan, long sleeve | fold, measure, neckline, placket, shoulder, sleeve, side seam and slit, hem |
| Kaftan, short sleeve | same as long sleeve, with short sleeves |
| Bubu (loose gown) | fold, measure, neckline, shoulder and sleeve, sleeve end, side seam, hem |
| Buba (top) | fold, measure, neckline, shoulder, sleeve, side seam, hem |
| Agbada (wide robe) | fold, measure, V-neck, embroidery panel (marked), shoulder, sleeve opening, side seam, hem |
| Dashiki | fold, measure, V-neck, yoke (marked), shoulder and sleeve, sleeve end, underarm and side, hem |

Each recipe builds pieces from measurements and defines their cut order. The drafting rules include pieces on the fold and a quarter chest or hip plus ease. Cut guides include per-edge allowances: neck 1 cm, body 1.5 cm and hem 3 cm. These are starting blocks, not patterns validated for every body or fabric.

## Table and fabric detection pipeline

| Stage | How it works | Status |
|---|---|---|
| Find the table | World Query hit testing looks for a near-level surface below the eyes. A light reticle marks it. The tailor confirms or skips. | Built. Preview falls back to the stand-in. Real-device detection is unverified. |
| Find the fabric | The Camera Module supplies a frame. A small colour and texture segmentation pass finds the cloth region and its corners. Camera calibration and ray-plane intersection project the corners onto the table. | Built. Synthetic-image maths tested. Real camera use is unverified. |
| Position the pattern | Detected cloth centre and size set the work area. The pattern starts against the assumed fold edge. | Built. Detected fabric rotation is not applied yet. |
| Align by hand | Pinch-drag the pattern when detection is unavailable or the alignment needs adjusting. | Working in the preview. Real hand tracking still needs device testing. |

The preview has no real camera feed for this workflow. A virtual table and fabric let the rest of the flow run. A synthetic image tests the segmentation separately. Similar cloth and table colours, lace and uneven light still need real-world trials.

## Walking around the table

The pattern stays locked to the stationary cloth as the tailor walks around the table. Labels and the step card face the tailor, and floating panels follow. Long lays turn along the table with the cloth, keeping the grain direction relative to the cloth.

Nearest-edge placement and far-side readability remain under review. Real Specs tracking and comfort still need device testing. Saved anchors for leaving and returning are future work.

## Voice

While cutting, say **"next"** to advance or **"back"** to revisit the previous step. Back does nothing on the first step. Voice commands are ignored outside cutting.

The ASR component accepts final transcripts and limits commands to one every 800 ms. It also accepts "next step", "go on", "go back" and "previous".

The **Next step button stays usable** whether voice is available or not. Voice may not work in the Lens Studio preview. If ASR is unavailable, the Lens prints `ChalkLess: voice unavailable, use the Next button` and continues. Microphone recognition and the combined camera/voice workflow need device testing.

## Running it

- **Open:** `chalkless-lens.esproj` in **Lens Studio 5.25 or later**, with the Specs target.
- **Interactive Preview controls:** clicking acts as a pinch. WASD moves, Q and E go down and up, and right-drag looks around.
- **Stand-in:** a virtual cutting table and fabric replace real camera detection in the preview. The fabric starts at 150 × 80 cm and grows for larger lays.
- **Large patterns:** long kaftan separates body and sleeves. Suit separates jacket body, sleeve/collar, trouser front, trouser back and waistband. Joggers and palazzo separate the legs and bands. Wrap dress separates back, wrap fronts and sleeves/ties. Maxi separates bodice and skirt. Step order and step ids stay unchanged.

## Tests

The suite contains **24 tests** in `Assets/Tests/`:

| Group | Coverage |
|---|---|
| C1 to C5 | Buba selection, measurement changes, dragging, active-line guides and progression to the summary. |
| S1 to S6 | Full flows for long and short kaftan, agbada, dashiki, corset and wrap skirt. |
| G1 to G9 | Full flows for suit, blazer, joggers, palazzo, bubu, A-line, sheath, wrap and maxi gown. |
| D1 | Detection fallback and the table prompt's Skip button. |
| D2 | Synthetic fabric segmentation, detected angle and projection maths. |
| V1 | Injected voice transcripts, next/back, line states, debounce and the Next button. |
| W1 | First-run welcome card: shows before the table step and Start (real pinch) moves on. |

The UI flow tests drive real SIK pinch and drag events in the preview. D2 uses synthetic pixels. V1 enters cutting through real button pinches, then injects text without a microphone.

All 24 tests passed in Preview 1 on 22 November 2026. Headless verification is pending. D2's rotated-rectangle image produced a worst corner error of about 0.71 pixels; its test tolerance is 2 pixels. This does not establish accuracy on real cloth. 

`PROGRESS.md` describes the local test runner workaround. These checks establish preview logic, not real-world fit or cutting accuracy.

## Project layout

- `Assets/Scripts/ChalkLessConstruction.ts`: joined cut allowances and whole-lay rotation with grain kept.
- `Assets/Scripts/ChalkLessViewer.ts`: viewer position and walk-around facing helpers.
- `Assets/Scripts/ChalkLessMain.ts`: phases, measurements, style selection and next/previous step actions.
- `Assets/Scripts/ChalkLessPattern.ts`, `ChalkLessStyleRecipes.ts`, `ChalkLessGlobalRecipes.ts`: drafting maths and style recipes.
- `Assets/Scripts/ChalkLess*UI.ts`, `ChalkLessGarmentIcons.ts`: menu, measurement pad, pattern, step card, summary and garment icons.
- `Assets/Scripts/ChalkLessTableFinder.ts`, `ChalkLessTableFinderUI.ts`: World Query surface selection and its confirm/skip prompt.
- `Assets/Scripts/ChalkLessFabricFinder.ts`: camera capture and projection of detected fabric corners onto the table plane.
- `Assets/Scripts/ChalkLessFabricVision.ts`: colour and texture segmentation and geometry helpers, without scene dependencies.
- `Assets/Scripts/ChalkLessVoice.ts`: optional ASR commands and safe fallback.
- `Assets/Tests/`: LEAF flow, detection and voice scenarios.
- `devpost/design-brief.md`: the original approved design brief. The build has since expanded beyond its Buba-only scope.
- `devpost/submission.md`: the Devpost write-up draft.

## Status and limits

Maximum-size Agbada and Maxi contain single pieces larger than the table. Their shapes and true scale are preserved. An on-fabric note says: **Large size: lay continues past the table edge, slide the cloth**. Sliding and re-alignment need tailor approval before cutting real fabric. The pattern stays locked in world space and does not track moving cloth; realign it after moving the cloth.

The largest Agbada body is about 170 × 124 cm; the largest Maxi skirt lay is about 146 × 118 cm, including cutting allowances. These limits cannot be removed by separating existing pieces into more lays.

| Logic proven in preview | Feel unproven on a Specs device |
|---|---|
| Measurement-driven recipes and the 16-style cutting flow. | Garment fit and useful drafting accuracy with real tailors. |
| Pinch/drag UI and one active step at a time. | Hand tracking while holding scissors, reach and comfort. |
| Stand-in fallback and synthetic segmentation maths. | Real table hits, camera projection and detection across fabrics and lighting. |
| Transcript matching, debounce and button fallback in V1. | Spoken command reliability with a real microphone. |

Walk-around labels and cards are implemented in preview; far-side checks remain pending. The detected fabric angle is not applied yet. Saved anchors are not built. The pattern does not follow cloth that is moved after alignment. The summary's fabric-saving figure is an estimate based on layout margins, not a measured comparison.

## License

Copyright © 2026 Awodi Abdulmujeeb. The ChalkLess code and docs are released under the [MIT License](LICENSE).

Snap's packages included in this project (the Spectacles Interaction Kit, Spectacles UI Kit, LEAF and others in `Packages/`) belong to Snap Inc. and stay under their own licenses.

Built for the Learn AR with SPECS hackathon.

