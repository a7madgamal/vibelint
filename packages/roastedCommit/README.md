# @vibelint/roasted-commit

AI-powered commit message generator using Ollama, because writing good commit messages is apparently too hard.

This tool looks at your staged changes and generates a commit message for you. Because "fix stuff" and "update things" aren't exactly professional, are they?

## Install

```bash
npm install -D @vibelint/roasted-commit
```

Or use `lintmyvibe` if you want someone to hold your hand through the setup.

## Usage

```json
{
  "scripts": {
    "commit": "vibelint-roasted-commit"
  }
}
```

```bash
npm run commit
```

This will:

1. Check if you have staged changes, and tell you to stage something first if you haven't, genius
2. Connect to Ollama, if it's running, which it probably isn't
3. Generate a commit message based on your changes
4. Let you edit it if you want, because the AI isn't perfect, shockingly
5. Commit your changes with the generated message

## Requirements

- Ollama running locally, good luck with that
- Recommended model: `ollama pull deepseek-v3.1:671b-cloud`, or use whatever model you have, we're not picky
- Staged git changes, because we can't commit nothing, obviously

## Config

- `VIBELINT_OLLAMA_URL` - Ollama URL, defaults to `http://127.0.0.1:11434` which is probably wrong if you're using Docker or something
- Will automatically use `deepseek-v3.1:671b-cloud` if installed, because it's the best one, obviously
- Otherwise, prompts to install it or select from available models, because we're helpful like that
- Config and cache stored in `node_modules/.cache/vibelint/`, automatically gitignored because we're not monsters
