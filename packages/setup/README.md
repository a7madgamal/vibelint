# lintmyvibe

Setup CLI for VibeLint packages - an interactive tool to install and configure VibeLint tools in your project, because manual setup is apparently too hard.

This tool holds your hand through the entire setup process, because apparently reading documentation and copying configs is too much work.

## Usage

```bash
npx lintmyvibe
```

This will guide you through an interactive setup process to:

- Install `@vibelint/vibelint-commit` for AI-powered commit message generation, because your commit messages are garbage
- Install `@vibelint/vibelint-wizard` for managing ESLint warnings, where you decide which warnings to ignore forever
- Install `@vibelint/eslint-plugin-vibelint` ESLint plugin, optional but recommended if you want to suppress approved warnings
- Add convenient npm scripts to your `package.json`, because typing commands is hard

## Features

- 🔍 Auto-detects your package manager, because we're smart like that
- 🎯 Auto-detects your ESLint configuration format, because reading your config is fun
- 📦 Always installs the latest versions of packages, because who wants old code
- 🎨 Interactive prompts for easy configuration, because we're helpful, not judgmental... okay, maybe a little judgmental
- ✅ Automatically adds scripts to `package.json`, because manual editing is for peasants

## What it installs

Depending on your selection, because we let you choose, how nice:

- **@vibelint/vibelint-commit**: AI-powered commit message generation, because "fix stuff" isn't a good commit message
- **@vibelint/vibelint-wizard**: Interactive wizard to manage ESLint warnings, the graveyard of warnings you've given up on
- **@vibelint/eslint-plugin-vibelint**: ESLint plugin to suppress approved warnings, because you've officially given up on fixing them

## Scripts added to package.json

- `commit`: Runs the commit message generator, requires Ollama which you probably don't have running
- `commit-wizard`: Runs the ESLint warning approval wizard, or just approve them all like a coward

## Requirements

- Node.js >= 18, because we're not supporting ancient versions, get with the times
- A `package.json` file in your project, and if you don't have one, you're in the wrong place

## Contributing

See [CHANGELOG.md](./CHANGELOG.md) for version history, because we keep track of things, unlike some people.

**⚠️ Important**: When making changes to this package, always update `CHANGELOG.md`! Or don't, and see what happens. I'm not your boss.

## License

MIT, because we're not monsters
