import {Scenario} from "Leaf.lspkg/Scenarios/scenario/Scenario"
import {expect} from "Leaf.lspkg/Utils/common/Expect"
import {sleep} from "Leaf.lspkg/Utils/common/Utils"
import {ChalkLessVoice} from "../Scripts/ChalkLessVoice"
import {ChalkLessInteractor, getMain, openMeasure, placeViaButtons, waitPhase} from "./ChalkLessLeafHelpers"

/** Voice navigation uses the real flow and buttons, without needing a microphone. */
@component
export class V1VoiceCommands extends Scenario {
  async run(): Promise<void> {
    await sleep(1500)
    const m = getMain()
    const i = new ChalkLessInteractor()
    const voice = this.findVoice()
    expect(voice.main === m).toBe(true)
    expect(voice.enabled).toBe(true)
    voice.handleTranscript("next") // Voice is ignored outside cutting.
    expect(m.phase).toBe("menu")
    m.previous()
    expect(m.phase).toBe("menu")
    await openMeasure(i, m)
    await placeViaButtons(i, m)
    await i.pinch("StepActionButton")
    await waitPhase(m, "cutting")
    m.previous()
    expect(m.currentStep).toBe(0)

    voice.handleTranscript("next")
    expect(m.currentStep).toBe(1)
    await sleep(900)
    voice.handleTranscript("Go back.")
    expect(m.currentStep).toBe(0)
    expect(m.pattern.lineStates[0]).toBe("active")
    expect(m.pattern.lineStates[1]).toBe("future")
    voice.handleTranscript("banana")
    expect(m.currentStep).toBe(0)

    await sleep(900)
    voice.handleTranscript("next")
    voice.handleTranscript("next")
    expect(m.currentStep).toBe(1)
    expect(m.pattern.lineStates[0]).toBe("done")
    expect(m.pattern.lineStates[1]).toBe("active")
    await sleep(900)
    for (const text of ["banana", "nextdoor", "backpack", "go onward", "next back"]) voice.handleTranscript(text)
    expect(m.currentStep).toBe(1)

    // The button remains usable, including immediately after a voice command.
    voice.handleTranscript("Next step!")
    expect(m.currentStep).toBe(2)
    await i.pinch("StepActionButton")
    expect(m.currentStep).toBe(3)
    print("ChalkLessTest: voice next/back, line states, whole phrases, debounce and Next button PASS")
  }

  private findVoice(): ChalkLessVoice {
    const visit = (root: SceneObject): ChalkLessVoice | null => {
      const voice = root.getComponent(ChalkLessVoice.getTypeName()) as ChalkLessVoice
      if (voice) return voice
      for (let k = 0; k < root.getChildrenCount(); k++) {
        const found = visit(root.getChild(k))
        if (found) return found
      }
      return null
    }
    for (let k = 0; k < global.scene.getRootObjectsCount(); k++) {
      const found = visit(global.scene.getRootObject(k))
      if (found) return found
    }
    throw new Error("ChalkLessVoice component not found; wire it to ChalkLessMain before running V1")
  }
}
