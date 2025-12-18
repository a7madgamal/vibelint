import { existsSync } from "fs"
import { join } from "path"

import type { Finding, Plugin, PluginResult } from "../core/plugin"
import type { ContextStore } from "../core/store"
import { countFindingsByWeight } from "../core/weight-converter"

export const packageManagerPlugin: Plugin = {
  id: "package-manager",
  name: "Package Manager",
  description: "Detects package manager (npm, pnpm, yarn)",
  enabled: true,
  weight: 0, // Informational only, not scored
  async detect(store: ContextStore): Promise<PluginResult> {
    const recommendations: string[] = []

    const pnpmLock = join(store.cwd, "pnpm-lock.yaml")
    const yarnLock = join(store.cwd, "yarn.lock")
    const npmLock = join(store.cwd, "package-lock.json")

    let packageManager: "npm" | "pnpm" | "yarn" | undefined

    if (existsSync(pnpmLock)) {
      packageManager = "pnpm"
      store.set("packageManager", "pnpm")
    } else if (existsSync(yarnLock)) {
      packageManager = "yarn"
      store.set("packageManager", "yarn")
    } else if (existsSync(npmLock)) {
      packageManager = "npm"
      store.set("packageManager", "npm")
    }

    return {
      counts: countFindingsByWeight([]),
      findings: [],
      recommendations: []
    }
  }
}
