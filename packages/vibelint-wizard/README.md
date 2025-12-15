# @vibelint/vibelint-wizard

Interactive ESLint warning approval tool.

## Install

```bash
npm install -D @vibelint/vibelint-wizard
```

## Usage

```json
{
  "scripts": {
    "commit-wizard": "vibelint-wizard"
  }
}
```

```bash
npm run commit-wizard
```

## Config

- `VIBELINT_ESLINT_CMD` - ESLint command (default: `npx eslint . --ext ts,tsx,js,jsx --format json --max-warnings 999999`)

## Git Hook

```bash
# .husky/pre-commit
npm run commit-wizard || exit 1
```

**Note:** `.eslint-warnings-cache.json` must be committed to git.
