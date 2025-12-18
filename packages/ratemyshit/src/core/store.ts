export interface FrameworkInfo {
  type: "react" | "nextjs" | "angular" | "vue" | "svelte" | "vanilla"
  version?: string
  metadata?: Record<string, unknown>
}

export interface PackageJson {
  name?: string
  version?: string
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
  scripts?: Record<string, string>
  [key: string]: unknown
}

export class ContextStore {
  private data: Map<string, unknown> = new Map()
  public readonly cwd: string
  public readonly monorepoRoot?: string

  constructor(initialData: { cwd: string; packageJson?: PackageJson; monorepoRoot?: string }) {
    this.cwd = initialData.cwd
    this.monorepoRoot = initialData.monorepoRoot
    if (initialData.packageJson) {
      this.data.set("packageJson", initialData.packageJson)
    }
  }

  // Read operations
  get<T>(key: string): T | undefined {
    return this.data.get(key) as T | undefined
  }

  has(key: string): boolean {
    return this.data.has(key)
  }

  // Write operations
  set<T>(key: string, value: T): void {
    this.data.set(key, value)
  }

  // Type-safe getters for common properties
  get isReact(): boolean {
    return this.get<boolean>("isReact") ?? false
  }

  get isNextJs(): boolean {
    return this.get<boolean>("isNextJs") ?? false
  }

  get isTypeScript(): boolean {
    return this.get<boolean>("isTypeScript") ?? false
  }

  get isEslintInstalled(): boolean {
    return this.get<boolean>("isEslintInstalled") ?? false
  }

  get packageManager(): "npm" | "pnpm" | "yarn" | undefined {
    return this.get<"npm" | "pnpm" | "yarn">("packageManager")
  }

  get framework(): FrameworkInfo | undefined {
    return this.get<FrameworkInfo>("framework")
  }

  get packageJson(): PackageJson | undefined {
    return this.get<PackageJson>("packageJson")
  }

  /**
   * Get the root directory to check for monorepo-level files.
   * In a monorepo, this is the monorepo root. Otherwise, it's the current working directory.
   */
  get rootDir(): string {
    return this.monorepoRoot ?? this.cwd
  }

  /**
   * Check if we're in a monorepo context
   */
  get isMonorepo(): boolean {
    return this.monorepoRoot !== undefined && this.monorepoRoot !== this.cwd
  }
}
