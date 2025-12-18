import { existsSync } from "fs"
import { join } from "path"

import type { Finding, Plugin, PluginResult } from "../core/plugin"
import type { ContextStore } from "../core/store"
import { countFindingsByWeight } from "../core/weight-converter"
import { readJsonFile } from "../utils/detection"

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
  weight: 1.5,
  async detect(store: ContextStore): Promise<PluginResult> {
    const findings: Finding[] = []
    const recommendations: string[] = []

    const packageJson = store.packageJson
    const hasTypeScript = packageJson?.dependencies?.typescript || packageJson?.devDependencies?.typescript

    if (!hasTypeScript) {
      // Not a TypeScript project - no findings
      return {
        counts: countFindingsByWeight([]),
        findings: [],
        recommendations: []
      }
    }

    store.set("isTypeScript", true)

    const tsconfigPath = join(store.cwd, "tsconfig.json")
    const hasTsConfig = existsSync(tsconfigPath)

    if (!hasTsConfig) {
      findings.push({
        message: "TypeScript installed but no tsconfig.json found. What are you even doing?",
        weight: 5, // Catastrophic - TypeScript without config
        fixable: true,
        fixHint: "Create a tsconfig.json file or run 'tsc --init'"
      })
      recommendations.push("Create tsconfig.json configuration file")
      return {
        counts: countFindingsByWeight(findings),
        findings,
        recommendations
      }
    }

    const tsconfig = await readJsonFile<TsConfig>(store.cwd, "tsconfig.json")
    store.set("tsconfig", tsconfig)

    // TypeScript + config found - no finding (positive state)

    if (tsconfig?.compilerOptions?.strict !== true) {
      findings.push({
        message: "Strict mode is disabled. You're living dangerously, I see.",
        weight: 4, // High issue - missing strict mode
        fixable: true,
        fixHint: "Enable strict mode in tsconfig.json: { compilerOptions: { strict: true } }"
      })
      recommendations.push("Enable TypeScript strict mode")
    }
    // Strict mode enabled - no finding (positive state)

    if (tsconfig?.compilerOptions?.noImplicitAny === false) {
      findings.push({
        message: "noImplicitAny is disabled. 'any' types everywhere, I see.",
        weight: 3, // Medium issue
        fixable: true
      })
    }
    // noImplicitAny enabled - no finding (positive state)

    if (tsconfig?.compilerOptions?.strictNullChecks === false) {
      findings.push({
        message: "strictNullChecks is disabled",
        weight: 3, // Medium issue
        fixable: true
      })
    }
    // strictNullChecks enabled - no finding (positive state)

    return {
      counts: countFindingsByWeight(findings),
      findings,
      recommendations
    }
  }
}
