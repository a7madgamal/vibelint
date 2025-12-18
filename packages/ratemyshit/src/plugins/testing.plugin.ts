import { existsSync } from "fs"
import { readdir } from "fs/promises"
import { join } from "path"

import type { Finding, Plugin, PluginResult } from "../core/plugin"
import type { ContextStore } from "../core/store"
import { countFindingsByWeight } from "../core/weight-converter"

export const testingPlugin: Plugin = {
  id: "testing",
  name: "Testing Setup",
  description: "Detects testing frameworks and test files",
  enabled: true,
  weight: 1.2,
  dependencies: ["framework"],
  async detect(store: ContextStore): Promise<PluginResult> {
    const findings: Finding[] = []
    const recommendations: string[] = []
    const packageJson = store.packageJson

    const deps = { ...packageJson?.dependencies, ...packageJson?.devDependencies }

    // Check for test files
    const testPatterns = ["test", "tests", "__tests__", "spec"]
    let hasTestFiles = false

    try {
      // Check common test file locations
      const testDirs = ["__tests__", "test", "tests", "src/__tests__", "src/test", "src/tests"]
      for (const testDir of testDirs) {
        const testDirPath = join(store.cwd, testDir)
        if (existsSync(testDirPath)) {
          hasTestFiles = true
          break
        }
      }

      // Also check for test files in root
      if (!hasTestFiles) {
        const files = await readdir(store.cwd)
        hasTestFiles = files.some((file) => {
          const fileStr = String(file)
          return (
            testPatterns.some((pattern) => fileStr.includes(pattern)) ||
            fileStr.endsWith(".test.js") ||
            fileStr.endsWith(".test.ts") ||
            fileStr.endsWith(".spec.js") ||
            fileStr.endsWith(".spec.ts")
          )
        })
      }
    } catch {
      // Ignore errors reading directory
    }

    // Check for Vitest
    if (deps.vitest) {
      store.set("testingFramework", { type: "vitest", version: deps.vitest })

      if (!hasTestFiles) {
        findings.push({
          message: "Vitest installed but no test files found",
          weight: 4, // High issue - framework without tests
          fixable: true,
          fixHint: "Create test files with .test.ts or .spec.ts extension"
        })
        recommendations.push("Create test files")
        return {
          counts: countFindingsByWeight(findings),
          findings,
          recommendations
        }
      }

      // Vitest + test files found - no finding (positive state)
      return {
        counts: countFindingsByWeight(findings),
        findings,
        recommendations
      }
    }

    // Check for Jest
    if (deps.jest) {
      store.set("testingFramework", { type: "jest", version: deps.jest })

      if (!hasTestFiles) {
        findings.push({
          message: "Jest installed but no test files found",
          weight: 4, // High issue - framework without tests
          fixable: true
        })
        recommendations.push("Create test files")
        return {
          counts: countFindingsByWeight(findings),
          findings,
          recommendations
        }
      }

      // Jest + test files found - no finding (positive state)
      return {
        counts: countFindingsByWeight(findings),
        findings,
        recommendations
      }
    }

    // Framework-specific checks
    if (store.isReact) {
      const hasReactTestingLib = deps["@testing-library/react"]
      if (!hasReactTestingLib) {
        findings.push({
          message: "React detected but @testing-library/react not installed",
          weight: 3, // Medium issue - React without testing lib
          fixable: true,
          fixHint: "Install @testing-library/react for React component testing"
        })
        recommendations.push("Install @testing-library/react")
      }
      // React testing lib installed - no finding (positive state)
    }

    if (store.framework?.type === "vue") {
      const hasVueTestUtils = deps["@vue/test-utils"]
      if (!hasVueTestUtils) {
        findings.push({
          message: "Vue detected but @vue/test-utils not installed",
          weight: 3, // Medium issue
          fixable: true
        })
        recommendations.push("Install @vue/test-utils")
      }
      // Vue test utils installed - no finding (positive state)
    }

    if (!hasTestFiles && !deps.jest && !deps.vitest) {
      findings.push({
        message: "No testing framework detected. You're not testing, are you?",
        weight: 5, // Catastrophic - no testing at all
        fixable: true,
        fixHint: "Install Jest or Vitest and create test files"
      })
      recommendations.push("Install a testing framework (Jest or Vitest)")
      return {
        counts: countFindingsByWeight(findings),
        findings,
        recommendations
      }
    }

    return {
      counts: countFindingsByWeight(findings),
      findings,
      recommendations
    }
  }
}
