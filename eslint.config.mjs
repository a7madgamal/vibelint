// @ts-check
import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import promisePlugin from "eslint-plugin-promise";
import commentsPlugin from "eslint-plugin-eslint-comments";

/**
 * ESLint v9 Flat Config for VibeLint Monorepo
 *
 * Philosophy:
 * - Strict TypeScript with no type assertions (assertionStyle: "never")
 * - Heavy promise enforcement - fail fast, no random fallbacks
 * - Node.js CLI tools - allow console.log for output but enforce quality
 */

// ============================================================================
// 1. Global Ignores (applies to ALL files)
// ============================================================================
const globalIgnores = {
  ignores: [
    "**/node_modules/**",
    "**/dist/**",
    "**/build/**",
    "**/coverage/**",
    "**/*.min.js",
    "**/*.d.ts",
    "**/pnpm-lock.yaml",
  ],
};

// ============================================================================
// 2. Base Config (applies to ALL .js/.ts files)
// ============================================================================
const baseConfig = {
  files: ["**/*.js", "**/*.ts"],
  languageOptions: {
    parser: tseslint.parser,
    parserOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
    },
    globals: {
      // Node.js globals
      console: "readonly",
      process: "readonly",
      Buffer: "readonly",
      __dirname: "readonly",
      __filename: "readonly",
      global: "readonly",
      module: "readonly",
      require: "readonly",
      exports: "readonly",
    },
  },
  plugins: {
    "@typescript-eslint": tseslint.plugin,
    promise: promisePlugin,
    "eslint-comments": commentsPlugin,
  },
  rules: {
    // ========================================================================
    // Core ESLint Rules
    // ========================================================================
    "prefer-const": "error",
    "no-var": "error",
    "no-console": "off", // CLI tools need console output

    // ========================================================================
    // TypeScript Rules - STRICT
    // ========================================================================
    "@typescript-eslint/no-unused-vars": [
      "error",
      {
        argsIgnorePattern: "^_",
        varsIgnorePattern: "^_",
        caughtErrorsIgnorePattern: "^_",
      },
    ],
    "@typescript-eslint/no-explicit-any": "warn",
    "@typescript-eslint/consistent-type-assertions": [
      "error",
      {
        assertionStyle: "never", // NO TYPE ASSERTIONS - fail hard and fast
      },
    ],
    "@typescript-eslint/no-non-null-assertion": "error",

    // ========================================================================
    // Promise Rules - STRICT (fail hard and fast, no random fallbacks)
    // ========================================================================
    "promise/always-return": "error",
    "promise/catch-or-return": "error",
    "promise/param-names": "error",
    "promise/no-return-wrap": "error",
    "promise/no-nesting": "warn",
    "promise/no-promise-in-callback": "warn",
    "promise/no-callback-in-promise": "warn",
    "promise/no-new-statics": "error",
    "promise/valid-params": "error",
    "promise/prefer-await-to-then": "warn",

    // ========================================================================
    // ESLint Comments - Warn on ALL eslint-disable
    // ========================================================================
    "eslint-comments/require-description": [
      "warn",
      {
        ignore: [],
      },
    ],
    "eslint-comments/disable-enable-pair": [
      "error",
      {
        allowWholeFile: true,
      },
    ],
    "eslint-comments/no-unused-disable": "error",
    "eslint-comments/no-unused-enable": "error",
  },
};

// ============================================================================
// 3. Strict TypeScript Config for Node.js packages
// ============================================================================
const nodeStrictConfig = {
  files: ["packages/*/src/**/*.ts", "packages/*/src/**/*.js"],
  rules: {
    // Allow require() for legitimate Node.js use cases
    "@typescript-eslint/no-require-imports": "warn",
    "@typescript-eslint/no-dynamic-delete": "warn",

    // Keep strict promise rules
    "promise/always-return": "error",
    "promise/catch-or-return": "error",
  },
};

// ============================================================================
// 4. Test Files Config (if you add tests later)
// ============================================================================
const testConfig = {
  files: [
    "**/*.test.ts",
    "**/*.test.js",
    "**/tests/**/*.ts",
    "**/tests/**/*.js",
  ],
  languageOptions: {
    globals: {
      describe: "readonly",
      it: "readonly",
      test: "readonly",
      expect: "readonly",
      beforeEach: "readonly",
      afterEach: "readonly",
      beforeAll: "readonly",
      afterAll: "readonly",
      vi: "readonly",
      jest: "readonly",
    },
  },
  rules: {
    // Allow console.log in tests
    "no-console": "off",
    // Tests might use any for mocking
    "@typescript-eslint/no-explicit-any": "off",
  },
};

// ============================================================================
// 5. Build/Config Files - Relaxed Rules
// ============================================================================
const configFilesConfig = {
  files: [
    "*.config.js",
    "*.config.mjs",
    "*.config.ts",
    "scripts/**/*.js",
    "scripts/**/*.ts",
  ],
  rules: {
    "no-console": "off",
    "@typescript-eslint/no-require-imports": "off",
  },
};

// ============================================================================
// Export Configuration Array (order matters - later configs override earlier)
// ============================================================================
export default [
  globalIgnores,
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  ...tseslint.configs.strict, // Strict TypeScript for all TS files
  baseConfig,
  nodeStrictConfig,
  testConfig,
  configFilesConfig,
];
