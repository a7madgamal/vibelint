#!/usr/bin/env node
import { spawnSync } from "child_process"
import { createHash } from "crypto"
import { existsSync } from "fs"
import { readFile, rename, writeFile } from "fs/promises"
import { join, relative } from "path"

import kleur from "kleur"
import prompts from "prompts"
import { z } from "zod"

const CACHE_FILE = ".eslint-warnings-cache.json"
const CACHE_VERSION = "1.1"
const ESLINT_CMD =
  process.env.VIBELINT_ESLINT_CMD || "npx eslint . --ext ts,tsx,js,jsx --format json --max-warnings 999999"

interface WarningFingerprint {
  file: string
  ruleId: string
  codeHash: string
  message: string
}

interface CacheFile {
  version: string
  eslintConfigHash: string
  approvedWarnings: WarningFingerprint[]
}

interface ESLintMessage {
  ruleId: string | null
  severity: number
  message: string
  line: number
  column: number
  endLine?: number
  endColumn?: number
  source?: string
}

interface ESLintFileResult {
  filePath: string
  messages: ESLintMessage[]
  suppressedMessages?: ESLintMessage[]
  errorCount: number
  warningCount: number
  fatalErrorCount?: number
  fixableErrorCount?: number
  fixableWarningCount?: number
  usedDeprecatedRules?: unknown[]
}

// Zod schemas for runtime validation
const warningFingerprintSchema = z.object({
  file: z.string(),
  ruleId: z.string(),
  codeHash: z.string(),
  message: z.string()
})

const cacheFileSchema = z.object({
  version: z.string(),
  eslintConfigHash: z.string(),
  approvedWarnings: z.array(warningFingerprintSchema)
})

const eslintMessageSchema = z.object({
  ruleId: z.string().nullable(),
  severity: z.number(),
  message: z.string(),
  line: z.number(),
  column: z.number(),
  endLine: z.number().optional(),
  endColumn: z.number().optional(),
  source: z.string().optional()
})

const eslintFileResultSchema = z.object({
  filePath: z.string(),
  messages: z.array(eslintMessageSchema),
  suppressedMessages: z.array(eslintMessageSchema).optional(),
  errorCount: z.number(),
  warningCount: z.number(),
  fatalErrorCount: z.number().optional(),
  fixableErrorCount: z.number().optional(),
  fixableWarningCount: z.number().optional(),
  usedDeprecatedRules: z.array(z.unknown()).optional()
})

function computeCodeHash(lineContent: string): string {
  const trimmed = lineContent.trim()
  return createHash("sha256").update(trimmed).digest("hex")
}

async function readSourceLine(filePath: string, lineNumber: number): Promise<string> {
  try {
    const content = await readFile(filePath, "utf-8")
    const lines = content.split("\n")
    if (lineNumber > 0 && lineNumber <= lines.length) {
      return lines[lineNumber - 1]
    }
    return ""
  } catch (error) {
    console.warn(
      `Warning: Could not read file ${filePath} (probably doesn't exist or you don't have permission, genius): ${error}`
    )
    return ""
  }
}

async function readSourceContext(
  filePath: string,
  lineNumber: number,
  contextLines: number = 3
): Promise<{ line: string; context: string[] }> {
  try {
    const content = await readFile(filePath, "utf-8")
    const lines = content.split("\n")
    if (lineNumber > 0 && lineNumber <= lines.length) {
      const startLine = Math.max(0, lineNumber - contextLines - 1)
      const endLine = Math.min(lines.length, lineNumber + contextLines)
      const context = lines.slice(startLine, endLine)
      const line = lines[lineNumber - 1]
      return { line, context }
    }
    return { line: "", context: [] }
  } catch (error) {
    console.warn(`Warning: Could not read file ${filePath} (file reading is hard, apparently): ${error}`)
    return { line: "", context: [] }
  }
}

function createFingerprint(
  filePath: string,
  ruleId: string | null,
  message: string,
  lineContent: string
): WarningFingerprint {
  const relativePath = relative(process.cwd(), filePath).replace(/\\/g, "/")
  const codeHash = computeCodeHash(lineContent)
  return {
    file: relativePath,
    ruleId: ruleId || "unknown",
    codeHash,
    message
  }
}

function fingerprintMatches(fp1: WarningFingerprint, fp2: WarningFingerprint): boolean {
  return (
    fp1.file === fp2.file && fp1.ruleId === fp2.ruleId && fp1.codeHash === fp2.codeHash && fp1.message === fp2.message
  )
}

async function detectAndHashEslintConfig(): Promise<string> {
  const configFiles = [
    "eslint.config.mjs",
    "eslint.config.js",
    "eslint.config.ts",
    ".eslintrc.json",
    ".eslintrc.js",
    ".eslintrc.cjs",
    ".eslintrc.yml",
    ".eslintrc.yaml"
  ]

  const foundConfigs: Array<{ path: string; content: string }> = []

  for (const configFile of configFiles) {
    const configPath = join(process.cwd(), configFile)
    if (existsSync(configPath)) {
      try {
        const content = await readFile(configPath, "utf-8")
        foundConfigs.push({ path: configFile, content })
      } catch (error) {
        console.warn(
          `Warning: Could not read ESLint config file ${configFile} (maybe it's corrupted? Or you deleted it? Who knows): ${error}`
        )
      }
    }
  }

  if (foundConfigs.length === 0) {
    console.warn(
      "Warning: No ESLint configuration file found! (Are you even using ESLint? Or are you just winging it?)"
    )
    return createHash("sha256").update("no-config").digest("hex")
  }

  foundConfigs.sort((a, b) => a.path.localeCompare(b.path))

  const hash = createHash("sha256")
  for (const config of foundConfigs) {
    hash.update(config.path)
    hash.update("\0")
    hash.update(config.content)
    hash.update("\0")
  }

  return hash.digest("hex")
}

async function confirmEslintConfigChange(oldHash: string, newHash: string): Promise<boolean> {
  console.log(`\n${kleur.yellow().bold("⚠️  SURPRISE! Your ESLint config changed! (Shocking, I know.)")}\n`)
  console.log(`${kleur.dim("Someone (probably you) decided to mess with the ESLint configuration.")}\n`)
  console.log(`${kleur.dim("Old config hash:")} ${kleur.gray(oldHash.substring(0, 16))}...`)
  console.log(`${kleur.dim("New config hash:")} ${kleur.gray(newHash.substring(0, 16))}...\n`)
  console.log(`${kleur.yellow("This might change what warnings we find. Or it might not. Who knows?")}\n`)
  console.log(`${kleur.dim("Maybe take a quick peek at what changed? Or don't. I'm not your boss.")}\n`)

  if (process.stdin.isPaused()) {
    process.stdin.resume()
  }

  if (!process.stdin.isTTY) {
    console.error(
      "\nERROR: stdin is not a TTY (you're probably running this in CI or a non-interactive environment, genius)."
    )
    console.error("This script requires an interactive terminal (because we need to ask you questions, duh).")
    process.exit(1)
  }

  try {
    const response = await prompts(
      {
        type: "confirm",
        name: "confirmed",
        message: "Want to proceed with this newfangled config? (Or bail out like a coward?)",
        initial: false,
        stdin: process.stdin,
        stdout: process.stdout
      },
      {
        onCancel: () => {
          console.log("\nFine, be that way. Exiting because you're no fun.")
          process.exit(1)
        }
      }
    )

    if (!response || typeof response !== "object" || !("confirmed" in response)) {
      console.error("\nERROR: No response received from prompt (you didn't answer, or something broke).")
      console.error("Exiting for safety (because we can't proceed without your input).")
      process.exit(1)
    }

    return response.confirmed === true
  } catch (error) {
    console.error("\nERROR: Prompt failed (because nothing ever works smoothly):", error)
    console.error("Exiting for safety (because we're paranoid like that).")
    process.exit(1)
  }
}

async function loadCache(currentConfigHash: string): Promise<CacheFile> {
  try {
    const content = await readFile(CACHE_FILE, "utf-8")
    const parsed = cacheFileSchema.parse(JSON.parse(content))
    if (parsed.version !== CACHE_VERSION) {
      console.warn(`Oh look, your cache is from a different era. Starting fresh because I'm not a time traveler.`)
      return { version: CACHE_VERSION, eslintConfigHash: currentConfigHash, approvedWarnings: [] }
    }
    if (!parsed.eslintConfigHash) {
      parsed.eslintConfigHash = currentConfigHash
    }
    return { ...parsed, eslintConfigHash: parsed.eslintConfigHash }
  } catch (error) {
    if (error instanceof Error && "code" in error && typeof error.code === "string") {
      if (error.code === "ENOENT") {
        return {
          version: CACHE_VERSION,
          eslintConfigHash: currentConfigHash,
          approvedWarnings: []
        }
      }
    }
    console.warn(
      `Couldn't read your cache file (probably because it doesn't exist or you deleted it, genius). Starting fresh.`
    )
    return { version: CACHE_VERSION, eslintConfigHash: currentConfigHash, approvedWarnings: [] }
  }
}

async function saveCache(cache: CacheFile): Promise<void> {
  const tempFile = `${CACHE_FILE}.tmp`
  try {
    await writeFile(tempFile, JSON.stringify(cache, null, 2) + "\n", "utf-8")
    await rename(tempFile, CACHE_FILE)
  } catch (error) {
    try {
      const fs = await import("fs/promises")
      try {
        await fs.unlink(tempFile)
      } catch {
        // Ignore unlink errors
      }
    } catch {
      // Ignore import errors
    }
    throw new Error(
      `Failed to save cache file (probably a permissions issue, or your disk is full, or the universe hates you): ${error}`
    )
  }
}

function getRuleInstruction(ruleId: string): string {
  switch (ruleId) {
    // TypeScript ESLint Rules
    case "@typescript-eslint/ban-ts-comment":
      return "DO NOT FIX THIS MESS BY ADDING A STUPID COMMENT. DO NOT USE ANOTHER TS HACK LIKE 'as', 'any', 'unknown',... FIX THE DAMN TS ERROR WITHOUT HACKS OR YOURE FIRED"
    case "@typescript-eslint/no-unused-vars":
      return "CHECK if the variable is actually unused before deleting. Look for exports, future use cases, or side effects. DO NOT delete without verification. Examine the entire codebase context, not just the immediate scope."
    case "@typescript-eslint/consistent-type-assertions":
      return "NEVER use 'as' type assertions. Think HARD about why this was needed. Can you use Zod for runtime validation? Can you improve the source type definition? IGNORING THE ERROR IS NOT A FIX. Find a proper solution or ask the user for clarification. Stop taking shortcuts."
    case "@typescript-eslint/no-explicit-any":
      return "REPLACE 'any' with proper types. Use generics, union types, or 'unknown' with type guards. DO NOT use 'any' as a crutch. Type your code properly."
    case "@typescript-eslint/no-non-null-assertion":
      return "REMOVE the '!' operator. Handle null/undefined properly with guards, optional chaining, or proper type narrowing. DO NOT assert non-null without verification."
    case "@typescript-eslint/no-require-imports":
      return "CONVERT require() to ES module import statements. Use import/export syntax. DO NOT use CommonJS require() in ES modules."
    case "@typescript-eslint/no-dynamic-delete":
      return "REPLACE dynamic property deletion with proper object manipulation. Use object destructuring, Object.assign, or create new objects. DO NOT use delete operator on dynamic keys."

    // Promise Plugin Rules
    case "promise/always-return":
      return "ENSURE every promise chain branch returns a value. Check ALL branches, including error handlers. DO NOT leave promise chains without return values."
    case "promise/catch-or-return":
      return "HANDLE all promise rejections. Add .catch() handlers or return the promise. DO NOT leave promises unhandled. Every promise must have error handling."
    case "promise/param-names":
      return "USE Error objects for promise rejections, not strings. Create proper Error instances with meaningful messages. DO NOT reject with string values."
    case "promise/no-return-wrap":
      return "REMOVE unnecessary Promise.resolve/reject wrappers. Return the value directly. DO NOT wrap values that are already promises or values."
    case "promise/prefer-await-to-then":
      return "CONVERT .then() chains to async/await syntax. Use async functions and await keywords. DO NOT use promise chains when async/await is available."

    // ESLint Comments Rules
    case "eslint-comments/require-description":
      return "FIX the actual problem instead of disabling the rule. If you MUST disable (and you better have a good reason), ADD a clear description explaining why. DO NOT disable rules without justification."
    case "eslint-comments/disable-enable-pair":
      return "PAIR your eslint-disable with a matching eslint-enable. Ensure every disable has a corresponding enable. DO NOT leave rules disabled indefinitely."
    case "eslint-comments/no-unused-disable":
      return "REMOVE the unused eslint-disable comment. It's not suppressing anything. DO NOT keep unnecessary disable comments."
    case "eslint-comments/no-unused-enable":
      return "REMOVE the unnecessary eslint-enable comment. The rule was never disabled. DO NOT enable rules that aren't disabled."

    case "no-var":
      return "REPLACE 'var' with 'let' or 'const'. Use modern variable declarations. DO NOT use 'var' - it's deprecated and causes scope issues."

    // Default for unknown rules
    default:
      return "FIX these errors in a proper way. Look up the rule documentation and fix it correctly. DO NOT ignore it. DO NOT take shortcuts. If the next try fails, you will be in big trouble."
  }
}

function runESLint(): ESLintFileResult[] {
  const result = spawnSync(ESLINT_CMD, [], {
    encoding: "utf-8",
    cwd: process.cwd(),
    stdio: ["inherit", "pipe", "pipe"],
    shell: true
  })

  if (result.stdout && result.stdout.trim()) {
    try {
      const parsed = z.array(eslintFileResultSchema).parse(JSON.parse(result.stdout))
      return parsed
    } catch (parseError) {
      console.error("Well, this is awkward. ESLint ran but gave us garbage instead of JSON:")
      if (parseError instanceof z.ZodError) {
        console.error(
          "Zod validation error (because apparently ESLint's output doesn't match what we expected):",
          parseError.issues
        )
      } else {
        console.error("JSON parse error (because parsing is hard, apparently):", parseError)
      }
      console.error("Raw output (first 500 chars, because that's all we care about):", result.stdout.substring(0, 500))
      if (result.stderr) {
        console.error("Stderr (where ESLint probably complained about your code):", result.stderr)
      }
      process.exit(1)
    }
  }

  console.error("ESLint ran but said... nothing. Absolutely nothing. How helpful.")
  if (result.stderr) {
    console.error("Stderr (maybe there's a clue here?):", result.stderr)
  }
  if (result.error) {
    console.error("Error (the actual problem, probably):", result.error)
  }
  process.exit(1)
}

async function processWarnings(): Promise<void> {
  const currentConfigHash = await detectAndHashEslintConfig()
  const cache = await loadCache(currentConfigHash)

  if (cache.eslintConfigHash !== currentConfigHash) {
    const confirmed = await confirmEslintConfigChange(cache.eslintConfigHash, currentConfigHash)
    if (!confirmed) {
      console.log(kleur.red("\n❌ You chickened out. Fine, we're done here. Exiting."))
      process.exit(1)
    }
    console.log(kleur.green("\n✓ Bold choice! Let's see if this new config bites us in the ass. Proceeding...\n"))
    cache.eslintConfigHash = currentConfigHash
  }

  console.log(
    kleur.blue(
      "Running ESLint on your entire project (this might take a while, or it might not, depends on how much code you've written)..."
    )
  )
  const eslintResults = runESLint()

  const warnings: Array<{
    fingerprint: WarningFingerprint
    filePath: string
    line: number
    column: number
    ruleId: string
    message: string
    codeSnippet: string
    codeContext: string[]
  }> = []

  for (const result of eslintResults) {
    for (const msg of result.messages) {
      // Process both warnings (severity 1) and errors (severity 2)
      if (msg.severity === 1 || msg.severity === 2) {
        const lineContent = msg.source || (await readSourceLine(result.filePath, msg.line))
        const sourceContext = await readSourceContext(result.filePath, msg.line, 3)
        const fingerprint = createFingerprint(result.filePath, msg.ruleId, msg.message, lineContent)

        warnings.push({
          fingerprint,
          filePath: result.filePath,
          line: msg.line,
          column: msg.column,
          ruleId: msg.ruleId || "unknown",
          message: msg.message,
          codeSnippet: lineContent.trim(),
          codeContext: sourceContext.context
        })
      }
    }
  }

  if (warnings.length === 0) {
    console.log(
      kleur.green(
        "✓ No ESLint warnings or errors found. Either your code is perfect (unlikely) or your config is too lenient (probably)."
      )
    )
    await saveCache(cache)
    return
  }

  console.log(
    `Found ${kleur.yellow().bold(warnings.length.toString())} ${kleur.yellow("issue(s)")} (warnings and errors, because of course you did). Checking against cache to see which ones are new...`
  )

  const newWarnings = warnings.filter(
    (w) => !cache.approvedWarnings.some((approved: WarningFingerprint) => fingerprintMatches(approved, w.fingerprint))
  )

  if (newWarnings.length === 0) {
    console.log(kleur.green("✓ All issues are already approved (you've seen them all before, how exciting)."))
    return
  }

  console.log(
    `\nFound ${kleur.cyan().bold(newWarnings.length.toString())} ${kleur.yellow("new issue(s)")} (warnings and errors) that need your attention (because apparently you can't write perfect code on the first try):\n`
  )

  const rejectedWarnings: Array<{
    file: string
    line: number
    column: number
    ruleId: string
    message: string
    codeSnippet: string
    codeContext: string[]
  }> = []

  for (let i = 0; i < newWarnings.length; i++) {
    const warning = newWarnings[i]
    const isError = eslintResults.some(
      (r) =>
        r.filePath === warning.filePath &&
        r.messages.some((m) => m.line === warning.line && m.column === warning.column && m.severity === 2)
    )
    const issueType = isError ? kleur.red().bold("Error") : kleur.yellow().bold("Warning")
    console.log(`\n[${kleur.cyan().bold(`${i + 1}/${newWarnings.length}`)}] ${issueType}:`)
    console.log(
      `  ${kleur.dim("File")}: ${kleur.cyan(warning.fingerprint.file)}:${kleur.cyan().bold(warning.line.toString())}:${kleur.cyan().bold(warning.column.toString())}`
    )
    console.log(`  ${kleur.dim("Rule")}: ${kleur.magenta(warning.ruleId)}`)
    console.log(`  ${kleur.dim("Message")}: ${kleur.white(warning.message)}`)

    if (warning.codeContext && warning.codeContext.length > 0) {
      const contextStartLine = Math.max(1, warning.line - 3)
      console.log(`  ${kleur.dim("Code context")}:`)
      warning.codeContext.forEach((contextLine, idx) => {
        const lineNum = contextStartLine + idx
        const isWarningLine = lineNum === warning.line
        const marker = isWarningLine ? kleur.red().bold(">>>") : kleur.dim("   ")
        const lineNumColor = isWarningLine ? kleur.red().bold : kleur.dim
        const codeColor = isWarningLine ? kleur.red : kleur.gray
        console.log(
          `  ${marker} ${lineNumColor(lineNum.toString().padStart(4, " "))} ${kleur.dim("|")} ${codeColor(contextLine)}`
        )
      })
    } else if (warning.codeSnippet) {
      console.log(`  ${kleur.dim("Code")}: ${kleur.gray(warning.codeSnippet)}`)
    } else {
      console.log(`  ${kleur.dim("Code")}: ${kleur.dim("(no code available)")}`)
    }

    if (process.stdin.isPaused()) {
      process.stdin.resume()
    }

    if (!process.stdin.isTTY) {
      console.error("\nERROR: stdin is not a TTY (running in CI? Good luck with that). Cannot prompt for approval.")
      console.error("This script requires an interactive terminal (because we need your input, obviously).")
      process.exit(1)
    }

    let response: { action?: string } | undefined

    try {
      response = await prompts(
        {
          type: "select",
          name: "action",
          message: "What's your move, hotshot? (Pick something or this script will die)",
          choices: [
            { title: "✓ Approve (pretend this warning doesn't matter)", value: "approve" },
            { title: "✗ Reject (actually fix your code like a professional)", value: "reject" },
            { title: "→ Skip (procrastinate like a champion)", value: "skip" }
          ],
          stdin: process.stdin,
          stdout: process.stdout
        },
        {
          onCancel: () => {
            console.log("\nYou cancelled. Commit aborted because you're indecisive.")
            process.exit(1)
          }
        }
      )
    } catch (error) {
      console.error("\nERROR: Prompt failed (because nothing ever works, right?):", error)
      console.error(
        "This likely means stdin is not properly connected (or you're running this in a weird environment)."
      )
      console.error("Commit aborted because we can't read your mind.")
      process.exit(1)
    }

    if (!response || typeof response !== "object" || !("action" in response)) {
      console.error("\nERROR: No response received from prompt (you didn't answer, or something broke).")
      console.error("Response received (probably nothing useful):", JSON.stringify(response))
      console.error(
        "This likely means stdin is not properly connected or not interactive (or you're running this in CI, genius)."
      )
      console.error("Please ensure your git hook runs in an interactive terminal,")
      console.error("or run 'npm run lint:check-warnings' manually before committing (like a civilized human).")
      console.error("\nNew warnings found (that you'll have to deal with eventually):")
      for (const warning of newWarnings.slice(i)) {
        console.error(
          `  - ${warning.fingerprint.file}:${warning.line}:${warning.column} - ${warning.ruleId}: ${warning.message}`
        )
      }
      process.exit(1)
    }

    const action = response.action

    if (typeof action !== "string" || action.length === 0) {
      console.error(`\nERROR: Invalid or empty action received (you broke it somehow): ${JSON.stringify(action)}`)
      console.error("Response object (for debugging, because you'll need it):", JSON.stringify(response))
      console.error(
        "This likely means prompts didn't wait for user input (or you're trying to automate this, which won't work)."
      )
      console.error("Commit aborted because we don't trust invalid input.")
      process.exit(1)
    }

    if (!["approve", "reject", "skip"].includes(action)) {
      console.error(`\nERROR: Invalid action value (you picked something that doesn't exist): ${action}`)
      console.error("Expected one of: approve, reject, skip (it's not that hard, really)")
      console.error("Commit aborted because we're not mind readers.")
      process.exit(1)
    }

    if (action === "approve") {
      cache.approvedWarnings.push(warning.fingerprint)
      await saveCache(cache)
      console.log(kleur.green("  ✓ Approved (you've officially given up on fixing this one) and saved to cache"))
    } else if (action === "reject") {
      rejectedWarnings.push({
        file: warning.fingerprint.file,
        line: warning.line,
        column: warning.column,
        ruleId: warning.ruleId,
        message: warning.message,
        codeSnippet: warning.codeSnippet,
        codeContext: warning.codeContext
      })
      console.log(kleur.red("  ✗ Rejected (good choice, now fix it. We'll show all your failures at the end.)"))
    } else if (action === "skip") {
      console.log(kleur.yellow("  → Skipped (procrastination level: expert)"))
    } else {
      console.log(kleur.red("\nUnknown action (how did you even get here?). Commit aborted."))
      process.exit(1)
    }
  }

  if (rejectedWarnings.length > 0) {
    console.log(`\n\n${kleur.red().bold("=".repeat(80))}`)
    console.log(
      kleur
        .red()
        .bold(
          `❌ COMMIT ABORTED: ${kleur.yellow().bold(rejectedWarnings.length.toString())} ${kleur.yellow("issue(s)")} (warnings and errors) were rejected (because you said so)`
        )
    )
    console.log(kleur.red().bold("=".repeat(80)) + "\n")

    console.log(
      kleur
        .yellow()
        .bold(
          "Here are the ESLint issues (warnings and errors) that need to be fixed (you know, the ones you rejected):\n"
        )
    )

    // Group warnings by ruleId
    const warningsByRule = new Map<string, typeof rejectedWarnings>()
    for (const w of rejectedWarnings) {
      const ruleId = w.ruleId || "unknown"
      if (!warningsByRule.has(ruleId)) {
        warningsByRule.set(ruleId, [])
      }
      const warningsArray = warningsByRule.get(ruleId)
      if (warningsArray) {
        warningsArray.push(w)
      }
    }

    // Display grouped warnings
    let displayIndex = 1
    for (const [ruleId, warnings] of warningsByRule.entries()) {
      const instruction = getRuleInstruction(ruleId)

      console.log(`${kleur.cyan().bold(`${displayIndex}.`)} ${kleur.magenta().bold(`Rule: ${ruleId}`)}`)
      console.log(`   ${kleur.dim("AI Instruction")}: ${kleur.yellow(instruction)}`)
      console.log(`   ${kleur.dim("Locations")}:`)
      warnings.forEach((w, idx) => {
        console.log(
          `      ${idx + 1}. ${kleur.cyan(w.file)}:${kleur.cyan().bold(w.line.toString())}:${kleur.cyan().bold(w.column.toString())}`
        )
      })
      console.log("")

      displayIndex++
    }

    console.log(`${kleur.yellow().bold("=".repeat(80))}`)
    console.log(kleur.yellow().bold("AI Fix Request"))
    console.log(kleur.yellow().bold("=".repeat(80)) + "\n")

    // Generate structured prompt for AI
    const promptSections: string[] = []

    // Header with clear task description
    promptSections.push(
      kleur.yellow().bold("TASK: Fix all ESLint issues listed below.\n"),
      kleur.yellow().bold("REQUIREMENTS:"),
      kleur.yellow("  ✓ Fix ALL issues completely and correctly"),
      kleur.yellow("  ✓ NO shortcuts, NO hacks, NO workarounds"),
      kleur.yellow("  ✓ NO eslint-disable comments unless absolutely necessary"),
      kleur.yellow("  ✓ Understand the root cause before fixing"),
      kleur.yellow("  ✓ Verify fixes don't break existing functionality"),
      kleur.yellow("  ✓ Consider edge cases and error handling"),
      kleur.yellow("  ✓ Follow TypeScript and JavaScript best practices\n")
    )

    // Generate structured issue list
    let aiIndex = 1
    const totalIssues = warningsByRule.size
    for (const [ruleId, warnings] of warningsByRule.entries()) {
      const instruction = getRuleInstruction(ruleId)
      const locationsList = warnings.map((w, idx) => `      ${idx + 1}. ${w.file}:${w.line}:${w.column}`).join("\n")

      promptSections.push(
        kleur.yellow().bold(`[${aiIndex}/${totalIssues}] ${ruleId}`),
        kleur.yellow(`  Rule ID: ${ruleId}`),
        kleur.yellow(`  Fix Instruction: ${instruction}`),
        kleur.yellow(`  Total Occurrences: ${warnings.length}`),
        kleur.yellow(`  File Locations:`),
        kleur.yellow(locationsList),
        ""
      )
      aiIndex++
    }

    // Footer with expectations
    promptSections.push(
      kleur.yellow().bold("EXPECTED OUTPUT:"),
      kleur.yellow("  ✓ All issues fixed with proper, production-ready solutions"),
      kleur.yellow("  ✓ Code follows TypeScript/JavaScript best practices"),
      kleur.yellow("  ✓ No new ESLint issues introduced"),
      kleur.yellow("  ✓ All changes are minimal, focused, and well-reasoned"),
      kleur.yellow("  ✓ Code is maintainable and follows project conventions\n")
    )

    console.log(promptSections.join("\n"))
    console.log(`\n${kleur.red().bold("=".repeat(80))}\n`)

    process.exit(1)
  }

  const currentWarningFingerprints = new Set(warnings.map((w) => JSON.stringify(w.fingerprint)))
  const originalCacheSize = cache.approvedWarnings.length
  cache.approvedWarnings = cache.approvedWarnings.filter((approved: WarningFingerprint) => {
    const approvedKey = JSON.stringify(approved)
    return currentWarningFingerprints.has(approvedKey)
  })
  const fixedCount = originalCacheSize - cache.approvedWarnings.length

  await saveCache(cache)

  if (fixedCount > 0) {
    console.log(`\n${"=".repeat(80)}`)
    console.log(`🎉 SUCCESS! ${fixedCount} warning(s) have been fixed! (Finally, some progress!)`)
    console.log(`${"=".repeat(80)}`)
    console.log(
      `\nGreat work! ${fixedCount} previously approved warning(s) are no longer present in the codebase (you actually fixed something, impressive).`
    )
    console.log("They've been automatically removed from the cache (because we're helpful like that).\n")
  }

  if (newWarnings.length > 0) {
    const approvedCount = newWarnings.filter((w) =>
      cache.approvedWarnings.some((approved: WarningFingerprint) => fingerprintMatches(approved, w.fingerprint))
    ).length
    console.log(`\n✓ Cache updated (because we're organized like that):`)
    console.log(`  - ${approvedCount} new issue(s) approved (you gave up on fixing them)`)
    console.log(`  - ${fixedCount} issue(s) fixed and removed from cache (actual progress!)`)
    console.log(
      `  - Total approved issues in cache: ${cache.approvedWarnings.length} (the graveyard of issues you've given up on)`
    )
  } else {
    console.log(`\n✓ All issues are already approved (nothing new to deal with, how boring).`)
    if (fixedCount > 0) {
      console.log(`  - ${fixedCount} issue(s) fixed and removed from cache (at least you fixed something)`)
    }
  }
}

;(async () => {
  try {
    await processWarnings()
  } catch (error) {
    console.error("Fatal error (something went catastrophically wrong, probably your fault):", error)
    process.exit(1)
  } finally {
    if (process.stdin.setRawMode) {
      try {
        process.stdin.setRawMode(false)
      } catch {
        // Ignore errors when restoring
      }
    }
  }
})()
