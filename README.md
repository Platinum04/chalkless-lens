# ChalkLess — cut right the first time

ChalkLess is a Lens for **Snap Specs** AR glasses that guides tailors through cutting a garment, with no chalk and no paper pattern.

The tailor picks a style, enters the client's measurements, and the glasses lay a full-size pattern on the fabric. ChalkLess then lights up **one line at a time**, in the right order, with a short label ("Cut neckline — 12 cm curve"), direction arrows and a dashed seam-allowance line. Both hands stay on the scissors and the cloth, and eyes stay on the fabric. One wrong cut on costly aso-oke or lace wastes the fabric and the client's money. ChalkLess is built to prevent that.

## How it works

0. **Find the table and the fabric.** When the tailor puts on the glasses, ChalkLess finds the flat cutting-table surface and then the edges of the fabric lying on it, so the pattern can snap to the cloth. (In progress; see the pipeline below.)
1. **Choose a style.** Pinch a garment on the menu floating above the table.
2. **Enter measurements.** Set the standard tailor measurements one at a time with big − / + buttons: neck, shoulder, chest, top length, sleeve length, round sleeve, hip. A mini preview of the pattern resizes as you go.
3. **Place the pattern.** The pattern appears at real size on the fabric. Pinch-drag it to line it up with the fabric edge, then press **Start cutting**.
4. **Cut in order.** Only the current line glows. Press **Next** (or say "next") when it's cut. Finished lines turn grey and lines still to come stay faint.
   - Buba order: fold → measure → neckline → shoulder → sleeve → side seam → hem.
5. **Summary.** After the last cut, a card shows the pieces cut and an estimate of the fabric saved against a standard chalk layout.

## Styles

| Style | Cut order |
|---|---|
| Buba (top) | fold → measure → neckline → shoulder → sleeve → side seam → hem |
| Kaftan, long sleeve | fold → measure → neckline → placket → shoulder → sleeve → side seam + slit → hem |
| Kaftan, short sleeve | same as long sleeve, with short sleeves |
| Agbada | fold → measure → V-neck → embroidery panel (marked) → shoulder → sleeve opening → side seam → hem |
| Dashiki | fold → measure → V-neck → yoke (marked) → shoulder + sleeve → sleeve end → underarm + side → hem |
| Ladies' corset | fold → measure + grainlines → panels, front to back (6 panels, 11 pieces) |
| Wrapper skirt | fold → measure → waistband → waist + side edges → hem |
| Suit (jacket + trousers) | fold → measure → jacket front + lapel → jacket back → sleeve → collar → trouser front → trouser back → waistband |
| Blazer | fold → measure → front + lapel → back → top sleeve → under sleeve |
| Joggers | fold → measure → front → back → waistband → cuff |
| Palazzo trousers (ladies) | fold → measure → front → back → waistband |
| Bubu (ladies' gown) | fold → measure → neckline → shoulder + sleeve → sleeve end → side seam → hem |
| A-line dress | fold → measure → neckline → shoulder → armhole → side seam → hem |
| Sheath dress | fold → measure → neckline → shoulder → armhole → waist dart (marked) → side seam → hem |
| Wrap dress | fold → measure → back → wrap front → sleeve → tie |
| Maxi gown | fold → measure → neckline → shoulder → armhole → bodice side → skirt waist → skirt side → skirt hem |

16 styles from around the world, from Nigerian classics to everyday global wear, on a two-page menu.

All styles work in the preview. Each style is a pattern recipe: it builds the pattern pieces from the measurements and sets the order of the cuts. The fabric can be anything: ankara, aso-oke, lace, suit cloth or kaftan fabric.

## Table and fabric detection pipeline

| Stage | How it works on Specs | Status |
|---|---|---|
| 1. Find the table | **World Query** hit-tests where the tailor is looking and returns a flat, roughly horizontal surface with its height and orientation. The tailor confirms it with a pinch, and ChalkLess anchors the work area there. | Planned next |
| 2. Find the fabric | The **Camera Module** captures a frame of the table. Image processing separates the cloth from the tabletop by colour and texture, finds its four edges and corners, and projects them onto the table plane using the camera's intrinsics and depth. | Planned next |
| 3. Snap the pattern | The pattern lines up with the detected fabric edge (the straight grain and the fold side), and the fabric size limits where the pieces can go. | Planned next |
| 4. Manual fallback | If detection fails (busy prints like ankara, poor light, lace), the tailor pinch-drags the pattern onto the fabric. This works today. | ✅ Working |

- **In the Lens Studio preview,** a virtual table and fabric stand in for the real ones, so the full flow can be demoed and tested.
- **On real glasses,** detection runs first and falls back to the manual drag if it fails.

## Running it

- **Open:** `chalkless-lens.esproj` in **Lens Studio 5.25+**, with the Specs target.
- **Interactive Preview controls:** clicking acts as a pinch. WASD moves, Q and E move down and up, and right-drag looks around.
- **Stand-in:** the preview uses a virtual cutting table (180 × 90 cm) and a light fabric (150 × 80 cm). On real glasses the Lens would use the tailor's own table and cloth.

## Project layout

- `Assets/Scripts/ChalkLessMain.ts` — the flow controller: phases, measurements, steps.
- `Assets/Scripts/ChalkLessPattern.ts` — the pattern maths and the step labels, calculated from the measurements.
- `Assets/Scripts/ChalkLess*UI.ts` — the menu, measurement pad, pattern lines, step panel and summary card, built with the Spectacles Interaction Kit and UI Kit.
- `devpost/design-brief.md` — the approved design brief.

## Status and limits

- Proven in the Lens Studio preview. Not yet tested on a Specs device.
- Voice "next" is planned; the Next button covers it.
- The fabric-saved figure is an estimate.
- Real table and fabric detection is being built (see the pipeline above). Until then, the tailor aligns the pattern by hand.

Built for the Learn AR with SPECS hackathon.
