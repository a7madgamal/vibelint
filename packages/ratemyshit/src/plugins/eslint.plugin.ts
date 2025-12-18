import { existsSync } from "fs"
import { join } from "path"

import type { Check, Finding, Plugin, PluginResult } from "../core/plugin"
import type { ContextStore } from "../core/store"
import { readJsonFile } from "../utils/detection"

export const eslintPlugin: Plugin = {
  id: "eslint",
  name: "ESLint Configuration",
  description: "Detects ESLint setup and rule configuration",
  enabled: true,
  dependencies: ["framework", "typescript"],
  async detect(store: ContextStore): Promise<PluginResult> {
    const checks: Check[] = []
    const findings: Finding[] = []
    const recommendations: string[] = []
    const packageJson = store.packageJson

    // In a monorepo, ESLint might be in the root package.json
    let deps = { ...packageJson?.dependencies, ...packageJson?.devDependencies }
    let hasEslint = deps.eslint

    // If not found and we're in a monorepo, check root package.json
    if (!hasEslint && store.isMonorepo) {
      const rootPackageJson = await readJsonFile(store.rootDir, "package.json")
      if (rootPackageJson) {
        const rootDeps: Record<string, string> = {}
        const depsValue = rootPackageJson.dependencies
        const devDepsValue = rootPackageJson.devDependencies
        if (depsValue && typeof depsValue === "object" && !Array.isArray(depsValue) && depsValue !== null) {
          Object.assign(rootDeps, depsValue)
        }
        if (devDepsValue && typeof devDepsValue === "object" && !Array.isArray(devDepsValue) && devDepsValue !== null) {
          Object.assign(rootDeps, devDepsValue)
        }
        deps = { ...deps, ...rootDeps }
        hasEslint = rootDeps.eslint
      }
    }

    // Check: ESLint installed
    if (!hasEslint) {
      const finding: Finding = {
        message: "ESLint not installed. Linting? We don't do that here.",
        severity: "WTF",
        fixable: true,
        fixHint: "Install ESLint: npm install -D eslint"
      }
      findings.push(finding)
      checks.push({ name: "ESLint installed", passed: false, finding })
      recommendations.push("Install ESLint as a dev dependency")
      return {
        checks,
        findings,
        recommendations
      }
    }

    checks.push({ name: "ESLint installed", passed: true })
    store.set("isEslintInstalled", true)

    // Check for flat config (ESLint 9+)
    const flatConfigs = ["eslint.config.mjs", "eslint.config.js", "eslint.config.ts", "eslint.config.cjs"]
    const legacyConfigs = [
      ".eslintrc.json",
      ".eslintrc.js",
      ".eslintrc.cjs",
      ".eslintrc.yml",
      ".eslintrc.yaml",
      ".eslintrc"
    ]

    // In a monorepo, ESLint config might be at the root or in the package
    // Check root first (where shared configs are), then package
    let configFound = false
    const searchDirs = store.isMonorepo ? [store.rootDir, store.cwd] : [store.cwd]

    for (const searchDir of searchDirs) {
      for (const config of flatConfigs) {
        if (existsSync(join(searchDir, config))) {
          configFound = true
          break
        }
      }
      if (configFound) break
    }

    if (!configFound) {
      for (const searchDir of searchDirs) {
        for (const config of legacyConfigs) {
          if (existsSync(join(searchDir, config))) {
            configFound = true
            break
          }
        }
        if (configFound) break
      }
    }

    // Check: ESLint config file exists
    if (!configFound) {
      const finding: Finding = {
        message: "ESLint installed but no config file found. What's the point?",
        severity: "WTF",
        fixable: true,
        fixHint: "Create eslint.config.js or .eslintrc.json"
      }
      findings.push(finding)
      checks.push({ name: "ESLint config file exists", passed: false, finding })
      recommendations.push("Create ESLint configuration file")
      return {
        checks,
        findings,
        recommendations
      }
    }

    checks.push({ name: "ESLint config file exists", passed: true })

    // Framework-aware checks
    if (store.isReact) {
      const hasReactPlugin = deps["eslint-plugin-react"] || deps["@typescript-eslint/eslint-plugin"]
      if (!hasReactPlugin) {
        const finding: Finding = {
          message: "React detected but eslint-plugin-react not installed",
          severity: "BIG",
          fixable: true,
          fixHint: "Install eslint-plugin-react for React-specific linting rules"
        }
        findings.push(finding)
        checks.push({ name: "React ESLint plugin installed", passed: false, finding })
        recommendations.push("Install eslint-plugin-react")
      } else {
        checks.push({ name: "React ESLint plugin installed", passed: true })
      }
    }

    if (store.isTypeScript) {
      const hasTsPlugin = deps["@typescript-eslint/eslint-plugin"] || deps["typescript-eslint"]
      if (!hasTsPlugin) {
        const finding: Finding = {
          message: "TypeScript detected but @typescript-eslint/eslint-plugin not installed",
          severity: "BIG",
          fixable: true,
          fixHint: "Install @typescript-eslint/eslint-plugin for TypeScript linting"
        }
        findings.push(finding)
        checks.push({ name: "TypeScript ESLint plugin installed", passed: false, finding })
        recommendations.push("Install @typescript-eslint/eslint-plugin")
      } else {
        checks.push({ name: "TypeScript ESLint plugin installed", passed: true })
      }
    }

    if (store.isNextJs) {
      const hasNextPlugin = deps["@next/eslint-plugin-next"]
      if (!hasNextPlugin) {
        const finding: Finding = {
          message: "Next.js detected. Consider installing @next/eslint-plugin-next",
          severity: "SMOL",
          fixable: true
        }
        findings.push(finding)
        checks.push({ name: "Next.js ESLint plugin installed", passed: false, finding })
        recommendations.push("Install @next/eslint-plugin-next for Next.js specific rules")
      } else {
        checks.push({ name: "Next.js ESLint plugin installed", passed: true })
      }
    }

    return {
      checks,
      findings,
      recommendations
    }
  }
}
