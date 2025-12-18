import kleur from "kleur"

import type { Finding } from "./plugin"

/**
 * Get color and emoji for a finding severity level
 */
export function getWeightStyle(severity: Finding["severity"]): { color: (text: string) => string; emoji: string } {
  switch (severity) {
    case "WTF":
      return { color: kleur.red, emoji: "💥" }
    case "BIG":
      return { color: kleur.yellow, emoji: "⚠️" }
    case "SMOL":
      return { color: kleur.cyan, emoji: "ℹ️" }
  }
}

/**
 * Get color and emoji for a passed check
 */
export function getPassedStyle() {
  return { color: kleur.green, emoji: "✓" }
}
