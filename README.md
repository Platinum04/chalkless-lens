# ChalkLess — cut right the first time

ChalkLess is a Lens for **Snap Specs** AR glasses that guides tailors through cutting a garment, with no chalk and no paper pattern.

The tailor picks a style, enters the client's measurements, and the glasses lay a full-size pattern on the fabric. ChalkLess then lights up **one line at a time**, in the right order, with a short label ("Cut neckline — 12 cm curve"), direction arrows and a dashed seam-allowance line. Both hands stay on the scissors and the cloth, and eyes stay on the fabric. One wrong cut on costly aso-oke or lace wastes the fabric and the client's money. ChalkLess is built to prevent that.

## How it works

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

All styles work in the preview. Each style is a pattern recipe: it builds the pattern pieces from the measurements and sets the order of the cuts. The fabric can be anything: ankara, aso-oke, lace, suit cloth or kaftan fabric.

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
- Real table and fabric detection is out of scope for now.

Built for the Learn AR with SPECS hackathon.
