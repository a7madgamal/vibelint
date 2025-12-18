import boxen from "boxen"
import kleur from "kleur"

import { getPassedStyle, getWeightStyle } from "./check-utils"
import type { Plugin, PluginId, PluginResult, severity } from "./plugin"

export class Reporter {
  displayReport(plugins: Plugin[], results: Map<PluginId, PluginResult>, frameworkName?: string): void {
    console.log()

    // Header box
    const headerText = "🎯 RATE MY SHIT - Project Analysis Report"
    const metaInfo = []
    if (frameworkName) {
      metaInfo.push(`🔍 ${frameworkName}`)
    }
    metaInfo.push(`📅 ${new Date().toLocaleString()}`)
    const headerContent = [headerText, kleur.dim(metaInfo.join(" • "))].join("\n")

    console.log(
      boxen(headerContent, {
        padding: { top: 0, bottom: 0, left: 1, right: 1 },
        borderStyle: "double",
        borderColor: "cyan",
        textAlignment: "center"
      })
    )
    console.log()

    // Display each plugin's results (skip informational plugins that shouldn't be displayed)
    const informationalPluginIds = ["framework", "build-tool", "package-manager"]

    for (const plugin of plugins) {
      // Skip informational plugins from display
      if (informationalPluginIds.includes(plugin.id)) {
        continue
      }

      const result = results.get(plugin.id)
      if (!result) continue

      // Build content for this plugin section
      const contentLines: string[] = []

      // Display all checks
      for (const check of result.checks) {
        if (check.passed) {
          const style = getPassedStyle()
          const line = `${style.emoji} ${check.name}`
          contentLines.push(style.color(line))
        } else if (check.finding) {
          const style = getWeightStyle(check.finding.severity)
          const line = `${style.emoji} ${check.name}: ${check.finding.message}`
          const wrappedLine = this.wrapText(line, 60)
          for (const wrapped of wrappedLine) {
            contentLines.push(style.color(wrapped))
          }

          if (check.finding.fixHint) {
            const hint = `  ${check.finding.fixHint}`
            const wrappedHint = this.wrapText(hint, 58)
            for (const line of wrappedHint) {
              contentLines.push(kleur.dim(line))
            }
          }
        }
      }

      // Determine highest severity finding for title color
      let highestWeight: severity | null = null
      const failedChecks = result.checks.filter((c) => !c.passed && c.finding)
      if (failedChecks.length > 0) {
        const severities = failedChecks.map((c) => c.finding?.severity)
        if (severities.includes("WTF")) highestWeight = "WTF"
        else if (severities.includes("BIG")) highestWeight = "BIG"
        else if (severities.includes("SMOL")) highestWeight = "SMOL"
      }

      // Color plugin title based on findings: green if all passed, or one of 3 colors for severity levels
      const allPassed = result.checks.every((c) => c.passed)
      const titleColor = allPassed
        ? kleur.green
        : highestWeight === "WTF"
          ? kleur.red
          : highestWeight === "BIG"
            ? kleur.yellow
            : kleur.cyan // SMOL

      const titleWithCounts = `${titleColor(plugin.name)}`

      // Determine border color
      const hasCriticalIssues = failedChecks.some((c) => c.finding?.severity === "WTF")
      const hasIssues = failedChecks.length > 0
      const borderColor = hasCriticalIssues ? "red" : hasIssues ? "yellow" : "green"

      console.log(
        boxen(contentLines.join("\n"), {
          padding: { top: 0, bottom: 0, left: 1, right: 1 },
          borderStyle: "round",
          borderColor,
          title: titleWithCounts,
          titleAlignment: "left"
        })
      )
      console.log()
    }

    // Calculate total counts from all results
    let totalWtf = 0
    let totalBig = 0
    let totalSmol = 0
    let totalPassed = 0
    let totalFailed = 0

    for (const result of results.values()) {
      for (const check of result.checks) {
        if (check.passed) {
          totalPassed++
        } else if (check.finding) {
          totalFailed++
          if (check.finding.severity === "WTF") totalWtf++
          else if (check.finding.severity === "BIG") totalBig++
          else if (check.finding.severity === "SMOL") totalSmol++
        }
      }
    }

    // Display total counts summary
    const totalIssues = totalWtf + totalBig + totalSmol
    const hasCritical = totalWtf > 0
    const borderColor = hasCritical ? "red" : totalIssues > 0 ? "yellow" : "green"

    const summaryLines = [
      `Passed: ${totalPassed}`,
      `Failed: ${totalFailed}`,
      `WTF: ${totalWtf}`,
      `BIG: ${totalBig}`,
      `SMOL: ${totalSmol}`
    ]

    console.log(
      boxen(summaryLines.join("\n"), {
        padding: { top: 0, bottom: 0, left: 1, right: 1 },
        borderStyle: "double",
        borderColor,
        title: `Total Counts`,
        titleAlignment: "center",
        textAlignment: "left"
      })
    )
    console.log()
  }

  private wrapText(text: string, maxWidth: number): string[] {
    const words = text.split(" ")
    const lines: string[] = []
    let currentLine = ""

    for (const word of words) {
      if ((currentLine + word).length <= maxWidth) {
        currentLine += (currentLine ? " " : "") + word
      } else {
        if (currentLine) {
          lines.push(currentLine)
        }
        currentLine = word
      }
    }

    if (currentLine) {
      lines.push(currentLine)
    }

    return lines.length > 0 ? lines : [text]
  }
}
