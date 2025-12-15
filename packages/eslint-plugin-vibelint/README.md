# @vibelint/eslint-plugin-vibelint

ESLint plugin to suppress approved warnings.

## Install

```bash
npm install -D @vibelint/eslint-plugin-vibelint
```

## Flat Config

```js
import vibelintPlugin from "@vibelint/eslint-plugin-vibelint"

export default [
  // ... your other configs
  ...vibelintPlugin.configs.recommended
]
```

The recommended config automatically handles `.js`, `.ts`, `.jsx`, and `.tsx` files with the appropriate processors.

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

**Note:** Reads from `.eslint-warnings-cache.json` (created by `@vibelint/vibelint-wizard`).
