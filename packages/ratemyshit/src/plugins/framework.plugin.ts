import { existsSync } from "fs"
import { join } from "path"

import type { Check, Plugin, PluginResult } from "../core/plugin"
import type { ContextStore, FrameworkInfo } from "../core/store"

export const frameworkPlugin: Plugin = {
  id: "framework",
  name: "Framework Detection",
  description: "Detects frontend framework (React, Next.js, Angular, Vue, etc.)",
  enabled: true,
  async detect(store: ContextStore): Promise<PluginResult> {
    const checks: Check[] = []
    const recommendations: string[] = []
    const packageJson = store.packageJson

    if (!packageJson) {
      return {
        checks: [{ name: "Framework detected", passed: false }],
        findings: [],
        recommendations: []
      }
    }

    const deps = { ...packageJson.dependencies, ...packageJson.devDependencies }
    let framework: FrameworkInfo | undefined

    // Check for Next.js
    if (deps.next) {
      // In a monorepo, Next.js config might be at package level or root
      const searchDirs = store.isMonorepo ? [store.cwd, store.rootDir] : [store.cwd]
      let hasNextConfig = false

      for (const searchDir of searchDirs) {
        const nextConfigPath = join(searchDir, "next.config.js")
        const nextConfigMjs = join(searchDir, "next.config.mjs")
        const nextConfigTs = join(searchDir, "next.config.ts")
        if (existsSync(nextConfigPath) || existsSync(nextConfigMjs) || existsSync(nextConfigTs)) {
          hasNextConfig = true
          break
        }
      }

      framework = {
        type: "nextjs",
        version: deps.next,
        metadata: { hasConfig: hasNextConfig }
      }
      store.set("isNextJs", true)
      store.set("isReact", true)
      store.set("framework", framework)

      checks.push({ name: "Framework detected (Next.js)", passed: true })
      return {
        checks,
        findings: [],
        recommendations: []
      }
    }

    // Check for React
    if (deps.react) {
      framework = {
        type: "react",
        version: deps.react
      }
      store.set("isReact", true)
      store.set("framework", framework)

      checks.push({ name: "Framework detected (React)", passed: true })
      return {
        checks,
        findings: [],
        recommendations: []
      }
    }

    // Check for Angular
    if (deps["@angular/core"]) {
      framework = {
        type: "angular",
        version: deps["@angular/core"]
      }
      store.set("framework", framework)

      checks.push({ name: "Framework detected (Angular)", passed: true })
      return {
        checks,
        findings: [],
        recommendations: []
      }
    }

    // Check for Vue
    if (deps.vue) {
      framework = {
        type: "vue",
        version: deps.vue
      }
      store.set("framework", framework)

      checks.push({ name: "Framework detected (Vue)", passed: true })
      return {
        checks,
        findings: [],
        recommendations: []
      }
    }

    // Check for Svelte
    if (deps.svelte) {
      framework = {
        type: "svelte",
        version: deps.svelte
      }
      store.set("framework", framework)

      checks.push({ name: "Framework detected (Svelte)", passed: true })
      return {
        checks,
        findings: [],
        recommendations: []
      }
    }

    // Vanilla JS/TS
    framework = {
      type: "vanilla"
    }
    store.set("framework", framework)

    checks.push({ name: "Framework detected (Vanilla)", passed: true })
    return {
      checks,
      findings: [],
      recommendations: []
    }
  }
}
