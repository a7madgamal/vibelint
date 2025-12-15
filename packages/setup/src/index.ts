#!/usr/bin/env node
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
  const pnpmCheck = spawnSync("pnpm", ["--version"], { stdio: "ignore" })
  if (pnpmCheck.status === 0) {
    return "pnpm"
  }

  const yarnCheck = spawnSync("yarn", ["--version"], { stdio: "ignore" })
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

function writePackageJson(pkg: PackageJson): void {
  const packageJsonPath = join(process.cwd(), "package.json")
  writeFileSync(packageJsonPath, JSON.stringify(pkg, null, 2) + "\n", "utf-8")
}

function installPackage(packageManager: PackageManager, packageName: string): boolean {
  const args = packageManager === "pnpm" ? ["add", "-D", packageName] : ["install", "-D", packageName]
  if (packageManager === "yarn") {
    args[0] = "add"
    args.push("--dev")
  }

  console.log(kleur.dim(`Running: ${packageManager} ${args.join(" ")}`))
  const result = spawnSync(packageManager, args, {
    stdio: "inherit",
    cwd: process.cwd()
  })

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

  console.log(kleur.dim("To use @vibelint/eslint-plugin-suppress-approved, add it to your ESLint configuration:\n"))

  if (configFormat === "flat") {
    console.log(kleur.green("For ESLint flat config (eslint.config.mjs/js/ts):\n"))
    console.log(kleur.white("1. Import the plugin:"))
    console.log(kleur.gray('   import suppressApprovedPlugin from "@vibelint/eslint-plugin-suppress-approved"\n'))
    console.log(kleur.white("2. Add processor configs:"))
    console.log(
      kleur.gray(`   {
     files: ["**/*.js"],
     plugins: {
       "suppress-approved": suppressApprovedPlugin
     },
     processor: "suppress-approved/js"
   },
   {
     files: ["**/*.ts"],
     plugins: {
       "suppress-approved": suppressApprovedPlugin
     },
     processor: "suppress-approved/ts"
   },
   {
     files: ["**/*.jsx"],
     plugins: {
       "suppress-approved": suppressApprovedPlugin
     },
     processor: "suppress-approved/jsx"
   },
   {
     files: ["**/*.tsx"],
     plugins: {
       "suppress-approved": suppressApprovedPlugin
     },
     processor: "suppress-approved/tsx"
   }`)
    )
  } else {
    console.log(kleur.green("For ESLint legacy config (.eslintrc.*):\n"))
    console.log(kleur.white("1. Install the plugin:"))
    console.log(kleur.gray("   npm install -D @vibelint/eslint-plugin-suppress-approved\n"))
    console.log(kleur.white("2. Add to your .eslintrc.json:"))
    console.log(
      kleur.gray(`   {
     "plugins": ["@vibelint/suppress-approved"],
     "overrides": [
       {
         "files": ["*.js"],
         "processor": "@vibelint/suppress-approved/js"
       },
       {
         "files": ["*.ts"],
         "processor": "@vibelint/suppress-approved/ts"
       },
       {
         "files": ["*.jsx"],
         "processor": "@vibelint/suppress-approved/jsx"
       },
       {
         "files": ["*.tsx"],
         "processor": "@vibelint/suppress-approved/tsx"
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

  // Confirm package manager
  const { confirmed } = await prompts(
    {
      type: "confirm",
      name: "confirmed",
      message: `Use ${packageManager} to install packages?`,
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

  if (!confirmed) {
    console.log("Setup cancelled.")
    process.exit(0)
  }

  // Ask which tools to install
  const { toolSelection } = await prompts(
    {
      type: "select",
      name: "toolSelection",
      message: "Which tools would you like to install?",
      choices: [
        { title: "Only commit message generation (@vibelint/roastedCommit)", value: "commit-only" },
        { title: "Only lint wizard (@vibelint/eslint-warning-approval)", value: "lint-only" },
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

  const selection = toolSelection as ToolSelection

  // Ask about ESLint plugin if lint wizard is selected
  let installPlugin = false
  if (selection === "lint-only" || selection === "both") {
    const { pluginChoice } = await prompts(
      {
        type: "confirm",
        name: "pluginChoice",
        message: "Install ESLint plugin (@vibelint/eslint-plugin-suppress-approved)?",
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

  // Read package.json
  const pkg = readPackageJson()

  // Install packages
  console.log(`\n${kleur.blue("Installing packages...")}\n`)

  const packagesToInstall: string[] = []
  if (selection === "commit-only" || selection === "both") {
    packagesToInstall.push("@vibelint/roastedCommit")
  }
  if (selection === "lint-only" || selection === "both") {
    packagesToInstall.push("@vibelint/eslint-warning-approval")
  }
  if (installPlugin) {
    packagesToInstall.push("@vibelint/eslint-plugin-suppress-approved")
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

  // Add scripts to package.json
  console.log(kleur.blue("Updating package.json scripts...\n"))

  if (!pkg.scripts) {
    pkg.scripts = {}
  }

  if (selection === "commit-only" || selection === "both") {
    pkg.scripts.commit = "vibelint-roasted-commit"
    console.log(kleur.green("✓ Added script: commit"))
  }

  if (selection === "lint-only" || selection === "both") {
    pkg.scripts["commit-lint"] = "vibelint-eslint-warning-approval"
    console.log(kleur.green("✓ Added script: commit-lint"))
  }

  writePackageJson(pkg)
  console.log()

  // Show ESLint plugin instructions if plugin was installed
  if (installPlugin) {
    showESLintPluginInstructions(eslintConfigFormat)
  }

  // Optional git hook setup
  if (selection === "lint-only" || selection === "both") {
    const { setupHook } = await prompts(
      {
        type: "confirm",
        name: "setupHook",
        message: "Set up git pre-commit hook to run lint wizard?",
        initial: false,
        stdin: process.stdin,
        stdout: process.stdout
      },
      {
        onCancel: () => {
          // Continue without hook
        }
      }
    )

    if (setupHook) {
      console.log(kleur.blue("\nSetting up git hook...\n"))

      // Check if husky is installed
      const huskyInstalled =
        (pkg.devDependencies && pkg.devDependencies.husky) || (pkg.dependencies && pkg.dependencies.husky)

      if (huskyInstalled) {
        const huskyDir = join(process.cwd(), ".husky")
        const preCommitHook = join(huskyDir, "pre-commit")

        if (!existsSync(huskyDir)) {
          spawnSync("npx", ["husky", "init"], { stdio: "inherit", cwd: process.cwd() })
        }

        let hookContent = ""
        if (existsSync(preCommitHook)) {
          hookContent = readFileSync(preCommitHook, "utf-8")
        }

        const lintCommand = packageManager === "pnpm" ? "pnpm commit-lint" : "npm run commit-lint"
        const newLine = `\n${lintCommand} || exit 1\n`

        if (!hookContent.includes(lintCommand)) {
          writeFileSync(preCommitHook, hookContent + newLine, "utf-8")
          console.log(kleur.green("✓ Added lint wizard to pre-commit hook"))
        } else {
          console.log(kleur.yellow("⚠ Lint wizard already in pre-commit hook"))
        }
      } else {
        console.log(kleur.yellow("⚠ Husky not found. Install husky first, then add this to your pre-commit hook:"))
        const lintCommand = packageManager === "pnpm" ? "pnpm commit-lint" : "npm run commit-lint"
        console.log(kleur.gray(`   ${lintCommand} || exit 1`))
      }
    }
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
  if (pkg.scripts?.commit) {
    console.log(kleur.dim(`  ${packageManager === "pnpm" ? "pnpm" : "npm"} run commit`))
  }
  if (pkg.scripts?.["commit-lint"]) {
    console.log(kleur.dim(`  ${packageManager === "pnpm" ? "pnpm" : "npm"} run commit-lint`))
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
