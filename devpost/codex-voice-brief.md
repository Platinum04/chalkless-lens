# Task brief for Codex: voice "next" and "back" in ChalkLess

## Context
- **Project:** ChalkLess, a Snap Specs Lens (Lens Studio 5.25, TypeScript) that guides a tailor through cutting a garment. The pattern lies on the fabric and one cut line glows at a time.
- **Folder:** `C:\Users\User\Desktop\chalkless-lens`.
- **Read first:** `README.md`, `PROGRESS.md`, `devpost/design-brief.md`, `AGENTS.md`.
- **Why voice:** while cutting, the tailor's hands are busy with the scissors and the fabric. Saying "next" or "back" should change the step without touching anything. The on-screen Next button must always keep working, because voice may not work in the Lens Studio preview.

## Another agent is working in this folder at the same time
Claude is building table and fabric detection in the same checkout. To avoid clashing:

- **Your files:**
  - a new file, `Assets/Scripts/ChalkLessVoice.ts`
  - a new test, `Assets/Tests/V1VoiceCommands.ts`
- **`ChalkLessMain.ts`:** you may change only this file, and only to add one public method, `previous()`, placed right after the existing `next()` method (around line 265). Don't change anything else in it.
- **Don't edit** any other script, `Assets/Tests/LeafIndex.ts`, `README.md`, `PROGRESS.md` or the scene file. Claude will register your test, wire the component into the scene and update the docs.
- **Don't edit** the existing files in `Assets/Tests/`, and never commit `Assets/Tests/ChalkLessScenarioClient.ts` or its `.meta`.
- **Before you commit,** run `git pull --rebase origin main`.
- **Stage only your files** with `git add <files>`. Never use `git add -A`.

## What to build
1. **`ChalkLessMain.previous()`:**
   - During the `cutting` phase, go back one step: the previous line becomes active again and the current one goes back to "future".
   - Mirror how `next()` updates `currentStep`, `pattern.setCurrentStep(...)`, the step panel and card placement.
   - Do nothing on step 0 and outside the `cutting` phase.
2. **`ChalkLessVoice.ts`:** a `@component` class that extends `BaseScriptComponent`.
   - Use the Specs **ASR module** (`AsrModule`) for speech recognition. Read the skill at `C:\Users\User\.claude\plugins\cache\ls-extensions\ls-clad\1.0.0\skills\specs-asr\SKILL.md` and its `resources/` for the correct API.
   - Inputs:
     - `main` (the ChalkLessMain component)
     - `enabled` (boolean, default true)
     - `logTranscripts` (boolean, default false)
   - Listen continuously, but only while `main.phase === "cutting"`.
   - On a final transcript, lowercase it, strip punctuation and match whole words:
     - "next", "next step", "go on" → `main.next()`
     - "back", "go back", "previous" → `main.previous()`
   - Ignore anything else.
   - Debounce: no more than one command every 800 ms.
   - Use only light feedback, nothing dark: for example a short "Heard: next" line in the step card for about 1 s, or just a print. Print `ChalkLess: voice next` or `ChalkLess: voice back` when a command fires.
   - **Fail safe:** if the ASR module is missing, throws, or the microphone isn't allowed (common in the preview), catch it, print `ChalkLess: voice unavailable, use the Next button`, and carry on with no errors. The Lens must never crash because of voice.
   - Expose a public `handleTranscript(text: string)` method, so tests can feed text without a microphone.
3. **`Assets/Tests/V1VoiceCommands.ts`:** a LEAF scenario. Copy the style of `Assets/Tests/C5StepThroughToSummary.ts` and `ChalkLessLeafHelpers.ts`.
   1. Pinch through the Buba flow up to `cutting` using the helpers (`openMeasure`, `placeViaButtons`, then pinch `StepActionButton`).
   2. Find the ChalkLessVoice component and call `handleTranscript("next")`. Expect `currentStep` to be 1.
   3. Call `handleTranscript("Go back.")`. Expect `currentStep` to be 0, with `lineStates[0] === "active"` and `lineStates[1] === "future"`.
   4. Call `handleTranscript("banana")`. Expect no change.
   5. Call `handleTranscript("next")` twice within 800 ms. Expect only one step forward.

## Rules
- **Don't change** existing names, phases, step ids or public APIs. 20 LEAF tests depend on them.
- **Display:** Specs' display is additive, so black is invisible. Keep all text light.
- **Editor tools:** use the Lens Studio MCP tools, never raw HTTP calls to Lens Studio.
- **Compile:** compile with the TypeScript recompile tool and fix every error.
- **Commits:**
  - Plain messages.
  - **No co-author lines and no AI attribution** of any kind.
  - Push to `origin main`.

## Done when
- `ChalkLessVoice.ts`, `previous()` and `V1VoiceCommands.ts` compile, and the Lens starts with no errors.
- In the preview, voice either works or prints the "unavailable" message. The Next button still works either way.
- Your commit is pushed.
- You report back with:
  - the file paths
  - the commit hash
  - what you tested
  - whether ASR worked in the preview
