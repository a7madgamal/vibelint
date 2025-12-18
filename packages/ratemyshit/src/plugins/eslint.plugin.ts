import { existsSync } from "fs"
import { join } from "path"

import type { Finding, Plugin, PluginResult } from "../core/plugin"
import type { ContextStore } from "../core/store"
import { countFindingsByWeight } from "../core/weight-converter"
import { readTextFile } from "../utils/detection"

export const eslintPlugin: Plugin = {
  id: "eslint",
  name: "ESLint Configuration",
  description: "Detects ESLint setup and rule configuration",
  enabled: true,
  weight: 1.5,
  dependencies: ["framework", "typescript"],
  async detect(store: ContextStore): Promise<PluginResult> {
    const findings: Finding[] = []
    const recommendations: string[] = []
    const packageJson = store.packageJson

    const deps = { ...packageJson?.dependencies, ...packageJson?.devDependencies }
    const hasEslint = deps.eslint

    if (!hasEslint) {
      const findings: Finding[] = [
        {
          message: "ESLint not installed. Linting? We don't do that here.",
          weight: 5, // Catastrophic - no linting at all
          fixable: true,
          fixHint: "Install ESLint: npm install -D eslint"
        }
      ]
      return {
        counts: countFindingsByWeight(findings),
        findings,
        recommendations: ["Install ESLint as a dev dependency"]
      }
    }

    store.set("isEslintInstalled", true)

    // Check for flat config (ESLint 9+)
    const flatConfigs = ["eslint.config.mjs", "eslint.config.js", "eslint.config.ts", "eslint.config.cjs"]

    // Check for legacy config
    const legacyConfigs = [
      ".eslintrc.json",
      ".eslintrc.js",
      ".eslintrc.cjs",
      ".eslintrc.yml",
      ".eslintrc.yaml",
      ".eslintrc"
    ]

    let configFound = false
    let configType: "flat" | "legacy" | undefined

    for (const config of flatConfigs) {
      if (existsSync(join(store.cwd, config))) {
        configFound = true
        configType = "flat"
        break
      }
    }

    if (!configFound) {
      for (const config of legacyConfigs) {
        if (existsSync(join(store.cwd, config))) {
          configFound = true
          configType = "legacy"
          break
        }
      }
    }

    if (!configFound) {
      findings.push({
        message: "ESLint installed but no config file found. What's the point?",
        weight: 5, // Catastrophic - ESLint installed but unusable
        fixable: true,
        fixHint: "Create eslint.config.js or .eslintrc.json"
      })
      recommendations.push("Create ESLint configuration file")
      return {
        counts: countFindingsByWeight(findings),
        findings,
        recommendations
      }
    }

    // ESLint + config found - no finding (positive state)

    // Framework-aware checks
    if (store.isReact) {
      const hasReactPlugin = deps["eslint-plugin-react"] || deps["@typescript-eslint/eslint-plugin"]
      if (!hasReactPlugin) {
        findings.push({
          message: "React detected but eslint-plugin-react not installed",
          weight: 3, // Medium issue - missing React plugin
          fixable: true,
          fixHint: "Install eslint-plugin-react for React-specific linting rules"
        })
        recommendations.push("Install eslint-plugin-react")
      }
      // React plugin installed - no finding (positive state)
    }

    if (store.isTypeScript) {
      const hasTsPlugin = deps["@typescript-eslint/eslint-plugin"] || deps["typescript-eslint"]
      if (!hasTsPlugin) {
        findings.push({
          message: "TypeScript detected but @typescript-eslint/eslint-plugin not installed",
          weight: 4, // High issue - TypeScript without TS linting
          fixable: true,
          fixHint: "Install @typescript-eslint/eslint-plugin for TypeScript linting"
        })
        recommendations.push("Install @typescript-eslint/eslint-plugin")
      }
      // TS plugin installed - no finding (positive state)
    }

    if (store.isNextJs) {
      const hasNextPlugin = deps["@next/eslint-plugin-next"]
      if (!hasNextPlugin) {
        findings.push({
          message: "Next.js detected. Consider installing @next/eslint-plugin-next",
          weight: 1, // Low issue - nice to have
          fixable: true
        })
        recommendations.push("Install @next/eslint-plugin-next for Next.js specific rules")
      }
      // Next.js plugin installed - no finding (positive state)
    }

    return {
      counts: countFindingsByWeight(findings),
      findings,
      recommendations
    }
  }
}
