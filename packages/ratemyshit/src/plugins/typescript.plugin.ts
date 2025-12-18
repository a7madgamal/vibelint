import { existsSync } from "fs"
import { join } from "path"

import type { Check, Finding, Plugin, PluginResult } from "../core/plugin"
import type { ContextStore } from "../core/store"
import { countFiles, getResolvedTsConfig, isPackageInstalled } from "../utils/commands"

interface TsConfig {
  compilerOptions?: {
    strict?: boolean
    noImplicitAny?: boolean
    strictNullChecks?: boolean
    [key: string]: unknown
  }
  [key: string]: unknown
}

export const typescriptPlugin: Plugin = {
  id: "typescript",
  name: "TypeScript Configuration",
  description: "Detects TypeScript usage and configuration quality",
  enabled: true,
  async detect(store: ContextStore): Promise<PluginResult> {
    const checks: Check[] = []
    const findings: Finding[] = []
    const recommendations: string[] = []

    // Use package manager to check if TypeScript is installed (more deterministic)
    const packageManager = store.packageManager
    const hasTypeScript = isPackageInstalled("typescript", packageManager, store.cwd, store.monorepoRoot)

    // Check: TypeScript installed
    if (!hasTypeScript) {
      // Check if there are any .ts files - might be TypeScript even without the package
      const tsFileCount = countFiles("*.ts", store.cwd)
      const tsxFileCount = countFiles("*.tsx", store.cwd)

      if (tsFileCount === 0 && tsxFileCount === 0) {
        // Not a TypeScript project - no findings
        return {
          checks: [{ name: "TypeScript installed", passed: false }],
          findings: [],
          recommendations: []
        }
      } else {
        // Has TS files but TypeScript not installed - this is a problem
        const finding: Finding = {
          message: "TypeScript files found but TypeScript package not installed. What are you even doing?",
          severity: "WTF",
          fixable: true,
          fixHint: `Install TypeScript: ${packageManager ?? "npm"} install -D typescript`
        }
        findings.push(finding)
        checks.push({ name: "TypeScript installed", passed: false, finding })
        recommendations.push("Install TypeScript as a dev dependency")
        return {
          checks,
          findings,
          recommendations
        }
      }
    }

    checks.push({ name: "TypeScript installed", passed: true })
    store.set("isTypeScript", true)

    // Use tsc --showConfig to get the fully resolved config (handles extends, etc.)
    const resolvedConfig = getResolvedTsConfig(store.cwd, store.monorepoRoot)

    if (!resolvedConfig.success || !resolvedConfig.config) {
      // Fallback: check if tsconfig.json exists
      const searchDirs = store.isMonorepo ? [store.cwd, store.rootDir] : [store.cwd]
      let hasTsConfig = false

      for (const searchDir of searchDirs) {
        if (existsSync(join(searchDir, "tsconfig.json"))) {
          hasTsConfig = true
          break
        }
      }

      if (!hasTsConfig) {
        const finding: Finding = {
          message: "TypeScript installed but no tsconfig.json found. What are you even doing?",
          severity: "WTF",
          fixable: true,
          fixHint: "Create a tsconfig.json file or run 'tsc --init'"
        }
        findings.push(finding)
        checks.push({ name: "tsconfig.json exists", passed: false, finding })
        recommendations.push("Create tsconfig.json configuration file")
        return {
          checks,
          findings,
          recommendations
        }
      }

      // Config exists but couldn't resolve it - might be a syntax error
      checks.push({ name: "tsconfig.json exists", passed: true })
      checks.push({ name: "tsconfig.json valid", passed: false })
      return {
        checks,
        findings,
        recommendations
      }
    }

    checks.push({ name: "tsconfig.json exists", passed: true })
    const tsconfig = resolvedConfig.config as TsConfig
    store.set("tsconfig", tsconfig)

    // Check: Strict mode enabled (using resolved config - more accurate)
    if (tsconfig?.compilerOptions?.strict !== true) {
      const finding: Finding = {
        message: "Strict mode is disabled. You're living dangerously, I see.",
        severity: "BIG",
        fixable: true,
        fixHint: "Enable strict mode in tsconfig.json: { compilerOptions: { strict: true } }"
      }
      findings.push(finding)
      checks.push({ name: "Strict mode enabled", passed: false, finding })
      recommendations.push("Enable TypeScript strict mode")
    } else {
      checks.push({ name: "Strict mode enabled", passed: true })
    }

    // Check: noImplicitAny enabled (using resolved config)
    if (tsconfig?.compilerOptions?.noImplicitAny === false) {
      const finding: Finding = {
        message: "noImplicitAny is disabled. 'any' types everywhere, I see.",
        severity: "BIG",
        fixable: true
      }
      findings.push(finding)
      checks.push({ name: "noImplicitAny enabled", passed: false, finding })
    } else {
      checks.push({ name: "noImplicitAny enabled", passed: true })
    }

    // Check: strictNullChecks enabled (using resolved config)
    if (tsconfig?.compilerOptions?.strictNullChecks === false) {
      const finding: Finding = {
        message: "strictNullChecks is disabled",
        severity: "BIG",
        fixable: true
      }
      findings.push(finding)
      checks.push({ name: "strictNullChecks enabled", passed: false, finding })
    } else {
      checks.push({ name: "strictNullChecks enabled", passed: true })
    }

    // Additional check: Count JS files vs TS files to detect mixed codebase
    const jsFileCount = countFiles("*.js", store.cwd)
    const tsFileCount = countFiles("*.ts", store.cwd) + countFiles("*.tsx", store.cwd)

    if (jsFileCount > 0 && tsFileCount > 0) {
      const jsRatio = (jsFileCount / (jsFileCount + tsFileCount)) * 100
      if (jsRatio > 50) {
        const finding: Finding = {
          message: `Mixed codebase detected: ${jsFileCount} JS files vs ${tsFileCount} TS files. Consider migrating to TypeScript.`,
          severity: "SMOL",
          fixable: false
        }
        findings.push(finding)
        checks.push({ name: "TypeScript migration progress", passed: false, finding })
      }
    }

    return {
      checks,
      findings,
      recommendations
    }
  }
}
