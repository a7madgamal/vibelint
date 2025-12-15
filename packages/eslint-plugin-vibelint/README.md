# @vibelint/eslint-plugin-vibelint

ESLint plugin to suppress approved warnings.

## Install

```bash
npm install -D @vibelint/eslint-plugin-vibelint
```

## Flat Config

```js
import suppressApprovedPlugin from "@vibelint/eslint-plugin-vibelint"

export default [
  {
    files: ["**/*.{js,ts,jsx,tsx}"],
    plugins: { "suppress-approved": suppressApprovedPlugin },
    processor: "suppress-approved/js" // or /ts, /jsx, /tsx
  }
]
```

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
