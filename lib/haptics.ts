import { WebHaptics } from "web-haptics"

let instance: WebHaptics | null = null

function get() {
  if (typeof window === "undefined") return null
  if (!instance) instance = new WebHaptics()
  return instance
}

export function haptic(pattern: string) {
  get()?.trigger(pattern)
}
