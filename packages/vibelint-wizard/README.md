# @vibelint/vibelint-wizard

Interactive ESLint warning approval tool for when manually fixing warnings is too much work.

This tool walks you through all your ESLint warnings and lets you decide: approve them to pretend they don't exist, reject them to actually fix your code, or skip them to procrastinate like a champion.

## Install

```bash
npm install -D @vibelint/vibelint-wizard
```

Or use `lintmyvibe` if you're too lazy to do it manually.

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

This will:

1. Run ESLint on your entire project, which might take a while or might not, depending on how much code you've written
2. Show you all the warnings you haven't approved yet
3. Let you approve, reject, or skip each one
4. Abort the commit if you reject any, because we're not letting you commit broken code

## Config

- `VIBELINT_ESLINT_CMD` - ESLint command, defaults to allowing infinite warnings like idiots

## Git Hook

```bash
# .husky/pre-commit
npm run commit-wizard || exit 1
```

**Note:** `.eslint-warnings-cache.json` must be committed to git. It's the graveyard of warnings you've given up on fixing.
