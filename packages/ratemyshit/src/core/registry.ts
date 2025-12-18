import type { Plugin, PluginId, PluginResult } from "./plugin"
import type { ContextStore } from "./store"

export class PluginRegistry {
  private plugins: Map<PluginId, Plugin> = new Map()

  register(plugin: Plugin): void {
    this.plugins.set(plugin.id, plugin)
  }

  getPlugin(id: PluginId): Plugin | undefined {
    return this.plugins.get(id)
  }

  getAllPlugins(): Plugin[] {
    return Array.from(this.plugins.values()).filter((p) => p.enabled)
  }

  // Topological sort to resolve dependencies
  private resolveExecutionOrder(): Plugin[] {
    const plugins = this.getAllPlugins()
    const visited = new Set<string>()
    const visiting = new Set<string>()
    const result: Plugin[] = []

    const visit = (plugin: Plugin): void => {
      if (visiting.has(plugin.id)) {
        // Circular dependency detected - just add it anyway
        if (!visited.has(plugin.id)) {
          visited.add(plugin.id)
          result.push(plugin)
        }
        return
      }

      if (visited.has(plugin.id)) {
        return
      }

      visiting.add(plugin.id)

      // Visit dependencies first
      if (plugin.dependencies) {
        for (const depId of plugin.dependencies) {
          const dep = this.plugins.get(depId)
          if (dep && dep.enabled) {
            visit(dep)
          }
        }
      }

      visiting.delete(plugin.id)
      visited.add(plugin.id)
      result.push(plugin)
    }

    for (const plugin of plugins) {
      if (!visited.has(plugin.id)) {
        visit(plugin)
      }
    }

    return result
  }

  async executeAll(store: ContextStore): Promise<Map<PluginId, PluginResult>> {
    const executionOrder = this.resolveExecutionOrder()
    const results = new Map<PluginId, PluginResult>()

    // Execute plugins in dependency order
    for (const plugin of executionOrder) {
      try {
        const result = await plugin.detect(store)
        results.set(plugin.id, result)
      } catch (error) {
        // Handle plugin errors gracefully
        console.error(`Error executing plugin ${plugin.id}:`, error)
        results.set(plugin.id, {
          counts: {
            weight5: 0,
            weight4: 0,
            weight3: 0,
            weight2: 0,
            weight1: 0
          },
          findings: [
            {
              message: `Plugin ${plugin.id} failed to execute: ${error instanceof Error ? error.message : String(error)}`,
              weight: 5, // Catastrophic - plugin failure
              fixable: false
            }
          ],
          recommendations: [`Fix the error in plugin ${plugin.id}`]
        })
      }
    }

    return results
  }
}
