import { existsSync } from "fs"
import { join } from "path"

import type { Finding, Plugin, PluginResult } from "../core/plugin"
import type { ContextStore } from "../core/store"
import { countFindingsByWeight } from "../core/weight-converter"

export const buildToolPlugin: Plugin = {
  id: "build-tool",
  name: "Build Tool",
  description: "Detects build tool (Vite, Webpack, Rollup, etc.)",
  enabled: true,
  weight: 0, // Informational only, not scored
  dependencies: ["package-manager"],
  async detect(store: ContextStore): Promise<PluginResult> {
    const recommendations: string[] = []
    const packageJson = store.packageJson

    const deps = { ...packageJson?.dependencies, ...packageJson?.devDependencies }

    // Check for Vite
    if (deps.vite) {
      const viteConfig = [
        join(store.cwd, "vite.config.js"),
        join(store.cwd, "vite.config.ts"),
        join(store.cwd, "vite.config.mjs")
      ].some((p) => existsSync(p))

      store.set("buildTool", { type: "vite", version: deps.vite })

      return {
        counts: countFindingsByWeight([]),
        findings: [],
        recommendations: []
      }
    }

    // Check for Webpack
    if (deps.webpack) {
      store.set("buildTool", { type: "webpack", version: deps.webpack })

      return {
        counts: countFindingsByWeight([]),
        findings: [],
        recommendations: []
      }
    }

    // Check for Rollup
    if (deps.rollup) {
      store.set("buildTool", { type: "rollup", version: deps.rollup })

      return {
        counts: countFindingsByWeight([]),
        findings: [],
        recommendations: []
      }
    }

    // Check for Turbopack (Next.js)
    if (store.isNextJs && deps.next) {
      return {
        counts: countFindingsByWeight([]),
        findings: [],
        recommendations: []
      }
    }

    return {
      counts: countFindingsByWeight([]),
      findings: [],
      recommendations: []
    }
  }
}
