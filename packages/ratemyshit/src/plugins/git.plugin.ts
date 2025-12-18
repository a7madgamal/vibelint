import { existsSync } from "fs"
import { join } from "path"

import type { Check, Finding, Plugin, PluginResult } from "../core/plugin"
import type { ContextStore } from "../core/store"

export const gitPlugin: Plugin = {
  id: "git",
  name: "Git Setup",
  description: "Detects git version control setup",
  enabled: true,
  async detect(store: ContextStore): Promise<PluginResult> {
    const checks: Check[] = []
    const findings: Finding[] = []
    const recommendations: string[] = []

    // In a monorepo, git files are at the root, not in the package directory
    const rootDir = store.rootDir
    const gitDir = join(rootDir, ".git")
    const gitignore = join(rootDir, ".gitignore")
    const hasGit = existsSync(gitDir)
    const hasGitignore = existsSync(gitignore)

    // Check: Git repository exists
    if (!hasGit) {
      const finding: Finding = {
        message: "No git repository found. You're not using version control? Really?",
        severity: "WTF",
        fixable: true,
        fixHint: "Run 'git init' to initialize a git repository"
      }
      findings.push(finding)
      checks.push({ name: "Git repository initialized", passed: false, finding })
      recommendations.push("Initialize git repository with 'git init'")
    } else {
      checks.push({ name: "Git repository initialized", passed: true })

      // Check: .gitignore file exists
      if (!hasGitignore) {
        const finding: Finding = {
          message: "No .gitignore file found. You're committing node_modules, aren't you?",
          severity: "BIG",
          fixable: true,
          fixHint: "Create a .gitignore file to exclude unnecessary files"
        }
        findings.push(finding)
        checks.push({ name: ".gitignore file exists", passed: false, finding })
        recommendations.push("Create a .gitignore file")
      } else {
        checks.push({ name: ".gitignore file exists", passed: true })
      }
    }

    return {
      checks,
      findings,
      recommendations
    }
  }
}
