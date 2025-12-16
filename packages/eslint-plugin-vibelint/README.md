# @vibelint/eslint-plugin-vibelint

ESLint plugin to suppress approved warnings, because you've officially given up on fixing them.

This plugin reads from your `.eslint-warnings-cache.json` file, the graveyard of warnings you've approved, and suppresses those warnings so they don't clutter up your ESLint output. Because seeing the same warnings over and over is annoying, right?

## Install

```bash
npm install -D @vibelint/eslint-plugin-vibelint
```

Or use `lintmyvibe` if you want someone to do it for you.

## Flat Config

```js
import vibelintPlugin from "@vibelint/eslint-plugin-vibelint"

export default [
  // ... your other configs, the ones that actually matter
  ...vibelintPlugin.configs.recommended
]
```

The recommended config automatically handles `.js`, `.ts`, `.jsx`, and `.tsx` files with the appropriate processors, because we're helpful like that.

## Legacy Config

```json
{
  "plugins": ["@vibelint/vibelint"],
  "overrides": [
    { "files": ["*.js"], "processor": "@vibelint/vibelint/js" },
    { "files": ["*.ts"], "processor": "@vibelint/vibelint/ts" },
    { "files": ["*.jsx"], "processor": "@vibelint/vibelint/jsx" },
    { "files": ["*.tsx"], "processor": "@vibelint/vibelint/tsx" }
  ]
}
```

**Note:** Reads from `.eslint-warnings-cache.json`, created by `@vibelint/vibelint-wizard`, the tool where you decide which warnings to ignore forever.
