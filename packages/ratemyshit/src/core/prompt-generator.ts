import boxen from "boxen"
import kleur from "kleur"

import type { Plugin, PluginId, PluginResult } from "./plugin"
import type { ContextStore } from "./store"

export class PromptGenerator {
  async generateAndPrint(store: ContextStore, plugins: Plugin[], results: Map<PluginId, PluginResult>): Promise<void> {
    const prompt = this.generatePrompt(store, plugins, results)

    console.log()
    console.log(
      boxen(prompt, {
        padding: 1,
        borderStyle: "round",
        borderColor: "yellow",
        title: "🤖 AI Fix Prompt",
        titleAlignment: "left",
        width: 80
      })
    )
    console.log()
  }

  private generatePrompt(store: ContextStore, plugins: Plugin[], results: Map<string, PluginResult>): string {
    const lines: string[] = []

    lines.push("TASK: Fix all issues found in the frontend project analysis.")
    lines.push("")
    lines.push("REQUIREMENTS:")
    lines.push("  ✓ Fix ALL issues completely and correctly")
    lines.push("  ✓ NO shortcuts, NO hacks, NO workarounds")
    lines.push("  ✓ NO eslint-disable comments unless absolutely necessary")
    lines.push("  ✓ Understand the root cause before fixing")
    lines.push("  ✓ Verify fixes don't break existing functionality")
    lines.push("  ✓ Consider edge cases and error handling")
    lines.push("  ✓ Follow TypeScript and JavaScript best practices")
    lines.push("")

    // Project context
    lines.push("PROJECT CONTEXT:")
    if (store.framework) {
      lines.push(`  Framework: ${store.framework.type}${store.framework.version ? ` ${store.framework.version}` : ""}`)
    }
    if (store.isTypeScript) {
      lines.push("  TypeScript: Yes")
    }
    if (store.packageManager) {
      lines.push(`  Package Manager: ${store.packageManager}`)
    }
    lines.push("")

    // Group findings by severity (single source of truth)
    const wtfFindings: Array<{ plugin: string; finding: string; fixHint?: string }> = []
    const bigFindings: Array<{ plugin: string; finding: string; fixHint?: string }> = []
    const smolFindings: Array<{ plugin: string; finding: string; fixHint?: string }> = []

    for (const plugin of plugins) {
      const result = results.get(plugin.id)
      if (!result) continue

      for (const finding of result.findings) {
        if (!finding.fixable) continue

        const entry = {
          plugin: plugin.name,
          finding: finding.message,
          fixHint: finding.fixHint
        }

        // Group by severity directly (severity is the single source of truth)
        if (finding.severity === "WTF") {
          wtfFindings.push(entry)
        } else if (finding.severity === "BIG") {
          bigFindings.push(entry)
        } else if (finding.severity === "SMOL") {
          smolFindings.push(entry)
        }
      }
    }

    // Output findings by priority
    if (wtfFindings.length > 0) {
      lines.push("WTF ISSUES (Fix these first):")
      wtfFindings.forEach((item, idx) => {
        lines.push(`  ${idx + 1}. [${item.plugin}] ${item.finding}`)
        if (item.fixHint) {
          lines.push(`     Fix: ${item.fixHint}`)
        }
      })
      lines.push("")
    }

    if (bigFindings.length > 0) {
      lines.push("BIG ISSUES:")
      bigFindings.forEach((item, idx) => {
        lines.push(`  ${idx + 1}. [${item.plugin}] ${item.finding}`)
        if (item.fixHint) {
          lines.push(`     Fix: ${item.fixHint}`)
        }
      })
      lines.push("")
    }

    if (smolFindings.length > 0) {
      lines.push("SMOL ISSUES:")
      smolFindings.forEach((item, idx) => {
        lines.push(`  ${idx + 1}. [${item.plugin}] ${item.finding}`)
        if (item.fixHint) {
          lines.push(`     Fix: ${item.fixHint}`)
        }
      })
      lines.push("")
    }

    lines.push("EXPECTED OUTPUT:")
    lines.push("  ✓ All issues fixed with proper, production-ready solutions")
    lines.push("  ✓ Code follows TypeScript/JavaScript best practices")
    lines.push("  ✓ No new ESLint issues introduced")
    lines.push("  ✓ All changes are minimal, focused, and well-reasoned")
    lines.push("  ✓ Code is maintainable and follows project conventions")

    return lines.join("\n")
  }
}
