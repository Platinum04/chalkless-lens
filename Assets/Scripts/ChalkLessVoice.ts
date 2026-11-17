import {ChalkLessMain} from "./ChalkLessMain"

/** Optional hands-free step navigation. The Next button works independently of ASR. */
@component
export class ChalkLessVoice extends BaseScriptComponent {
  @input
  @hint("ChalkLess flow controller")
  main: ChalkLessMain

  @input
  @hint("Enable voice commands while cutting")
  enabled: boolean = true

  @input
  @hint("Print final transcripts for voice debugging")
  logTranscripts: boolean = false

  private asr: AsrModule | null = null
  private listening = false
  private stopping = false
  private unavailable = false
  private started = false
  private destroyed = false
  private session = 0
  private lastCommandMs = -Infinity

  onAwake(): void {
    this.createEvent("OnStartEvent").bind(() => {
      this.started = true
      this.syncListening()
    })
    this.createEvent("UpdateEvent").bind(() => this.syncListening())
    this.createEvent("OnEnableEvent").bind(() => this.syncListening())
    this.createEvent("OnDisableEvent").bind(() => this.stopListening())
    this.createEvent("OnDestroyEvent").bind(() => {
      this.destroyed = true
      this.stopListening()
    })
  }

  /** Accept a complete utterance; also usable by tests when no microphone is available. */
  handleTranscript(text: string): void {
    if (this.destroyed || !this.enabled || !this.main || this.main.phase !== "cutting") return
    if (typeof text !== "string") return
    if (this.logTranscripts) print(`ChalkLess: transcript ${text}`)
    const words = text.toLowerCase().replace(/[\p{P}\p{S}]/gu, " ").trim().replace(/\s+/g, " ")
    const next = /^(next|next step|go on)$/.test(words)
    const back = /^(back|go back|previous)$/.test(words)
    if (!next && !back) return
    const now = getTime() * 1000
    if (now - this.lastCommandMs < 800) return
    if (back && this.main.currentStep <= 0) return
    this.lastCommandMs = now
    try {
      if (next) this.main.next()
      else this.main.previous()
      print(`ChalkLess: voice ${next ? "next" : "back"}`)
    } catch (_) {
      this.failSafe()
    }
  }

  private syncListening(): void {
    if (!this.started || this.destroyed) return
    const shouldListen = this.enabled && this.isEnabledInHierarchy && this.main && this.main.phase === "cutting"
    if (!shouldListen) {
      this.stopListening()
      return
    }
    if (this.listening || this.stopping || this.unavailable) return
    try {
      // Require lazily inside the guard: unsupported previews must still start the Lens.
      this.asr = require("LensStudio:AsrModule") as AsrModule
      if (!this.asr || typeof this.asr.startTranscribing !== "function") {
        this.failSafe()
        return
      }
      const token = ++this.session
      const options = AsrModule.AsrTranscriptionOptions.create()
      options.mode = AsrModule.AsrMode.HighAccuracy
      options.silenceUntilTerminationMs = 500
      options.onTranscriptionUpdateEvent.add((event) => {
        if (token !== this.session || !this.listening || this.destroyed) return
        if (event.isFinal) this.handleTranscript(event.text)
      })
      options.onTranscriptionErrorEvent.add(() => {
        if (token === this.session && !this.destroyed) this.failSafe()
      })
      this.listening = true
      this.asr.startTranscribing(options)
    } catch (_) {
      this.failSafe()
    }
  }

  private stopListening(): void {
    if (!this.listening) return
    this.listening = false
    this.session++ // Ignore delayed transcripts from a stopped session.
    this.stopping = true
    try {
      this.asr.stopTranscribing().then(
        () => { this.stopping = false },
        () => {
          this.stopping = false
          this.reportUnavailable()
        },
      )
    } catch (_) {
      this.stopping = false
      this.reportUnavailable()
    }
  }

  private failSafe(): void {
    this.reportUnavailable()
    this.stopListening()
  }

  private reportUnavailable(): void {
    if (this.unavailable) return
    this.unavailable = true
    print("ChalkLess: voice unavailable, use the Next button")
  }
}
