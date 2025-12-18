import { createHash } from "crypto"
import { existsSync, readFileSync } from "fs"
import { join, relative } from "path"

const CACHE_FILE = join(process.cwd(), ".eslint-warnings-cache.json")

interface WarningFingerprint {
  file: string
  ruleId: string
  codeHash: string
  message: string
}

interface CacheFile {
  approvedWarnings: WarningFingerprint[]
}

function computeCodeHash(lineContent: string): string {
  const trimmed = lineContent.trim()
  return createHash("sha256").update(trimmed).digest("hex")
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

function loadCache(): CacheFile {
  try {
    if (!existsSync(CACHE_FILE)) {
      return { approvedWarnings: [] }
    }
    const content = readFileSync(CACHE_FILE, "utf-8")
    const parsed = JSON.parse(content)
    const warnings = parsed.approvedWarnings || []
    return {
      approvedWarnings: warnings
    }
  } catch {
    return { approvedWarnings: [] }
  }
}

function readSourceLine(filePath: string, lineNumber: number): string {
  try {
    const content = readFileSync(filePath, "utf-8")
    const lines = content.split("\n")
    if (lineNumber > 0 && lineNumber <= lines.length) {
      return lines[lineNumber - 1]
    }
    return ""
  } catch {
    return ""
  }
}

function filterApprovedMessages(
  messages: Array<{
    ruleId?: string | null
    severity?: number
    message?: string
    line?: number
    source?: string
  }>,
  filename: string
): Array<{
  ruleId?: string | null
  severity?: number
  message?: string
  line?: number
  source?: string
}> {
  const cache = loadCache()

  if (cache.approvedWarnings.length === 0) {
    return messages
  }

  if (!filename || !messages || messages.length === 0) {
    return messages
  }

  const filtered = messages.filter((message) => {
    // Filter both warnings (severity 1) and errors (severity 2)
    if (!message || (message.severity !== 1 && message.severity !== 2)) {
      return true
    }

    try {
      const lineContent = message.source || readSourceLine(filename, message.line || 0)
      const fingerprint = createFingerprint(filename, message.ruleId || null, message.message || "", lineContent)

      // Check if this warning or error is approved
      const isApproved = cache.approvedWarnings.some((approved) => fingerprintMatches(approved, fingerprint))

      // Return false to suppress approved warnings and errors
      return !isApproved
    } catch {
      // If there's an error filtering, keep the message
      return true
    }
  })

  return filtered
}

// ESLint 9 flat config plugin
const vibelintPlugin: {
  meta: { name: string; version: string }
  processors: Record<string, unknown>
  configs?: Record<string, unknown[]>
} = {
  meta: {
    name: "@vibelint/eslint-plugin-vibelint",
    version: "0.1.0"
  },
  processors: {
    js: {
      postprocess(
        messages: Array<
          Array<{
            ruleId?: string | null
            severity?: number
            message?: string
            line?: number
            source?: string
          }>
        >,
        filename?: string
      ) {
        if (!messages) return []
        // Flatten if messages is an array of arrays
        const flatMessages = messages.flat()
        return filterApprovedMessages(flatMessages, filename || "")
      },
      supportsAutofix: false
    },
    ts: {
      postprocess(
        messages: Array<
          Array<{
            ruleId?: string | null
            severity?: number
            message?: string
            line?: number
            source?: string
          }>
        >,
        filename?: string
      ) {
        if (!messages) return []
        // Flatten if messages is an array of arrays
        const flatMessages = messages.flat()
        return filterApprovedMessages(flatMessages, filename || "")
      },
      supportsAutofix: false
    },
    tsx: {
      postprocess(
        messages: Array<
          Array<{
            ruleId?: string | null
            severity?: number
            message?: string
            line?: number
            source?: string
          }>
        >,
        filename?: string
      ) {
        if (!messages) return []
        // Flatten if messages is an array of arrays
        const flatMessages = messages.flat()
        return filterApprovedMessages(flatMessages, filename || "")
      },
      supportsAutofix: false
    },
    jsx: {
      postprocess(
        messages: Array<
          Array<{
            ruleId?: string | null
            severity?: number
            message?: string
            line?: number
            source?: string
          }>
        >,
        filename?: string
      ) {
        if (!messages) return []
        // Flatten if messages is an array of arrays
        const flatMessages = messages.flat()
        return filterApprovedMessages(flatMessages, filename || "")
      },
      supportsAutofix: false
    }
  }
}

// Add configs after the plugin is defined to avoid circular reference
vibelintPlugin.configs = {
  recommended: [
    {
      files: ["**/*.js"],
      plugins: {
        "suppress-approved": vibelintPlugin
      },
      processor: "suppress-approved/js"
    },
    {
      files: ["**/*.ts"],
      plugins: {
        "suppress-approved": vibelintPlugin
      },
      processor: "suppress-approved/ts"
    },
    {
      files: ["**/*.jsx"],
      plugins: {
        "suppress-approved": vibelintPlugin
      },
      processor: "suppress-approved/jsx"
    },
    {
      files: ["**/*.tsx"],
      plugins: {
        "suppress-approved": vibelintPlugin
      },
      processor: "suppress-approved/tsx"
    }
  ]
}

export default vibelintPlugin
