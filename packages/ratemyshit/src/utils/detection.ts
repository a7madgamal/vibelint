import { existsSync } from "fs"
import { readdir, readFile } from "fs/promises"
import { join, relative } from "path"

import type { PackageJson } from "../core/store"

export interface MonorepoInfo {
  type: "pnpm" | "yarn" | "lerna" | "nx" | "rush" | "none"
  packages: string[]
  rootPath: string
}

export async function readPackageJson(cwd: string): Promise<PackageJson | undefined> {
  const packageJsonPath = join(cwd, "package.json")
  if (!existsSync(packageJsonPath)) {
    return undefined
  }

  try {
    const content = await readFile(packageJsonPath, "utf-8")
    return JSON.parse(content) as PackageJson
  } catch {
    return undefined
  }
}

export function fileExists(cwd: string, filename: string): boolean {
  return existsSync(join(cwd, filename))
}

export async function readJsonFile<T>(cwd: string, filename: string): Promise<T | undefined> {
  const filePath = join(cwd, filename)
  if (!existsSync(filePath)) {
    return undefined
  }

  try {
    const content = await readFile(filePath, "utf-8")
    return JSON.parse(content) as T
  } catch {
    return undefined
  }
}

export async function readTextFile(cwd: string, filename: string): Promise<string | undefined> {
  const filePath = join(cwd, filename)
  if (!existsSync(filePath)) {
    return undefined
  }

  try {
    return await readFile(filePath, "utf-8")
  } catch {
    return undefined
  }
}

export async function detectMonorepo(cwd: string): Promise<MonorepoInfo | undefined> {
  // Check for pnpm workspace
  const pnpmWorkspace = join(cwd, "pnpm-workspace.yaml")
  if (existsSync(pnpmWorkspace)) {
    try {
      const content = await readTextFile(cwd, "pnpm-workspace.yaml")
      if (content) {
        // Simple parsing - look for packages: patterns
        const packages: string[] = []
        const lines = content.split("\n")
        for (const line of lines) {
          const match = line.match(/^\s*-\s*(.+)$/)
          if (match) {
            const pattern = match[1].trim().replace(/['"]/g, "")
            // Convert glob pattern to actual paths
            if (pattern.includes("*")) {
              const basePattern = pattern.replace(/\*\*/g, "*").replace(/\*/g, "")
              const basePath = join(cwd, basePattern)
              try {
                const dirs = await readdir(basePath)
                for (const dir of dirs) {
                  const fullPath = join(basePath, dir)
                  if (existsSync(join(fullPath, "package.json"))) {
                    packages.push(fullPath)
                  }
                }
              } catch {
                // Ignore errors
              }
            } else {
              const fullPath = join(cwd, pattern)
              if (existsSync(join(fullPath, "package.json"))) {
                packages.push(fullPath)
              }
            }
          }
        }
        return {
          type: "pnpm",
          packages: packages.length > 0 ? packages : [],
          rootPath: cwd
        }
      }
    } catch {
      // Ignore errors
    }
  }

  // Check for yarn workspace
  const packageJson = await readPackageJson(cwd)
  if (packageJson?.workspaces) {
    const workspaces = Array.isArray(packageJson.workspaces)
      ? packageJson.workspaces
      : (packageJson.workspaces as { packages?: string[] })?.packages || []
    const packages: string[] = []
    for (const workspace of workspaces) {
      const pattern = workspace.replace(/\*\//g, "")
      const basePath = join(cwd, pattern)
      try {
        const dirs = await readdir(basePath)
        for (const dir of dirs) {
          const fullPath = join(basePath, dir)
          if (existsSync(join(fullPath, "package.json"))) {
            packages.push(fullPath)
          }
        }
      } catch {
        // Ignore errors
      }
    }
    return {
      type: "yarn",
      packages,
      rootPath: cwd
    }
  }

  // Check for Lerna
  const lernaJson = join(cwd, "lerna.json")
  if (existsSync(lernaJson)) {
    try {
      const lerna = await readJsonFile<{ packages?: string[] }>(cwd, "lerna.json")
      const packages: string[] = []
      if (lerna?.packages) {
        for (const pattern of lerna.packages) {
          const basePath = join(cwd, pattern.replace(/\*\//g, ""))
          try {
            const dirs = await readdir(basePath)
            for (const dir of dirs) {
              const fullPath = join(basePath, dir)
              if (existsSync(join(fullPath, "package.json"))) {
                packages.push(fullPath)
              }
            }
          } catch {
            // Ignore errors
          }
        }
      }
      return {
        type: "lerna",
        packages,
        rootPath: cwd
      }
    } catch {
      // Ignore errors
    }
  }

  // Check for Nx
  if (existsSync(join(cwd, "nx.json")) || existsSync(join(cwd, "nx.bat"))) {
    return {
      type: "nx",
      packages: [],
      rootPath: cwd
    }
  }

  // Check for Rush
  if (existsSync(join(cwd, "rush.json"))) {
    return {
      type: "rush",
      packages: [],
      rootPath: cwd
    }
  }

  return undefined
}
