# VibeLint

Developer tools for code quality and commit workflows.

## Packages

- `@vibelint/eslint-plugin-suppress-approved` - Suppress approved ESLint warnings
- `@vibelint/roastedCommit` - AI commit messages via Ollama
- `@vibelint/eslint-warning-approval` - Interactive warning approval
- `lintmyvibe` - Setup CLI

## Quick Start

```bash
npx lintmyvibe
```

## Installation

```bash
npm install -D @vibelint/roastedCommit @vibelint/eslint-warning-approval @vibelint/eslint-plugin-suppress-approved
```

Add to `package.json`:

```json
{
  "scripts": {
    "commit": "vibelint-roasted-commit",
    "commit-lint": "vibelint-eslint-warning-approval"
  }
}
```

## Usage

```bash
npm run commit          # Generate commit message (requires Ollama)
npm run commit-lint     # Approve/reject ESLint warnings
```

**Env vars:**

- `VIBELINT_OLLAMA_URL` - Ollama URL (default: `http://127.0.0.1:11434`)
- `VIBELINT_ESLINT_CMD` - ESLint command (default: `npx eslint . --ext ts,tsx,js,jsx --format json --max-warnings 999999`)

## Publishing

```bash
pnpm build              # Build all packages
pnpm version:patch      # Bump versions
pnpm publish:check      # Dry run
pnpm publish:all        # Publish all
```

**Individual packages:**

```bash
pnpm publish:plugin     # ESLint plugin
pnpm publish:commit     # Commit tool
pnpm publish:approval   # Warning approval
pnpm publish:setup      # Setup CLI
```

## License

MIT
