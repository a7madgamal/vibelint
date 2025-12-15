#!/usr/bin/env node

// ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
// ┃                                                                        ┃
// ┃  ⚠️  REMINDER: UPDATE CHANGELOG.md WHEN MAKING CHANGES!  ⚠️           ┃
// ┃                                                                        ┃
// ┃  Location: packages/setup/CHANGELOG.md                                ┃
// ┃                                                                        ┃
// ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
import { spawnSync } from "child_process"
import { existsSync, readFileSync, writeFileSync } from "fs"
import { join } from "path"

import kleur from "kleur"
import prompts from "prompts"

type PackageManager = "npm" | "pnpm" | "yarn"
type ESLintConfigFormat = "flat" | "legacy" | "none"
type ToolSelection = "commit-only" | "lint-only" | "both"

interface PackageJson {
  scripts?: Record<string, string>
  devDependencies?: Record<string, string>
  dependencies?: Record<string, string>
}

function detectPackageManager(): PackageManager {
  if (existsSync("pnpm-lock.yaml") || existsSync("pnpm-workspace.yaml")) {
    return "pnpm"
  }
  if (existsSync("yarn.lock")) {
    return "yarn"
  }
  if (existsSync("package-lock.json")) {
    return "npm"
  }

  // Check which command is available
  const pnpmCheck = spawnSync("pnpm", ["--version"], {
    stdio: "ignore",
    shell: true,
    windowsHide: true
  })
  if (pnpmCheck.status === 0) {
    return "pnpm"
  }

  const yarnCheck = spawnSync("yarn", ["--version"], {
    stdio: "ignore",
    shell: true,
    windowsHide: true
  })
  if (yarnCheck.status === 0) {
    return "yarn"
  }

  return "npm"
}

function detectESLintConfig(): ESLintConfigFormat {
  const flatConfigs = ["eslint.config.mjs", "eslint.config.js", "eslint.config.ts"]
  const legacyConfigs = [".eslintrc.json", ".eslintrc.js", ".eslintrc.cjs", ".eslintrc.yml", ".eslintrc.yaml"]

  for (const config of flatConfigs) {
    if (existsSync(config)) {
      return "flat"
    }
  }

  for (const config of legacyConfigs) {
    if (existsSync(config)) {
      return "legacy"
    }
  }

  return "none"
}

function readPackageJson(): PackageJson {
  const packageJsonPath = join(process.cwd(), "package.json")
  if (!existsSync(packageJsonPath)) {
    throw new Error("package.json not found. Please run this command in a project directory.")
  }

  const content = readFileSync(packageJsonPath, "utf-8")
  return JSON.parse(content)
}

function addScriptsToPackageJson(pkg: PackageJson, scriptsToAdd: Record<string, string>): boolean {
  // Use the already-read package.json object - merge scripts and write back
  // This ensures we never lose packages since we're using the object that already has them
  if (!pkg.scripts) {
    pkg.scripts = {}
  }

  // Merge scripts
  Object.assign(pkg.scripts, scriptsToAdd)

  // Write back the complete package.json
  try {
    const packageJsonPath = join(process.cwd(), "package.json")
    writeFileSync(packageJsonPath, JSON.stringify(pkg, null, 2) + "\n", "utf-8")
    return true
  } catch (error) {
    console.error(
      kleur.red(`Failed to write package.json: ${error instanceof Error ? error.message : "unknown error"}`)
    )
    return false
  }
}

function installPackage(packageManager: PackageManager, packageName: string): boolean {
  // Always install latest version
  const pkgWithVersion = `${packageName}@latest`
  const args = packageManager === "pnpm" ? ["add", "-D", pkgWithVersion] : ["install", "-D", pkgWithVersion]
  if (packageManager === "yarn") {
    args[0] = "add"
    args.push("--dev")
  }

  console.log(kleur.dim(`Running: ${packageManager} ${args.join(" ")}`))
  const result = spawnSync(packageManager, args, {
    stdio: ["ignore", "inherit", "inherit"],
    cwd: process.cwd(),
    shell: true,
    windowsHide: true
  })

  // Small delay to ensure package.json is fully written
  if (result.status === 0) {
    // Give the file system a moment to sync
    const start = Date.now()
    while (Date.now() - start < 100) {
      // Busy wait for file system sync
    }
  }

  return result.status === 0
}

function showESLintPluginInstructions(configFormat: ESLintConfigFormat): void {
  console.log(`\n${kleur.cyan().bold("=".repeat(80))}`)
  console.log(kleur.cyan().bold("ESLint Plugin Setup Instructions"))
  console.log(kleur.cyan().bold("=".repeat(80)) + "\n")

  if (configFormat === "none") {
    console.log(kleur.yellow("No ESLint configuration found. Please set up ESLint first."))
    return
  }

  console.log(kleur.dim("To use @vibelint/eslint-plugin-vibelint, add it to your ESLint configuration:\n"))

  if (configFormat === "flat") {
    console.log(kleur.green("For ESLint flat config (eslint.config.mjs/js/ts):\n"))
    console.log(kleur.white("1. Import the plugin:"))
    console.log(kleur.gray('   import vibelintPlugin from "@vibelint/eslint-plugin-vibelint"\n'))
    console.log(kleur.white("2. Add to your config array:"))
    console.log(
      kleur.gray(`   export default [
     // ... your other configs
     ...vibelintPlugin.configs.recommended
   ]`)
    )
  } else {
    console.log(kleur.green("For ESLint legacy config (.eslintrc.*):\n"))
    console.log(kleur.white("1. Install the plugin:"))
    console.log(kleur.gray("   npm install -D @vibelint/eslint-plugin-vibelint\n"))
    console.log(kleur.white("2. Add to your .eslintrc.json:"))
    console.log(
      kleur.gray(`   {
    "plugins": ["@vibelint/vibelint"],
    "overrides": [
      {
        "files": ["*.js"],
        "processor": "@vibelint/vibelint/js"
      },
      {
        "files": ["*.ts"],
        "processor": "@vibelint/vibelint/ts"
      },
      {
        "files": ["*.jsx"],
        "processor": "@vibelint/vibelint/jsx"
      },
      {
        "files": ["*.tsx"],
        "processor": "@vibelint/vibelint/tsx"
      }
    ]
   }`)
    )
  }

  console.log(`\n${kleur.yellow().bold("Important:")}`)
  console.log(
    kleur.dim(
      "The cache file `.eslint-warnings-cache.json` will be created automatically and MUST be committed to git."
    )
  )
  console.log(kleur.cyan().bold("\n" + "=".repeat(80) + "\n"))
}

async function main() {
  console.log(kleur.cyan().bold("\n🎵 Welcome to lintmyvibe!\n"))

  if (process.stdin.isPaused()) {
    process.stdin.resume()
  }

  if (!process.stdin.isTTY) {
    console.error("\nERROR: stdin is not a TTY. Cannot prompt for input.")
    console.error("This script requires an interactive terminal.")
    process.exit(1)
  }

  // Detect environment
  const packageManager = detectPackageManager()
  const eslintConfigFormat = detectESLintConfig()

  console.log(kleur.dim("Detected environment:"))
  console.log(kleur.dim(`  Package manager: ${packageManager}`))
  console.log(
    kleur.dim(`  ESLint config: ${eslintConfigFormat === "none" ? "Not found" : eslintConfigFormat + " config"}`)
  )
  console.log()

  // Ask which tools to install
  const { toolSelection } = await prompts(
    {
      type: "select",
      name: "toolSelection",
      message: "Which tools would you like to install?",
      choices: [
        {
          title: "Only commit message generation (@vibelint/vibelint-commit)",
          value: "commit-only"
        },
        {
          title: "Only lint wizard (@vibelint/vibelint-wizard)",
          value: "lint-only"
        },
        { title: "Both", value: "both" }
      ],
      initial: 2,
      stdin: process.stdin,
      stdout: process.stdout
    },
    {
      onCancel: () => {
        console.log("\nCancelled by user. Exiting.")
        process.exit(1)
      }
    }
  )

  if (!toolSelection) {
    console.log("Setup cancelled.")
    process.exit(0)
  }

  // Type guard to ensure toolSelection is valid
  const validSelections: ToolSelection[] = ["commit-only", "lint-only", "both"]
  if (!validSelections.includes(toolSelection)) {
    console.error(`Invalid selection: ${toolSelection}`)
    process.exit(1)
  }
  const selection: ToolSelection = toolSelection

  // Ask about ESLint plugin if lint wizard is selected
  let installPlugin = false
  if (selection === "lint-only" || selection === "both") {
    const { pluginChoice } = await prompts(
      {
        type: "confirm",
        name: "pluginChoice",
        message: "Install ESLint plugin (@vibelint/eslint-plugin-vibelint)?",
        initial: true,
        stdin: process.stdin,
        stdout: process.stdout
      },
      {
        onCancel: () => {
          console.log("\nCancelled by user. Exiting.")
          process.exit(1)
        }
      }
    )
    installPlugin = pluginChoice === true
  }

  // Read package.json first
  const initialPkg = readPackageJson()

  // Add scripts to package.json FIRST (before installing packages)
  console.log(kleur.blue("Updating package.json scripts...\n"))

  const scriptsToAdd: Record<string, string> = {}
  if (selection === "commit-only") {
    scriptsToAdd.commit = "vibelint-commit"
  } else if (selection === "lint-only") {
    scriptsToAdd["commit-wizard"] = "vibelint-wizard"
  } else if (selection === "both") {
    scriptsToAdd.commit = "vibelint-wizard && git add .eslint-warnings-cache.json && vibelint-commit"
    scriptsToAdd["commit-wizard"] = "vibelint-wizard"
  }

  if (!addScriptsToPackageJson(initialPkg, scriptsToAdd)) {
    console.error(kleur.red("Failed to add scripts to package.json"))
    process.exit(1)
  }

  for (const scriptName of Object.keys(scriptsToAdd)) {
    console.log(kleur.green(`✓ Added script: ${scriptName}`))
  }

  // Install packages AFTER scripts are added (npm/pnpm will only add dependencies, not overwrite scripts)
  console.log(`\n${kleur.blue("Installing packages...")}\n`)

  const packagesToInstall: string[] = []
  if (selection === "commit-only" || selection === "both") {
    packagesToInstall.push("@vibelint/vibelint-commit")
  }
  if (selection === "lint-only" || selection === "both") {
    packagesToInstall.push("@vibelint/vibelint-wizard")
  }
  if (installPlugin) {
    packagesToInstall.push("@vibelint/eslint-plugin-vibelint")
  }

  let allInstalled = true
  for (const pkgName of packagesToInstall) {
    console.log(kleur.cyan(`Installing ${pkgName}...`))
    if (!installPackage(packageManager, pkgName)) {
      console.error(kleur.red(`Failed to install ${pkgName}`))
      allInstalled = false
    } else {
      console.log(kleur.green(`✓ Installed ${pkgName}\n`))
    }
  }

  if (!allInstalled) {
    console.error(kleur.red("\nSome packages failed to install. Please install them manually."))
    process.exit(1)
  }

  console.log()

  // Show ESLint plugin instructions if plugin was installed
  if (installPlugin) {
    showESLintPluginInstructions(eslintConfigFormat)
  }

  // Summary
  console.log(`\n${kleur.green().bold("=".repeat(80))}`)
  console.log(kleur.green().bold("✅ Setup complete!"))
  console.log(kleur.green().bold("=".repeat(80)) + "\n")

  console.log(kleur.cyan("Installed packages:"))
  for (const pkgName of packagesToInstall) {
    console.log(kleur.dim(`  - ${pkgName}`))
  }

  console.log(`\n${kleur.cyan("Available scripts:")}`)
  const finalPkg = readPackageJson()
  if (finalPkg.scripts?.commit) {
    console.log(kleur.dim(`  ${packageManager === "pnpm" ? "pnpm" : "npm"} run commit`))
  }
  if (finalPkg.scripts?.["commit-wizard"]) {
    console.log(kleur.dim(`  ${packageManager === "pnpm" ? "pnpm" : "npm"} run commit-wizard`))
  }

  if (installPlugin && eslintConfigFormat !== "none") {
    console.log(`\n${kleur.yellow("Next steps:")}`)
    console.log(kleur.dim("  - Configure the ESLint plugin using the instructions above"))
  }

  console.log()
}

main().catch((error: unknown) => {
  console.error(kleur.red("❌ An unexpected error occurred:"), error)
  process.exit(1)
})
