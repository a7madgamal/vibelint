import type { ContextStore } from "./store"

/**
 * Plugin IDs - all valid plugin identifiers
 */
export type PluginId = "git" | "typescript" | "eslint" | "testing" | "framework" | "build-tool" | "package-manager"

/**
 * Finding weight scale (1-5):
 * - 1: Low impact
 * - 2: Minor issue
 * - 3: Medium issue
 * - 4: High issue
 * - 5: Catastrophic issue
 *
 * All findings are negative (issues/problems).
 * Weight is the single source of truth for severity.
 */
export interface Finding {
  message: string
  weight: 1 | 2 | 3 | 4 | 5 // Strictly typed weight (1-5 only)
  fixable: boolean
  fixHint?: string
}

export interface FindingCounts {
  weight5: number
  weight4: number
  weight3: number
  weight2: number
  weight1: number
}

export interface PluginResult {
  counts: FindingCounts // Counts of findings by weight category
  findings: Finding[]
  recommendations: string[]
  metadata?: Record<string, unknown>
}

export interface Plugin {
  id: PluginId
  name: string
  description: string
  enabled: boolean
  weight: number // For weighted scoring
  dependencies?: PluginId[] // IDs of plugins that must run first
  detect(store: ContextStore): Promise<PluginResult>
}
