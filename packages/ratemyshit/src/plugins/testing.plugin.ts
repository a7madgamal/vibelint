import { existsSync } from "fs"
import { readdir } from "fs/promises"
import { join } from "path"

import type { Check, Finding, Plugin, PluginResult } from "../core/plugin"
import type { ContextStore } from "../core/store"

export const testingPlugin: Plugin = {
  id: "testing",
  name: "Testing Setup",
  description: "Detects testing frameworks and test files",
  enabled: true,
  dependencies: ["framework"],
  async detect(store: ContextStore): Promise<PluginResult> {
    const checks: Check[] = []
    const findings: Finding[] = []
    const recommendations: string[] = []
    const packageJson = store.packageJson

    const deps = { ...packageJson?.dependencies, ...packageJson?.devDependencies }

    // Check for test files
    const testPatterns = ["test", "tests", "__tests__", "spec"]
    let hasTestFiles = false

    try {
      const testDirs = ["__tests__", "test", "tests", "src/__tests__", "src/test", "src/tests"]
      for (const testDir of testDirs) {
        const testDirPath = join(store.cwd, testDir)
        if (existsSync(testDirPath)) {
          hasTestFiles = true
          break
        }
      }

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

    // Check: Testing framework installed
    if (deps.vitest) {
      checks.push({ name: "Testing framework installed (Vitest)", passed: true })
      store.set("testingFramework", { type: "vitest", version: deps.vitest })

      // Check: Test files exist
      if (!hasTestFiles) {
        const finding: Finding = {
          message: "Vitest installed but no test files found",
          severity: "BIG",
          fixable: true,
          fixHint: "Create test files with .test.ts or .spec.ts extension"
        }
        findings.push(finding)
        checks.push({ name: "Test files exist", passed: false, finding })
        recommendations.push("Create test files")
        return {
          checks,
          findings,
          recommendations
        }
      }
      checks.push({ name: "Test files exist", passed: true })
      return {
        checks,
        findings,
        recommendations
      }
    }

    if (deps.jest) {
      checks.push({ name: "Testing framework installed (Jest)", passed: true })
      store.set("testingFramework", { type: "jest", version: deps.jest })

      // Check: Test files exist
      if (!hasTestFiles) {
        const finding: Finding = {
          message: "Jest installed but no test files found",
          severity: "BIG",
          fixable: true
        }
        findings.push(finding)
        checks.push({ name: "Test files exist", passed: false, finding })
        recommendations.push("Create test files")
        return {
          checks,
          findings,
          recommendations
        }
      }
      checks.push({ name: "Test files exist", passed: true })
      return {
        checks,
        findings,
        recommendations
      }
    }

    // Check: Testing framework installed
    if (!hasTestFiles && !deps.jest && !deps.vitest) {
      const finding: Finding = {
        message: "No testing framework detected. You're not testing, are you?",
        severity: "WTF",
        fixable: true,
        fixHint: "Install Jest or Vitest and create test files"
      }
      findings.push(finding)
      checks.push({ name: "Testing framework installed", passed: false, finding })
      recommendations.push("Install a testing framework (Jest or Vitest)")
      return {
        checks,
        findings,
        recommendations
      }
    }

    // Framework-specific checks
    if (store.isReact) {
      const hasReactTestingLib = deps["@testing-library/react"]
      if (!hasReactTestingLib) {
        const finding: Finding = {
          message: "React detected but @testing-library/react not installed",
          severity: "BIG",
          fixable: true,
          fixHint: "Install @testing-library/react for React component testing"
        }
        findings.push(finding)
        checks.push({ name: "React testing library installed", passed: false, finding })
        recommendations.push("Install @testing-library/react")
      } else {
        checks.push({ name: "React testing library installed", passed: true })
      }
    }

    if (store.framework?.type === "vue") {
      const hasVueTestUtils = deps["@vue/test-utils"]
      if (!hasVueTestUtils) {
        const finding: Finding = {
          message: "Vue detected but @vue/test-utils not installed",
          severity: "BIG",
          fixable: true
        }
        findings.push(finding)
        checks.push({ name: "Vue test utils installed", passed: false, finding })
        recommendations.push("Install @vue/test-utils")
      } else {
        checks.push({ name: "Vue test utils installed", passed: true })
      }
    }

    return {
      checks,
      findings,
      recommendations
    }
  }
}
