import type { FindingCounts, Plugin, PluginId, PluginResult } from "./plugin"

export interface CountResult {
  totalCounts: FindingCounts // Aggregated counts across all plugins
  pluginCounts: Map<PluginId, FindingCounts>
}

export class Scorer {
  /**
   * Aggregates finding counts across all plugins.
   * Just sums up counts - no math or scoring.
   */
  aggregateCounts(plugins: Plugin[], results: Map<PluginId, PluginResult>): CountResult {
    const pluginCounts = new Map<PluginId, FindingCounts>()
    const totalCounts: FindingCounts = {
      weight5: 0,
      weight4: 0,
      weight3: 0,
      weight2: 0,
      weight1: 0
    }

    for (const plugin of plugins) {
      const result = results.get(plugin.id)
      if (!result) continue

      // Skip plugins with weight 0 (informational only)
      if (plugin.weight === 0) {
        pluginCounts.set(plugin.id, {
          weight5: 0,
          weight4: 0,
          weight3: 0,
          weight2: 0,
          weight1: 0
        })
        continue
      }

      pluginCounts.set(plugin.id, result.counts)

      // Aggregate counts
      totalCounts.weight5 += result.counts.weight5
      totalCounts.weight4 += result.counts.weight4
      totalCounts.weight3 += result.counts.weight3
      totalCounts.weight2 += result.counts.weight2
      totalCounts.weight1 += result.counts.weight1
    }

    return {
      totalCounts,
      pluginCounts
    }
  }
}
