---
status: approved
---

# Design brief: ChalkLess, cut right the first time

## The one spatial moment
A tailor stands at the cutting table with scissors in hand. The full-size buba pattern lies on the fabric. Only the next line to cut glows, with a short label and arrows, so the tailor cuts with both hands free and eyes on the cloth.

## Why it belongs on glasses
- Uses: draws in the world, leaves your body free
- Why it's better than the phone or laptop version: both hands are on the scissors and the cloth. The lines sit on the fabric at true size, so there's no chalk and no looking away at a screen. One wrong cut on costly aso-oke or lace wastes the fabric and the client's money.

## Product or overlay
- Type: overlay. In real use it lies on the tailor's own table and fabric.
- What the real version would sense: the table surface and the fabric edge
- Stand-in for the preview: a virtual cutting table with virtual fabric on it. Table about 180 × 90 cm, top 90 cm high, about 60 cm in front of the user (default). Fabric about 150 × 80 cm (default), a light, plain cloth so the glowing lines stand out (default). Real tables and fabrics vary (any material: suit cloth, ankara, kaftan fabric), so the real version adapts to them.

## Where things live
- Where the user is looking during the main task: down at the fabric on the table, near their hands
- Garment menu: a small panel floating just above the far edge of the table, facing the user, about 30 cm wide (default). Buba is active; wrapper skirt and kaftan are greyed placeholders that say "Coming soon".
- Measurement pad: same spot as the menu, after Buba is chosen. The standard tailor measurements for a buba, shown one at a time with big − / + buttons and a big "Next measurement" button: neck, shoulder, chest, top length, sleeve length, round sleeve (arm), hip. Steps of 1 cm (default). Start values (default): neck 40, shoulder 46, chest 100, top length 70, sleeve length 25, round sleeve 36, hip 104 cm. A small live preview of the pattern resizes as values change.
- Pattern: lies flat on the fabric at real size, built from the measurements (front piece on the fold, plus sleeve).
- Step label: flat on the fabric right beside the current line, large light text, one short line, e.g. "Cut neckline: 12 cm curve".
- Summary card: stands up at the far edge of the table when all cuts are done.

## Hands and input
- Choose garment: pinch the Buba button
- Set measurements: pinch big − / + buttons, then a big "Place pattern" button
- Align pattern: pinch-drag the pattern across the fabric to line it up with the fabric edge; a big "Start cutting" button locks it
- Next step: pinch a big "Next" button next to the step label
- Targets are big and highlight when aimed at.
- Voice: saying "next" does the same as the Next button. The button always works if voice doesn't work in the preview.

## When things show
- Menu: shows at start, hides once Buba is picked
- Measurement pad: shows after Buba, hides when the pattern is placed
- Steps, in this order: fold, measure, neckline, shoulder, sleeve, side seam, hem. Fold shows the fold line; measure shows the neck, shoulder, chest, length, sleeve and hip marks with their cm values; the rest are cuts. Each cut line glows with direction arrows and a dashed seam-allowance line 1.5 cm outside it (default). Lengths in labels are calculated from the measurements.
- Only the current step glows; finished lines turn grey; lines not reached yet stay faint
- Summary card: shows after the hem, with pieces cut and fabric saved against a standard chalk layout (fabric-saved figure is a calculated estimate, default)
- If something needs attention out of view: none. Everything stays on the table in front of the user.

## Done criteria
Each one can be checked in Lens Studio's preview.
1. Pinching Buba on the menu opens the measurement pad.
2. Stepping through the seven standard measurements and changing any of them with the big buttons visibly resizes the pattern.
3. Pinch-dragging the pattern moves it across the fabric.
4. Only one line glows at a time, with its label, arrows and a dashed seam-allowance line.
5. Pinching Next greys the current line and lights the next, through all seven steps, and after the hem the summary card appears.

## Out of scope
- Real fabric and table detection
- Garments other than the buba (wrapper skirt and kaftan are menu placeholders only)
- Sewing steps after cutting
- Hausa and Igbo voice

## Risks and open questions
- Voice "next" may not work in the preview; the Next button carries the demo.
- Fabric-saved figure is an estimate, not a measured comparison.
- Feel unproven: reading thin glowing lines on real patterned fabric (ankara, lace), and real hand tracking while holding scissors.

## Build notes for CLAD
- Build for SPECS so it runs and can be demonstrated in Lens Studio's preview. No SPECS device is available.
- Use Spectacles Interaction Kit (SIK) and UI Kit for all interactions, so they work with the mouse in Interactive Preview and with LEAF.
- Build any stand-in exactly as described above, and keep it obvious in the scene.
- Use real-world scale in centimeters. Keep content inside the user's view during the main task.
- The display is additive: black renders as transparent. Don't rely on black or very dark content to be seen; keep text light and readable from where the user stands.
- Get the basic flow working first, then add detail.
- Write LEAF scenarios for each done criterion, run them in preview, and report which pass. Say which criteria have no test.
- Don't record, identify, or follow people.

## After the build: judge it
This part is for you, after CLAD finishes.

1. **Does it work?** Ask your agent which LEAF tests passed and which done criteria have no test.
2. **Walk around it.** Open the preview in Interactive Preview. Use WASD to move, Q and E to go down and up, and right-drag (or hold Shift) to look around. Clicking acts as a pinch. Stand where a user would and look at the task.
3. **Ask the three questions.**
   - Does it use what I'm looking at?
   - Does it put something in my space, where it belongs?
   - Does it free my hands or let me keep my eyes up?
   - Would it be just as good on a phone? If so, what would make it need the glasses?
4. **Check comfort.**
   - Everything I need is in view while I do the task. Nothing sits at the edges, behind me, or stuck to my face.
   - Every control is within reach of someone standing there.
   - Text reads easily from where I stand. No dark UI disappearing.
   - Things show when needed and get out of the way.
5. **Label what you know.** Write "logic proven" next to anything the tests and preview show working, and "feel unproven" next to anything only real glasses could tell you (comfort over time, real hand tracking, real recognition).
6. **Fix with design notes, not code.** Tell your agent what to change in design terms, for example: "Move the step card 15 cm lower and next to the pan. Make the Next button twice as big. Re-run the tests." If a fix takes under a minute, like nudging a panel, do it yourself in the scene.
7. **Submit.** Record a video under 3 minutes of your Lens in the preview, public on YouTube. Make your repo public with your Lens Studio project and this `devpost/` folder. Details are on the hackathon site: https://learn-specs.devpost.com/resources
