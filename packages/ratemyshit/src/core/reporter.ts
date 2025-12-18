import boxen from "boxen"
import kleur from "kleur"

import type { FindingCounts, Plugin, PluginId, PluginResult } from "./plugin"

export class Reporter {
  displayReport(
    plugins: Plugin[],
    results: Map<PluginId, PluginResult>,
    totalCounts: FindingCounts,
    frameworkName?: string
  ): void {
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

      // Display counts summary
      const counts = result.counts
      const totalIssues = counts.weight5 + counts.weight4 + counts.weight3 + counts.weight2 + counts.weight1

      // Build content for this plugin section
      const contentLines: string[] = []
      const countSummary = `Issues: ${totalIssues}`
      const titleWithCounts = `${plugin.name} ${kleur.dim(countSummary)}`

      // Display findings
      for (const finding of result.findings) {
        // Icon based on weight
        const icon = finding.weight >= 5 ? "✗" : finding.weight >= 3 ? "⚠️" : "ℹ️"

        // Color based on weight
        const color =
          finding.weight >= 5
            ? kleur.red
            : finding.weight >= 4
              ? kleur.red
              : finding.weight >= 3
                ? kleur.yellow
                : kleur.blue

        const message = `${icon} ${finding.message}`
        const wrappedMessage = this.wrapText(message, 60)
        for (const line of wrappedMessage) {
          contentLines.push(color(line))
        }

        if (finding.fixHint) {
          const hint = `  ${finding.fixHint}`
          const wrappedHint = this.wrapText(hint, 58)
          for (const line of wrappedHint) {
            contentLines.push(kleur.dim(line))
          }
        }
      }

      // Determine border color based on issue count
      const hasCriticalIssues = counts.weight5 > 0
      const borderColor = hasCriticalIssues ? "red" : totalIssues > 0 ? "yellow" : "green"

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

    // Display total counts summary
    const totalIssues =
      totalCounts.weight5 + totalCounts.weight4 + totalCounts.weight3 + totalCounts.weight2 + totalCounts.weight1
    const hasCritical = totalCounts.weight5 > 0
    const borderColor = hasCritical ? "red" : totalIssues > 0 ? "yellow" : "green"

    const summaryLines = [
      `Critical (weight 5): ${totalCounts.weight5}`,
      `High (weight 4): ${totalCounts.weight4}`,
      `Medium (weight 3): ${totalCounts.weight3}`,
      `Low (weight 2): ${totalCounts.weight2}`,
      `Minor (weight 1): ${totalCounts.weight1}`
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
