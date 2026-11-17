# ChalkLess

## Tagline

Cut right the first time: a pattern that lies on your fabric and lights up one cut at a time.

## Inspiration

Tailors move between measurements, chalk lines, paper patterns and the cloth itself. Every transfer is another thing to check. A wrong cut on expensive fabric costs the tailor and the client. It cannot be undone with an eraser.

We wanted to bring the pattern to the fabric and make the next cut clear. ChalkLess is for tailors and dressmakers everywhere, whether they make suits, dresses, trousers or an agbada.

## What it does

The intended device flow starts by finding a level table with World Query. The tailor confirms it. A fabric finder looks for the cloth in a camera frame. When detection is unavailable, the tailor aligns the pattern by hand. The preview uses a virtual table and fabric.

The tailor picks one of 16 styles and enters measurements with ±1 and ±5 cm buttons. A small preview changes with the values. The pattern then appears at real size on the fabric and can be dragged into place.

During cutting, one line glows at a time. A short label, direction arrows and a dashed 1.5 cm seam allowance guide each cut. A nearby card shows "Step 3 of 7", progress dots and a Next button. Say "next" or "back" to change steps when voice is available. The button always works without voice.

The final card lists the pieces cut and an estimate of fabric saved. The estimate uses assumed layout margins, not a measured comparison.

## Why it belongs on glasses

Both hands stay on the scissors and the cloth. Eyes stay on the fabric. The lines sit at true size in the world, so there is no separate screen to look away to.

**Walking around the table, in progress:** the design uses Specs' six-degree-of-freedom room tracking (6DoF/SLAM). For a large agbada lay, the tailor should walk to the other side while the pattern stays locked to the stationary cloth, like real chalk. The step card and labels are being adapted to face the tailor wherever they stand. This still needs device testing.

## How we built it

We used Lens Studio 5.25 and TypeScript. The Spectacles Interaction Kit and UI Kit provide pinch, poke and drag interactions through hand tracking.

World Query hit testing finds the table. The Camera Module supplies a frame. A small colour and texture segmentation pass finds fabric corners, then projects them onto the table plane. The ASR module supplies voice transcripts. Unsupported input falls back to buttons or manual alignment.

A pattern-recipe engine builds each style from measurements and defines the cut order. Rules include pieces on the fold, quarter chest or hip plus ease, and 1.5 cm seam allowance guides.

The suite contains **23 tests** <!-- confirm count -->: 20 flow tests, detection tests D1 and D2, and voice test V1. UI checks drive real pinch and drag input. D2 supplies synthetic pixels. V1 supplies transcripts after entering cutting through button pinches. The latest full-suite result still needs confirmation. <!-- confirm latest full-suite results with Claude -->

## Styles

| Group | Styles |
|---|---|
| Everyday and tailoring | Suit, blazer, joggers, palazzo |
| Dresses | A-line, sheath, wrap, maxi gown, corset, wrap skirt |
| Traditional | Kaftan long sleeve, kaftan short sleeve, bubu, buba, agbada, dashiki |

## Challenges

The display is additive. Black is invisible, so the UI uses light text and glowing guides. The narrow field of view pushed controls closer to the hands and the active line.

Large layouts needed smaller working groups. The suit now shows the jacket before the trousers. The maxi gown separates bodice and skirt.

The preview has no real camera feed for this workflow. We test segmentation with a synthetic image instead. A Lens Studio plugin also kept deleting a project folder. Moving the skill files out of that managed folder stopped them vanishing.

## Accomplishments

The preview flow covers 16 styles, from table fallback through measurements and cutting to the summary. Flow checks exercise the actual interaction events.

The fabric finder placed corners within a pixel on the current synthetic rotated-rectangle image: about 0.71 pixels at worst. Real fabric accuracy remains unverified.

## What we learned

A pattern that looks clear from one position can be hard to read from another. Placement matters as much as button size. We also learned to separate a passing logic check from a claim about real use. A synthetic rectangle is not lace, and a mouse pinch is not a hand holding scissors.

## What's next

Test on a real Specs device with real tailors. Apply the detected fabric angle. Finish the walk-around cards and labels. Add saved anchors so the pattern can remain when the glasses come off and the tailor returns.

Then add more styles and tailor-specific pattern tweaks. We also want to bring the same pattern engine to Android XR glasses and Meta Quest.

## Logic proven / feel unproven

| Logic proven in preview | Feel unproven on a device |
|---|---|
| Measurement-driven patterns and 16 style flows. | Fit, fabric handling and useful cutting accuracy. |
| Pinch/drag UI, active-line progression and summary. | Reach, comfort and hand tracking with scissors. |
| Synthetic segmentation and projection maths. | Real camera detection, lighting and patterned cloth. |
| Transcript matching and debounce in isolated checks. | Microphone recognition and camera/voice use together. |

Walk-around behavior is in progress. Fabric rotation and saved anchors are not implemented. V1 and the latest full-suite result need final confirmation.

## Built with

lens-studio, snap-specs, typescript, spectacles-interaction-kit, spectacles-ui-kit, world-query, camera-module, asr-module, leaf, computer-vision, pattern-drafting
