import { execSync } from "child_process"
import { existsSync } from "fs"
import { join } from "path"

export interface CommandResult {
  success: boolean
  stdout: string
  stderr: string
  exitCode: number
}

/**
 * Execute a command and return the result
 */
export function runCommand(
  command: string,
  cwd: string,
  options: { timeout?: number; silent?: boolean } = {}
): CommandResult {
  try {
    const stdout = execSync(command, {
      cwd,
      encoding: "utf-8",
      stdio: options.silent ? "pipe" : "inherit",
      timeout: options.timeout ?? 30000,
      shell: process.platform === "win32" ? "cmd.exe" : "/bin/sh"
    })
    return {
      success: true,
      stdout,
      stderr: "",
      exitCode: 0
    }
  } catch (error: unknown) {
    // Extract error properties without type assertion
    const execError = error && typeof error === "object" ? error : {}
    const status = "status" in execError && typeof execError.status === "number" ? execError.status : 1
    const stdout = "stdout" in execError ? execError.stdout : undefined
    const stderr = "stderr" in execError ? execError.stderr : undefined

    return {
      success: false,
      stdout: typeof stdout === "string" ? stdout : stdout instanceof Buffer ? stdout.toString() : "",
      stderr: typeof stderr === "string" ? stderr : stderr instanceof Buffer ? stderr.toString() : "",
      exitCode: status
    }
  }
}

/**
 * Check if a package is installed using the package manager
 */
export function isPackageInstalled(
  packageName: string,
  packageManager: "npm" | "pnpm" | "yarn" | undefined,
  cwd: string,
  rootDir?: string
): boolean {
  // Try to find the package in node_modules
  const searchDirs = rootDir && rootDir !== cwd ? [cwd, rootDir] : [cwd]

  for (const dir of searchDirs) {
    const nodeModulesPath = join(dir, "node_modules", packageName)
    if (existsSync(nodeModulesPath)) {
      return true
    }
  }

  // Fallback: try using package manager command
  if (!packageManager) {
    return false
  }

  try {
    let command: string
    if (packageManager === "pnpm") {
      command = `pnpm list ${packageName} --depth=0`
    } else if (packageManager === "yarn") {
      command = `yarn list --pattern ${packageName} --depth=0`
    } else {
      command = `npm list ${packageName} --depth=0`
    }

    const result = runCommand(command, rootDir ?? cwd, { silent: true, timeout: 5000 })
    // Check if the package appears in the output
    return result.success && result.stdout.includes(packageName)
  } catch {
    return false
  }
}

/**
 * Get the fully resolved TypeScript config using tsc --showConfig
 * This handles extends, references, and all TypeScript config resolution
 */
export function getResolvedTsConfig(cwd: string, rootDir?: string): { success: boolean; config?: unknown } {
  try {
    // Try multiple strategies to find and run tsc
    const strategies = [
      // Strategy 1: Try npx (most reliable, works even if not installed locally)
      () => runCommand("npx --yes tsc --showConfig", cwd, { silent: true, timeout: 15000 }),
      // Strategy 2: Try tsc directly (if in PATH)
      () => runCommand("tsc --showConfig", cwd, { silent: true, timeout: 10000 }),
      // Strategy 3: Try from local node_modules
      () => {
        const localTsc = join(cwd, "node_modules", ".bin", "tsc")
        if (existsSync(localTsc)) {
          return runCommand(`"${localTsc}" --showConfig`, cwd, { silent: true, timeout: 10000 })
        }
        return { success: false, stdout: "", stderr: "", exitCode: 1 }
      },
      // Strategy 4: Try from root node_modules (for monorepos)
      () => {
        if (rootDir && rootDir !== cwd) {
          const rootTsc = join(rootDir, "node_modules", ".bin", "tsc")
          if (existsSync(rootTsc)) {
            return runCommand(`"${rootTsc}" --showConfig`, cwd, { silent: true, timeout: 10000 })
          }
        }
        return { success: false, stdout: "", stderr: "", exitCode: 1 }
      }
    ]

    for (const strategy of strategies) {
      const result = strategy()
      if (result.success && result.stdout) {
        try {
          // Parse JSON output from tsc --showConfig
          const output = result.stdout.trim()
          // Sometimes tsc outputs warnings before the JSON, try to extract just the JSON
          const jsonMatch = output.match(/\{[\s\S]*\}/)
          const jsonStr = jsonMatch ? jsonMatch[0] : output
          const config = JSON.parse(jsonStr)
          return { success: true, config }
        } catch {
          // Continue to next strategy if parsing fails
          continue
        }
      }
    }

    return { success: false }
  } catch {
    return { success: false }
  }
}

/**
 * Count files matching a pattern using find (Unix) or PowerShell (Windows)
 * Excludes node_modules and dist directories
 */
export function countFiles(pattern: string, cwd: string): number {
  try {
    const isWindows = process.platform === "win32"
    let command: string

    if (isWindows) {
      // Use PowerShell to count files, excluding node_modules and dist
      const escapedPattern = pattern.replace(/\*/g, "`*")
      command = `powershell -Command "$count = 0; Get-ChildItem -Path . -Recurse -Filter '${escapedPattern}' -File -ErrorAction SilentlyContinue | Where-Object { $_.FullName -notmatch '\\\\node_modules\\\\' -and $_.FullName -notmatch '\\\\dist\\\\' } | ForEach-Object { $count++ }; Write-Output $count"`
    } else {
      // Use find on Unix-like systems, excluding node_modules and dist
      command = `find . -type f -name "${pattern}" -not -path "*/node_modules/*" -not -path "*/dist/*" | wc -l`
    }

    const result = runCommand(command, cwd, { silent: true, timeout: 10000 })
    if (result.success && result.stdout) {
      const output = result.stdout.trim()
      const count = parseInt(output, 10)
      return isNaN(count) ? 0 : count
    }
    return 0
  } catch {
    return 0
  }
}
