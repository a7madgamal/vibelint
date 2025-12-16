# VibeLint

Developer tools for code quality and commit workflows, because apparently writing good code and commit messages is too much to ask.

## Packages

- `@vibelint/eslint-plugin-vibelint` - Suppress approved ESLint warnings after you've given up on fixing them
- `@vibelint/vibelint-commit` - AI commit messages via Ollama, because your commit messages are garbage
- `@vibelint/vibelint-wizard` - Interactive warning approval where you decide which warnings to ignore forever
- `lintmyvibe` - Setup CLI for when manual setup is too hard

## Quick Start

```bash
npx lintmyvibe
```

## Installation

```bash
npm install -D @vibelint/vibelint-commit @vibelint/vibelint-wizard @vibelint/eslint-plugin-vibelint
```

Add to `package.json`:

```json
{
  "scripts": {
    "commit": "vibelint-commit",
    "commit-wizard": "vibelint-wizard"
  }
}
```

## Usage

```bash
npm run commit          # Generate commit message, requires Ollama which you probably don't have running
npm run commit-wizard   # Approve/reject ESLint warnings, or just approve them all like a coward
```

**Env vars:**

- `VIBELINT_OLLAMA_URL` - Ollama URL, defaults to `http://127.0.0.1:11434` which is probably wrong
- `VIBELINT_ESLINT_CMD` - ESLint command, defaults to allowing infinite warnings like idiots

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
