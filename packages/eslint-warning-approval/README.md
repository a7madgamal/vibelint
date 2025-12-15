# @vibelint/eslint-warning-approval

Interactive ESLint warning approval tool.

## Install

```bash
npm install -D @vibelint/eslint-warning-approval
```

## Usage

```json
{
  "scripts": {
    "commit-lint": "vibelint-eslint-warning-approval"
  }
}
```

```bash
npm run commit-lint
```

## Config

- `VIBELINT_ESLINT_CMD` - ESLint command (default: `npx eslint . --ext ts,tsx,js,jsx --format json --max-warnings 999999`)

## Git Hook

```bash
# .husky/pre-commit
npm run commit-lint || exit 1
```

**Note:** `.eslint-warnings-cache.json` must be committed to git.
