import { existsSync } from "fs"
import { join } from "path"

import type { Check, Plugin, PluginResult } from "../core/plugin"
import type { ContextStore } from "../core/store"

export const packageManagerPlugin: Plugin = {
  id: "package-manager",
  name: "Package Manager",
  description: "Detects package manager (npm, pnpm, yarn)",
  enabled: true,
  async detect(store: ContextStore): Promise<PluginResult> {
    const checks: Check[] = []
    // In a monorepo, lock files are at the root, not in the package directory
    const rootDir = store.rootDir
    const pnpmLock = join(rootDir, "pnpm-lock.yaml")
    const yarnLock = join(rootDir, "yarn.lock")
    const npmLock = join(rootDir, "package-lock.json")

    if (existsSync(pnpmLock)) {
      store.set("packageManager", "pnpm")
      checks.push({ name: "Package manager detected (pnpm)", passed: true })
    } else if (existsSync(yarnLock)) {
      store.set("packageManager", "yarn")
      checks.push({ name: "Package manager detected (yarn)", passed: true })
    } else if (existsSync(npmLock)) {
      store.set("packageManager", "npm")
      checks.push({ name: "Package manager detected (npm)", passed: true })
    } else {
      checks.push({ name: "Package manager detected", passed: false })
    }

    return {
      checks,
      findings: [],
      recommendations: []
    }
  }
}
