import { existsSync } from "fs"
import { join } from "path"

import type { Plugin, PluginResult } from "../core/plugin"
import type { ContextStore, FrameworkInfo } from "../core/store"
import { countFindingsByWeight } from "../core/weight-converter"

export const frameworkPlugin: Plugin = {
  id: "framework",
  name: "Framework Detection",
  description: "Detects frontend framework (React, Next.js, Angular, Vue, etc.)",
  enabled: true,
  weight: 0, // Informational only, not scored
  async detect(store: ContextStore): Promise<PluginResult> {
    const recommendations: string[] = []
    const packageJson = store.packageJson

    if (!packageJson) {
      return {
        counts: countFindingsByWeight([]),
        findings: [],
        recommendations: []
      }
    }

    const deps = { ...packageJson.dependencies, ...packageJson.devDependencies }
    let framework: FrameworkInfo | undefined

    // Check for Next.js
    if (deps.next) {
      const nextConfigPath = join(store.cwd, "next.config.js")
      const nextConfigMjs = join(store.cwd, "next.config.mjs")
      const nextConfigTs = join(store.cwd, "next.config.ts")
      const hasNextConfig = existsSync(nextConfigPath) || existsSync(nextConfigMjs) || existsSync(nextConfigTs)

      framework = {
        type: "nextjs",
        version: deps.next,
        metadata: { hasConfig: hasNextConfig }
      }
      store.set("isNextJs", true)
      store.set("isReact", true) // Next.js uses React
      store.set("framework", framework)

      return {
        counts: countFindingsByWeight([]),
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

      return {
        counts: countFindingsByWeight([]),
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

      return {
        counts: countFindingsByWeight([]),
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

      return {
        counts: countFindingsByWeight([]),
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

      return {
        counts: countFindingsByWeight([]),
        findings: [],
        recommendations: []
      }
    }

    // Vanilla JS/TS
    framework = {
      type: "vanilla"
    }
    store.set("framework", framework)

    return {
      counts: countFindingsByWeight([]),
      findings: [],
      recommendations: []
    }
  }
}
