# ChalkLess: cut right the first time

ChalkLess is a Lens for **Snap Specs** AR glasses that guides tailors through cutting a garment, with no chalk and no paper pattern.

The tailor picks a style and enters the client's measurements, and the glasses lay a full-size pattern on the fabric. ChalkLess then lights up **one line at a time**, in the right order. Each line has a short label ("Cut neckline, 12 cm curve"), direction arrows and a dashed seam-allowance line. The tailor keeps both hands on the scissors and the cloth, and their eyes on the fabric.

One wrong cut on expensive fabric like silk, wool suiting, lace or aso-oke wastes the material and the client's money. ChalkLess is built to stop that from happening.

## Who it's for

Tailors and dressmakers everywhere. A lot of tailors draft straight onto the fabric with chalk and a tape measure, from a small shop in Lagos to an alterations studio in London. Others trace paper patterns. Either way the job is the same:

1. Take measurements.
2. Fold the fabric.
3. Mark the pattern.
4. Cut in a sensible order.
5. Leave seam allowance.

ChalkLess does the marking for you and tells you what to cut next. It works the same whether you're making a suit, a wrap dress or an agbada.

## How it works

0. **Find the table and the fabric.** When the tailor puts the glasses on, ChalkLess finds the flat cutting-table surface, then the edges of the fabric lying on it, so the pattern can snap to the cloth. This part is in progress; see the pipeline below.
1. **Choose a style.** Pinch a garment on the menu floating above the table.
2. **Enter measurements.** Set the measurements one at a time with big buttons (−5, −1, +1, +5 cm). A small preview of the pattern resizes as you go.
3. **Place the pattern.** The pattern appears at real size on the fabric. Pinch-drag it to line it up with the fabric edge, then press **Start cutting**.
4. **Cut in order.** Only the current line glows. Press **Next step** when it's cut. Finished lines turn grey, lines still to come stay faint, and a row of dots shows how far you've got.
5. **Summary.** After the last cut, a card shows the pieces cut and an estimate of the fabric saved compared with a standard chalk layout.

## Styles

16 styles, from everyday wear to traditional garments, on a two-page menu.

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

Each style is a pattern recipe. It builds the pieces from the measurements using standard drafting rules (half the pattern on the fold, a quarter of the chest or hip plus ease, 1.5 cm seam allowance) and sets the order of the cuts. Any fabric works.

## Table and fabric detection pipeline

| Stage | How it works on Specs | Status |
|---|---|---|
| 1. Find the table | **World Query** hit-tests where the tailor is looking and returns a flat, level surface with its height and angle. The tailor confirms it with a pinch, and the work area anchors there. | Planned next |
| 2. Find the fabric | The **Camera Module** grabs a frame of the table. Image processing separates the cloth from the tabletop by colour and texture, finds its edges and corners, and maps them onto the table using the camera's lens data and depth. | Planned next |
| 3. Snap the pattern | The pattern lines up with the detected fabric edge (the straight grain and the fold side), and the fabric's size limits where pieces can go. | Planned next |
| 4. Manual fallback | If detection struggles (busy prints, lace, poor light), the tailor pinch-drags the pattern onto the fabric. | ✅ Working |

In the Lens Studio preview a virtual table and fabric stand in for the real ones, so the whole flow can be demoed and tested. On real glasses, detection runs first and falls back to the manual drag.

## Running it

- **Open:** `chalkless-lens.esproj` in **Lens Studio 5.25 or later**, with the Specs target.
- **Interactive Preview controls:** clicking acts as a pinch. WASD moves, Q and E go down and up, and right-drag looks around.
- **Stand-in:** the preview uses a virtual cutting table and a light fabric (150 × 80 cm, which grows for big styles).

## Tests

There are 20 LEAF tests in `Assets/Tests/`, all driven by real pinch and drag input:

- **C1 to C5:** the five done criteria from the design brief.
- **S1 to S6 and G1 to G9:** the full flow for every style, from its menu button to the summary card.

All 20 pass in the Lens Studio preview. `PROGRESS.md` explains how to run them.

## Project layout

- `Assets/Scripts/ChalkLessMain.ts`: the flow controller (phases, measurements, steps).
- `Assets/Scripts/ChalkLessPattern.ts`, `ChalkLessStyleRecipes.ts`, `ChalkLessGlobalRecipes.ts`: the pattern maths and every style recipe.
- `Assets/Scripts/ChalkLess*UI.ts`: the menu, measurement pad, pattern lines, step card and summary card, built with the Spectacles Interaction Kit and UI Kit.
- `devpost/design-brief.md`: the design brief.

## Status and limits

- **Tested so far:** in the Lens Studio preview only. It hasn't run on a Specs device yet.
- **Voice "next":** optional and not built yet. The Next button does the same job.
- **Fabric saved:** the figure on the summary card is an estimate.
- **Patterns:** they use standard drafting blocks. A tailor's own adjustments will always beat them.

## License

Copyright © 2026 Awodi Abdulmujeeb. The ChalkLess code and docs are released under the [MIT License](LICENSE).

Snap's packages included in this project (the Spectacles Interaction Kit, Spectacles UI Kit, LEAF and others in `Packages/`) belong to Snap Inc. and stay under their own licenses.

Built for the Learn AR with SPECS hackathon.
