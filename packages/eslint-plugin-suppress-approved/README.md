# @vibelint/eslint-plugin-suppress-approved

ESLint plugin to suppress approved warnings.

## Install

```bash
npm install -D @vibelint/eslint-plugin-suppress-approved
```

## Flat Config

```js
import suppressApprovedPlugin from "@vibelint/eslint-plugin-suppress-approved"

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
  "plugins": ["@vibelint/suppress-approved"],
  "overrides": [
    { "files": ["*.js"], "processor": "@vibelint/suppress-approved/js" },
    { "files": ["*.ts"], "processor": "@vibelint/suppress-approved/ts" },
    { "files": ["*.jsx"], "processor": "@vibelint/suppress-approved/jsx" },
    { "files": ["*.tsx"], "processor": "@vibelint/suppress-approved/tsx" }
  ]
}
```

**Note:** Reads from `.eslint-warnings-cache.json` (created by `@vibelint/eslint-warning-approval`).
