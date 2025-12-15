# lintmyvibe

Setup CLI for VibeLint packages - an interactive tool to install and configure VibeLint tools in your project.

## Usage

```bash
npx lintmyvibe
```

This will guide you through an interactive setup process to:

- Install `@vibelint/vibelint-commit` for AI-powered commit message generation
- Install `@vibelint/vibelint-wizard` for managing ESLint warnings
- Install `@vibelint/eslint-plugin-vibelint` ESLint plugin (optional)
- Add convenient npm scripts to your `package.json`

## Features

- 🔍 Auto-detects your package manager (npm, pnpm, or yarn)
- 🎯 Auto-detects your ESLint configuration format (flat or legacy)
- 📦 Always installs the latest versions of packages
- 🎨 Interactive prompts for easy configuration
- ✅ Automatically adds scripts to `package.json`

## What it installs

Depending on your selection:

- **@vibelint/vibelint-commit**: AI-powered commit message generation
- **@vibelint/vibelint-wizard**: Interactive wizard to manage ESLint warnings
- **@vibelint/eslint-plugin-vibelint**: ESLint plugin to suppress approved warnings

## Scripts added to package.json

- `commit`: Runs the commit message generator
- `commit-wizard`: Runs the ESLint warning approval wizard

## Requirements

- Node.js >= 18
- A `package.json` file in your project

## Contributing

See [CHANGELOG.md](./CHANGELOG.md) for version history.

**⚠️ Important**: When making changes to this package, always update `CHANGELOG.md`!

## License

MIT
