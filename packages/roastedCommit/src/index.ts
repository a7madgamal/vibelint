#!/usr/bin/env node
import { spawn, spawnSync } from "node:child_process"
import { existsSync, readFileSync, unlinkSync, writeFileSync } from "node:fs"
import http from "node:http"
import { join } from "node:path"
import prompts from "prompts"
import { z } from "zod"

const OLLAMA_BASE_URL = process.env.VIBELINT_OLLAMA_URL || "http://127.0.0.1:11434"
const CONFIG_FILE = join(process.cwd(), ".commit-config.json")
const CACHE_FILE = join(process.cwd(), ".commit-message-cache.json")

const OllamaTagsSchema = z.object({
  models: z.array(
    z
      .object({
        name: z.string(),
        model: z.string()
      })
      .passthrough()
  )
})

const ConfigSchema = z.object({
  selectedModel: z.string()
})

type Config = z.infer<typeof ConfigSchema>

async function getAvailableModels(): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const req = http.get(`${OLLAMA_BASE_URL}/api/tags`, (res) => {
      let data = ""
      res.on("data", (chunk) => {
        data += chunk
      })
      res.on("end", () => {
        try {
          const parsedData = OllamaTagsSchema.safeParse(JSON.parse(data))
          if (!parsedData.success) {
            reject(new Error("Failed to parse Ollama response"))
            return
          }

          const models = parsedData.data.models
          const modelNames = models.map((model) => model.name)
          resolve(modelNames)
        } catch {
          reject(new Error("Failed to parse Ollama response"))
        }
      })
    })

    req.on("error", (error: unknown) => {
      if (error && typeof error === "object" && "code" in error) {
        if (error.code === "ECONNREFUSED") {
          reject(new Error("Ollama is not running. Please start it and try again."))
        } else {
          reject(new Error(`Unexpected error checking Ollama: ${String(error)}`))
        }
      } else {
        reject(new Error(`Unexpected error checking Ollama: ${String(error)}`))
      }
    })

    req.end()
  })
}

function loadConfig(): Config | null {
  if (!existsSync(CONFIG_FILE)) {
    return null
  }

  try {
    const content = readFileSync(CONFIG_FILE, "utf-8")
    const parsed = ConfigSchema.safeParse(JSON.parse(content))
    if (!parsed.success) {
      return null
    }
    return parsed.data
  } catch {
    return null
  }
}

function saveConfig(config: Config): void {
  writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), "utf-8")
}

async function selectModel(availableModels: string[]): Promise<string> {
  let initialIndex = 0
  const config = loadConfig()
  if (config) {
    const foundIndex = availableModels.findIndex((model) => model === config.selectedModel)
    if (foundIndex >= 0) {
      initialIndex = foundIndex
    }
  }

  const { model } = await prompts(
    {
      type: "select",
      name: "model",
      message: "Select an Ollama model:",
      choices: availableModels.map((name) => ({ title: name, value: name })),
      initial: initialIndex,
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

  if (!model || typeof model !== "string") {
    console.error("❌ No model selected.")
    process.exit(1)
  }

  // Save the selected model
  saveConfig({ selectedModel: model })

  return model
}

async function getStagedDiff(): Promise<string | null> {
  return new Promise((resolve, reject) => {
    const child = spawn("git", ["diff", "--cached", "--ignore-all-space", "--ignore-blank-lines"], {
      stdio: ["ignore", "pipe", "pipe"]
    })

    let stdout = ""
    let stderr = ""

    child.stdout.on("data", (data) => {
      stdout += data.toString()
    })

    child.stderr.on("data", (data) => {
      stderr += data.toString()
    })

    child.on("error", (error) => {
      reject(error)
    })

    child.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`git diff --cached failed with code ${code}: ${stderr}`))
        return
      }
      resolve(stdout)
    })
  })
}

function limitDiffPerFile(diff: string): string {
  const MAX_FILES = 100
  const INITIAL_PER_FILE_LINE_LIMIT = 100
  const TOTAL_CHAR_LIMIT = 50000

  // Split diff by file (each file starts with "diff --git")
  const fileSections = diff.split(/\n(?=diff --git)/)
  const limitedSections: string[] = []
  let totalChars = 0
  let fileCount = 0
  const truncatedFiles: string[] = []

  // Count original stats
  const originalChars = diff.length
  const originalLines = diff.split("\n").length
  const originalFileCount = fileSections.length

  // Calculate per-file line limit based on number of files
  // If we have many files, reduce per-file limit to fit more files
  let perFileLineLimit = INITIAL_PER_FILE_LINE_LIMIT
  if (originalFileCount > MAX_FILES) {
    // Reduce per-file limit proportionally to fit MAX_FILES
    perFileLineLimit = Math.max(20, Math.floor((INITIAL_PER_FILE_LINE_LIMIT * MAX_FILES) / originalFileCount))
  }

  for (const section of fileSections) {
    if (!section.trim()) continue

    // Stop if we've reached the file limit
    if (fileCount >= MAX_FILES) {
      break
    }

    fileCount++
    const lines = section.split("\n")
    const headerLines: string[] = []
    const contentLines: string[] = []
    let inHeader = true

    // Separate header from content
    for (const line of lines) {
      if (
        inHeader &&
        (line.startsWith("diff --git") ||
          line.startsWith("index ") ||
          line.startsWith("---") ||
          line.startsWith("+++") ||
          line.startsWith("@@") ||
          line.trim() === "")
      ) {
        headerLines.push(line)
        if (line.startsWith("@@")) {
          inHeader = false
        }
      } else {
        inHeader = false
        contentLines.push(line)
      }
    }

    // Filter out whitespace-only and context lines, keep only actual changes
    const meaningfulLines = contentLines.filter((line) => {
      const trimmed = line.trim()
      // Keep lines that show actual changes (start with + or -)
      if (trimmed.startsWith("+") || trimmed.startsWith("-")) {
        // Filter out lines that are only whitespace changes
        const withoutPrefix = trimmed.substring(1).trim()
        // Keep if there's actual content (not just whitespace)
        return withoutPrefix.length > 0
      }
      // Skip context lines (starting with space) and empty lines
      return false
    })

    // Limit content lines (reduce if file is too big)
    let limitedContent = meaningfulLines
    if (meaningfulLines.length > perFileLineLimit) {
      limitedContent = meaningfulLines.slice(0, perFileLineLimit)
      limitedContent.push(
        `... (truncated, showing first ${perFileLineLimit} of ${meaningfulLines.length} meaningful lines)`
      )
      // Extract filename from header
      const fileMatch = section.match(/diff --git a\/(.+?) b\//)
      if (fileMatch) {
        truncatedFiles.push(fileMatch[1])
      }
    }

    const limitedSection = [...headerLines, ...limitedContent].join("\n")
    const sectionChars = limitedSection.length

    // Check if adding this section would exceed total limit
    if (totalChars + sectionChars > TOTAL_CHAR_LIMIT) {
      // Try to fit at least part of this section
      const remainingChars = TOTAL_CHAR_LIMIT - totalChars
      if (remainingChars > 100) {
        // Include partial section
        const partialSection = limitedSection.substring(0, remainingChars - 50)
        limitedSections.push(partialSection + "\n... (diff truncated, total limit reached)")
        totalChars = TOTAL_CHAR_LIMIT
      }
      break
    }

    limitedSections.push(limitedSection)
    totalChars += sectionChars
  }

  const result = limitedSections.join("\n")
  const finalChars = result.length
  const finalLines = result.split("\n").length

  // Log stats
  console.log(`📊 Diff stats: ${originalFileCount} files, ${originalLines} lines, ${originalChars} chars`)
  if (truncatedFiles.length > 0) {
    console.log(`   Files truncated (per-file limit): ${truncatedFiles.join(", ")}`)
  }
  if (finalChars < originalChars) {
    console.log(`   → Limited to: ${fileCount} files, ${finalLines} lines, ${finalChars} chars`)
  } else {
    console.log(`   → Final: ${fileCount} files, ${finalLines} lines, ${finalChars} chars`)
  }

  return result
}

async function generateCommitMessage(diff: string, model: string): Promise<string> {
  console.log(`🤖 Generating commit message using ${model}...`)
  console.log("📝 Commit message: ")

  const body = {
    model,
    stream: true,
    prompt: `Write a git commit message. First line is a short title. Then add details. End with a sarcastic, roasting-style, witty, funny joke about the changes. No markdown, no formatting, just plain text.

${diff}`
  }

  const response = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
    method: "POST",
    body: JSON.stringify(body)
  })

  if (!response.ok) {
    throw new Error(`Failed to generate commit message: ${response.statusText}`)
  }

  if (!response.body) {
    throw new Error("No response body from Ollama")
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder("utf-8")
  let fullResponse = ""
  let buffer = ""

  try {
    while (true) {
      const { value, done } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split("\n")
      buffer = lines.pop() || ""

      for (const line of lines) {
        if (line.trim() === "") continue

        try {
          const json = JSON.parse(line)
          if (json.response) {
            process.stdout.write(json.response)
            fullResponse += json.response
          }
        } catch {
          // Skip invalid JSON lines
        }
      }
    }

    // Process remaining buffer
    if (buffer.trim()) {
      try {
        const json = JSON.parse(buffer)
        if (json.response) {
          process.stdout.write(json.response)
          fullResponse += json.response
        }
      } catch {
        // Skip invalid JSON
      }
    }

    console.log() // New line after streaming
  } finally {
    reader.releaseLock()
  }

  const result = fullResponse.trim()
  if (!result) {
    throw new Error("Empty response from Ollama")
  }

  return result
}

function saveCachedMessage(message: string): void {
  writeFileSync(CACHE_FILE, JSON.stringify({ message, timestamp: Date.now() }, null, 2), "utf-8")
}

function loadCachedMessage(): string | null {
  if (!existsSync(CACHE_FILE)) {
    return null
  }
  try {
    const content = readFileSync(CACHE_FILE, "utf-8")
    const parsed = JSON.parse(content)
    if (parsed.message && typeof parsed.message === "string") {
      return parsed.message
    }
  } catch {
    // Invalid cache file, ignore
  }
  return null
}

function clearCachedMessage(): void {
  if (existsSync(CACHE_FILE)) {
    unlinkSync(CACHE_FILE)
  }
}

async function commitChanges(message: string, noVerify = false): Promise<void> {
  // Split message into lines - first line is the title
  const lines = message
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
  if (lines.length === 0) {
    throw new Error("Empty commit message")
  }

  const title = lines[0]
  const body = lines.slice(1)

  // Use first line as title, rest as body
  const args = ["commit"]
  if (noVerify) {
    args.push("--no-verify")
  }
  args.push("-m", title)
  for (const line of body) {
    args.push("-m", line)
  }

  const result = spawnSync("git", args, {
    stdio: "inherit"
  })
  if (result.error) {
    throw result.error
  }
  if (result.status !== 0) {
    throw new Error(`Git commit failed with status ${result.status}`)
  }
}

async function main() {
  // Ensure stdin is ready
  if (process.stdin.isPaused()) {
    process.stdin.resume()
  }

  if (!process.stdin.isTTY) {
    console.error("\nERROR: stdin is not a TTY. Cannot prompt for confirmation.")
    console.error("This script requires an interactive terminal.")
    process.exit(1)
  }

  // Check for cached message from previous failed commit
  const cachedMessage = loadCachedMessage()
  if (cachedMessage) {
    console.log("💾 Found cached commit message from previous run.")
    console.log("\n" + cachedMessage + "\n")
    const { action } = await prompts(
      {
        type: "select",
        name: "action",
        message: "What would you like to do?",
        choices: [
          { title: "Rerun (generate new message)", value: "rerun" },
          { title: "Use cached message (normal)", value: "use-cached" },
          { title: "Use cached message with --no-verify", value: "no-verify" }
        ],
        initial: 0,
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

    if (!action) {
      // User cancelled
      clearCachedMessage()
      process.exit(0)
    }

    if (action === "no-verify") {
      try {
        await commitChanges(cachedMessage, true)
        clearCachedMessage()
        console.log("✅ Changes committed with cached message (--no-verify).")
        return
      } catch (error: unknown) {
        console.error(`❌ Commit failed: ${error instanceof Error ? error.message : String(error)}`)
        process.exit(1)
      }
    } else if (action === "use-cached") {
      try {
        await commitChanges(cachedMessage, false)
        clearCachedMessage()
        console.log("✅ Changes committed with cached message.")
        return
      } catch (error: unknown) {
        // Keep cached message for retry
        console.error(`❌ Commit failed: ${error instanceof Error ? error.message : String(error)}`)
        console.log("💾 Message saved to cache. Run the command again to retry with --no-verify.")
        throw error
      }
    } else {
      // action === "rerun" - clear cache and continue with normal flow
      clearCachedMessage()
    }
  }

  // Get available models and check if Ollama is running
  let availableModels: string[]
  try {
    availableModels = await getAvailableModels()
    if (availableModels.length === 0) {
      console.error(
        "❌ No Ollama models found. Please install at least one model (e.g., `ollama pull mistral-openorca`)."
      )
      process.exit(1)
    }
  } catch (error: unknown) {
    console.error(`❌ ${error instanceof Error ? error.message : "Failed to connect to Ollama"}`)
    process.exit(1)
  }

  // Select model (will preselect previously chosen one if available)
  // Fast mode: if config exists, use it without prompting
  let selectedModel: string
  const config = loadConfig()
  if (config) {
    const foundModel = availableModels.find((model) => model === config.selectedModel)
    if (foundModel) {
      selectedModel = foundModel
      console.log(`⚡ Using saved model "${selectedModel}"`)
    } else {
      selectedModel = await selectModel(availableModels)
    }
  } else {
    selectedModel = await selectModel(availableModels)
  }

  // Get staged diff
  const rawDiff = await getStagedDiff()
  if (!rawDiff || rawDiff.trim().length === 0) {
    throw new Error("No staged changes to commit")
  }

  // Limit diff per file and apply total limit
  const diff = limitDiffPerFile(rawDiff)

  // Generate commit message based on limited diff
  const commitMessage = await generateCommitMessage(diff, selectedModel)

  // Save message to cache
  saveCachedMessage(commitMessage)

  const { confirm } = await prompts(
    {
      type: "confirm",
      name: "confirm",
      message: "Looks good?",
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

  if (confirm) {
    try {
      await commitChanges(commitMessage, false)
      clearCachedMessage()
      console.log("✅ Changes committed.")
    } catch (error: unknown) {
      // Keep cached message for retry
      console.error(`❌ Commit failed: ${error instanceof Error ? error.message : String(error)}`)
      console.log("💾 Message saved to cache. Run the command again to retry with --no-verify.")
      throw error
    }
  } else {
    clearCachedMessage()
    console.log("🙅 Commit aborted.")
  }
}

main().catch((error: unknown) => {
  console.error("❌ An unexpected error occurred:", error)
  process.exit(1)
})
