import { existsSync } from "fs"
import { join } from "path"

import type { Check, Plugin, PluginResult } from "../core/plugin"
import type { ContextStore } from "../core/store"

export const buildToolPlugin: Plugin = {
  id: "build-tool",
  name: "Build Tool",
  description: "Detects build tool (Vite, Webpack, Rollup, etc.)",
  enabled: true,
  dependencies: ["package-manager"],
  async detect(store: ContextStore): Promise<PluginResult> {
    const checks: Check[] = []
    const recommendations: string[] = []
    const packageJson = store.packageJson

    const deps = { ...packageJson?.dependencies, ...packageJson?.devDependencies }

    // Check for Vite
    if (deps.vite) {
      // In a monorepo, Vite config might be at package level or root
      const searchDirs = store.isMonorepo ? [store.cwd, store.rootDir] : [store.cwd]
      let viteConfig = false

      for (const searchDir of searchDirs) {
        viteConfig = [
          join(searchDir, "vite.config.js"),
          join(searchDir, "vite.config.ts"),
          join(searchDir, "vite.config.mjs")
        ].some((p) => existsSync(p))
        if (viteConfig) break
      }

      store.set("buildTool", { type: "vite", version: deps.vite })
      checks.push({ name: "Build tool detected (Vite)", passed: true })

      return {
        checks,
        findings: [],
        recommendations: []
      }
    }

    // Check for Webpack
    if (deps.webpack) {
      store.set("buildTool", { type: "webpack", version: deps.webpack })
      checks.push({ name: "Build tool detected (Webpack)", passed: true })

      return {
        checks,
        findings: [],
        recommendations: []
      }
    }

    // Check for Rollup
    if (deps.rollup) {
      store.set("buildTool", { type: "rollup", version: deps.rollup })
      checks.push({ name: "Build tool detected (Rollup)", passed: true })

      return {
        checks,
        findings: [],
        recommendations: []
      }
    }

    // Check for Turbopack (Next.js)
    if (store.isNextJs && deps.next) {
      checks.push({ name: "Build tool detected (Turbopack)", passed: true })
      return {
        checks,
        findings: [],
        recommendations: []
      }
    }

    checks.push({ name: "Build tool detected", passed: false })
    return {
      checks,
      findings: [],
      recommendations: []
    }
  }
}
