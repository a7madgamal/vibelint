#!/usr/bin/env node
import { relative } from "path"

import kleur from "kleur"
import prompts from "prompts"

import { PromptGenerator } from "./core/prompt-generator"
import { PluginRegistry } from "./core/registry"
import { Reporter } from "./core/reporter"
import { Scorer } from "./core/scorer"
import { ContextStore } from "./core/store"
import { buildToolPlugin } from "./plugins/build-tool.plugin"
import { eslintPlugin } from "./plugins/eslint.plugin"
import { frameworkPlugin } from "./plugins/framework.plugin"
import { gitPlugin } from "./plugins/git.plugin"
import { packageManagerPlugin } from "./plugins/package-manager.plugin"
import { testingPlugin } from "./plugins/testing.plugin"
import { typescriptPlugin } from "./plugins/typescript.plugin"
import { detectMonorepo, readPackageJson } from "./utils/detection"

async function analyzeProject(cwd: string): Promise<void> {
  // Initialize store with basic project data
  const packageJson = await readPackageJson(cwd)
  const store = new ContextStore({ cwd, packageJson })

  // Register all plugins
  const registry = new PluginRegistry()
  registry.register(gitPlugin)
  registry.register(typescriptPlugin)
  registry.register(frameworkPlugin)
  registry.register(packageManagerPlugin)
  registry.register(eslintPlugin)
  registry.register(buildToolPlugin)
  registry.register(testingPlugin)

  // Execute all plugins
  const results = await registry.executeAll(store)
  const plugins = registry.getAllPlugins()

  // Aggregate counts
  const scorer = new Scorer()
  const countResult = scorer.aggregateCounts(plugins, results)

  // Generate framework name for display
  const framework = store.framework
  const frameworkName = framework
    ? `${framework.type.charAt(0).toUpperCase() + framework.type.slice(1)}${framework.version ? ` ${framework.version}` : ""}`
    : undefined

  // Display report
  const reporter = new Reporter()
  reporter.displayReport(plugins, results, countResult.totalCounts, frameworkName)

  // Generate and print AI prompt
  const promptGenerator = new PromptGenerator()
  await promptGenerator.generateAndPrint(store, plugins, results)
}

async function main(): Promise<void> {
  try {
    const cwd = process.cwd()

    // Detect if we're in a monorepo
    const monorepo = await detectMonorepo(cwd)

    if (monorepo && monorepo.packages.length > 0) {
      console.log(kleur.cyan().bold(`\n🎯 Monorepo detected (${monorepo.type})`))
      console.log(kleur.dim(`Found ${monorepo.packages.length} package(s)\n`))

      if (!process.stdin.isTTY) {
        // Non-interactive mode - analyze root
        console.log(kleur.yellow("Non-interactive mode: analyzing monorepo root\n"))
        await analyzeProject(cwd)
        return
      }

      // Interactive mode - ask user what to analyze
      const choices = [
        {
          title: "Analyze monorepo root",
          value: "root",
          description: "Analyze the root package.json and shared configs"
        },
        ...monorepo.packages.map((pkgPath) => ({
          title: `Analyze ${relative(cwd, pkgPath)}`,
          value: pkgPath,
          description: `Analyze package at ${relative(cwd, pkgPath)}`
        }))
      ]

      const response = await prompts(
        {
          type: "select",
          name: "target",
          message: "Which package would you like to analyze?",
          choices,
          initial: 0
        },
        {
          onCancel: () => {
            console.log(kleur.yellow("\nCancelled. Exiting."))
            process.exit(0)
          }
        }
      )

      if (!response || !response.target) {
        console.log(kleur.yellow("No selection made. Exiting."))
        process.exit(0)
      }

      if (response.target === "root") {
        console.log(kleur.blue("\nAnalyzing monorepo root...\n"))
        await analyzeProject(cwd)
      } else {
        // Analyze specific package
        console.log(kleur.blue(`\nAnalyzing ${relative(cwd, response.target)}...\n`))
        await analyzeProject(response.target)
      }
    } else {
      // Not a monorepo or no packages found - analyze current directory
      console.log(kleur.blue("Analyzing your project... (this might take a moment)"))
      console.log()
      await analyzeProject(cwd)
    }
  } catch (error) {
    console.error(kleur.red("Fatal error:"), error)
    process.exit(1)
  }
}

main().catch((error) => {
  console.error(kleur.red("Unexpected error:"), error)
  process.exit(1)
})
