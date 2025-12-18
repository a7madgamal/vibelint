# ratemyshit

Rate your frontend project and get sarcastic feedback with AI fix prompts. Because apparently writing good code is too much to ask.

## Installation

```bash
npm install -g ratemyshit
# or
npx ratemyshit
```

## Usage

Run in your project directory:

```bash
npx ratemyshit
```

The tool will analyze your project and provide:

- Section-by-section scores
- Detailed findings with sarcastic commentary
- Total project score
- AI fix prompt (automatically copied to clipboard)
- Social media shareable message

## What It Checks

- **Git Setup** - Version control initialization and .gitignore
- **TypeScript Configuration** - TypeScript usage and strict mode settings
- **Framework Detection** - React, Next.js, Angular, Vue, Svelte, or vanilla
- **Package Manager** - npm, pnpm, or yarn detection
- **ESLint Configuration** - ESLint setup and rule configuration
- **Build Tool** - Vite, Webpack, Rollup, etc.
- **Testing Setup** - Testing frameworks and test files

## Example Output

```
╔══════════════════════════════════════════════════════════════╗
║           🎯 RATE MY SHIT - Project Analysis Report          ║
╚══════════════════════════════════════════════════════════════╝

🔍 Framework: Next.js 14
📅 Analyzed: 2024-01-15 10:30:00

┌─────────────────────────────────────────────────────────────┐
│ Git Setup                                                    │
│ Score: 100/100 ✅                                            │
│                                                               │
│ ✓ Git is initialized (good job, you can use version control)│
│ ✓ .gitignore exists (you're not a complete monster)        │
└─────────────────────────────────────────────────────────────┘

...

╔══════════════════════════════════════════════════════════════╗
║                    TOTAL SCORE: 67/100                        ║
║                                                               ║
║  "Yikes. This is... something. (At least it's not on fire?)" ║
╚══════════════════════════════════════════════════════════════╝

📋 AI Fix Prompt copied to clipboard!

┌─────────────────────────────────────────────────────────────┐
│ 📱 Share Your Score (Copy & Paste)                          │
└─────────────────────────────────────────────────────────────┘

Just got my code rated: 67/100 🎯 Well, it compiles. That's
something, right? Run npx ratemyshit in your projects to find out, if you dare #ratemyshit
```

## Features

- **Plugin-based Architecture** - Extensible system for adding new checks
- **Cross-Platform** - Works on Windows, macOS, and Linux
- **Sarcastic Commentary** - The lower your score, the worse the tone (but still funny)
- **AI Fix Prompts** - Automatically generates and copies fix instructions to clipboard
- **Social Media Ready** - Share your score with a sarcastic message

## Requirements

- Node.js 18+
- A frontend project directory

## License

MIT
