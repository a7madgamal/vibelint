import { existsSync } from "fs"
import { join } from "path"

import type { Finding, Plugin, PluginResult } from "../core/plugin"
import type { ContextStore } from "../core/store"
import { countFindingsByWeight } from "../core/weight-converter"

export const gitPlugin: Plugin = {
  id: "git",
  name: "Git Setup",
  description: "Detects git version control setup",
  enabled: true,
  weight: 1.0,
  async detect(store: ContextStore): Promise<PluginResult> {
    const findings: Finding[] = []
    const recommendations: string[] = []

    const gitDir = join(store.cwd, ".git")
    const gitignore = join(store.cwd, ".gitignore")
    const hasGit = existsSync(gitDir)
    const hasGitignore = existsSync(gitignore)

    if (!hasGit) {
      findings.push({
        message: "No git repository found. You're not using version control? Really?",
        weight: 5, // Catastrophic - no version control
        fixable: true,
        fixHint: "Run 'git init' to initialize a git repository"
      })
      recommendations.push("Initialize git repository with 'git init'")
    } else {
      if (!hasGitignore) {
        findings.push({
          message: "No .gitignore file found. You're committing node_modules, aren't you?",
          weight: 4, // High issue - missing gitignore
          fixable: true,
          fixHint: "Create a .gitignore file to exclude unnecessary files"
        })
        recommendations.push("Create a .gitignore file")
      }
      // Git initialized and gitignore exists - no findings (positive state)
    }

    const counts = countFindingsByWeight(findings)

    return {
      counts,
      findings,
      recommendations
    }
  }
}
