import type { ContextStore } from "./store"

/**
 * Plugin IDs - all valid plugin identifiers
 */
export type PluginId = "git" | "typescript" | "eslint" | "testing" | "framework" | "build-tool" | "package-manager"
export type severity = "SMOL" | "BIG" | "WTF"

/**
 * Finding severity levels (3 levels):
 * - "SMOL": Small/minor issues
 * - "BIG": Significant issues
 * - "WTF": Critical/catastrophic issues
 *
 * All findings are negative (issues/problems).
 * Severity is the single source of truth for severity.
 */
export interface Finding {
  message: string
  severity: severity // Three severity levels
  fixable: boolean
  fixHint?: string
}

export interface Check {
  name: string // Name of the check
  passed: boolean // Whether the check passed
  finding?: Finding // Finding if check failed
}

export interface PluginResult {
  checks: Check[] // List of all checks with their status
  findings: Finding[] // All findings (for backward compatibility and filtering)
  recommendations: string[]
  metadata?: Record<string, unknown>
}

export interface Plugin {
  id: PluginId
  name: string
  description: string
  enabled: boolean
  dependencies?: PluginId[] // IDs of plugins that must run first
  detect(store: ContextStore): Promise<PluginResult>
}
